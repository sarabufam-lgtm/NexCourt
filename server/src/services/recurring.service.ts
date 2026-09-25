import { addDays, format, getDay, isBefore, parseISO } from 'date-fns';
import { prisma } from '../lib/prisma.js';

export interface RecurrenceInput {
  courtId: string;
  facilityId?: string | null;
  adminId: string;
  daysOfWeek: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  startDate: string;    // 'YYYY-MM-DD'
  endDate: string;      // 'YYYY-MM-DD'
  startTime: string;    // '18:00'
  endTime: string;      // '20:00'
  blackoutDates?: string[];
  contactName: string;
  contactPhone: string;
  contactEmail?: string;
  ratePerSession: number;
  paymentMade: boolean;
  paymentMethod?: string;
  notes?: string;
}

export class RecurringBookingService {
  /**
   * Pre-flight evaluation of all recurring sessions against existing bookings
   */
  static async evaluateConflicts(input: {
    courtId: string;
    startDate: string;
    endDate: string;
    daysOfWeek: number[];
    startTime: string;
    endTime: string;
    blackoutDates?: string[];
  }) {
    const start = parseISO(input.startDate);
    const end = parseISO(input.endDate);
    const requestedDates: string[] = [];

    let cursor = start;
    while (!isBefore(end, cursor)) {
      const day = getDay(cursor);
      const dateStr = format(cursor, 'yyyy-MM-dd');

      if (input.daysOfWeek.includes(day) && !input.blackoutDates?.includes(dateStr)) {
        requestedDates.push(dateStr);
      }
      cursor = addDays(cursor, 1);
    }

    // Query all existing bookings for this court and overlapping time slot in the range
    const existing = await prisma.bookings.findMany({
      where: {
        courtId: input.courtId,
        bookingDate: { gte: start, lte: end },
        startTime: { lt: input.endTime },
        endTime: { gt: input.startTime },
        statusId: { in: [2, 5] } // CONFIRMED or UNDER_BOOKING
      },
      select: {
        id: true,
        bookingDate: true,
        startTime: true,
        endTime: true,
        contactName: true,
        statusId: true
      }
    });

    const conflictMap = new Map<string, any>();
    for (const b of existing) {
      if (b.bookingDate) {
        const dStr = format(b.bookingDate, 'yyyy-MM-dd');
        conflictMap.set(dStr, b);
      }
    }

    const availableDates: string[] = [];
    const conflictedDates: any[] = [];

    for (const d of requestedDates) {
      if (conflictMap.has(d)) {
        const conf = conflictMap.get(d);
        conflictedDates.push({
          date: d,
          existingBookingId: conf.id,
          existingCustomerName: conf.contactName,
          status: conf.statusId === 2 ? 'CONFIRMED' : 'HELD'
        });
      } else {
        availableDates.push(d);
      }
    }

    return {
      totalRequestedSessions: requestedDates.length,
      cleanCount: availableDates.length,
      conflictCount: conflictedDates.length,
      isClean: conflictedDates.length === 0,
      availableDates,
      conflictedDates
    };
  }

  /**
   * Creates the parent long-term contract and all concrete child session records
   */
  static async createSeries(input: RecurrenceInput, datesToBook: string[]) {
    const totalAmount = datesToBook.length * input.ratePerSession;
    const start = parseISO(input.startDate);
    const end = parseISO(input.endDate);

    return await prisma.$transaction(async (tx) => {
      // Upsert Customer profile automatically
      let customerId: string | null = null;
      if (input.contactPhone && input.contactName) {
        const cleanPhone = input.contactPhone.trim();
        const cleanName = input.contactName.trim();
        const existingCust = await tx.customer.findFirst({
          where: {
            phone: cleanPhone,
            ...(input.facilityId ? { facilityId: input.facilityId } : {})
          }
        });

        if (existingCust) {
          const updatedCust = await tx.customer.update({
            where: { id: existingCust.id },
            data: {
              name: cleanName,
              email: input.contactEmail ? input.contactEmail.trim() : existingCust.email
            }
          });
          customerId = updatedCust.id;
        } else {
          const newCust = await tx.customer.create({
            data: {
              facilityId: input.facilityId,
              name: cleanName,
              phone: cleanPhone,
              email: input.contactEmail ? input.contactEmail.trim() : null
            }
          });
          customerId = newCust.id;
        }
      }

      // 1. Create Parent Long-Term Contract
      const parent = await tx.bookings.create({
        data: {
          facilityId: input.facilityId,
          courtId: input.courtId,
          customerId,
          bookingType: 'long_term',
          statusId: 2, // CONFIRMED
          contactName: input.contactName,
          contactPhone: input.contactPhone,
          contactEmail: input.contactEmail,
          longTermStartDate: start,
          longTermEndDate: end,
          recurringPattern: {
            daysOfWeek: input.daysOfWeek,
            startDate: input.startDate,
            endDate: input.endDate,
            startTime: input.startTime,
            endTime: input.endTime,
            blackoutDates: input.blackoutDates || []
          },
          amountDue: totalAmount,
          paymentMade: input.paymentMade,
          paymentMethod: input.paymentMethod,
          paymentDate: input.paymentMade ? new Date() : null,
          notes: input.notes,
          createdByAdminId: input.adminId
        }
      });

      // 2. Create Individual Child Instances
      const childData = datesToBook.map((dateStr) => {
        const [y, m, d] = dateStr.split('-').map(Number);
        const utcDate = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
        return {
          facilityId: input.facilityId,
          courtId: input.courtId,
          parentBookingId: parent.id,
          customerId,
          bookingType: 'one_time',
          statusId: 2, // CONFIRMED
          contactName: input.contactName,
          contactPhone: input.contactPhone,
          contactEmail: input.contactEmail,
          bookingDate: utcDate,
          startTime: input.startTime,
          endTime: input.endTime,
          amountDue: input.ratePerSession,
          paymentMade: input.paymentMade,
          paymentMethod: input.paymentMethod,
          createdByAdminId: input.adminId
        };
      });

      await tx.bookings.createMany({
        data: childData
      });

      return {
        seriesId: parent.id,
        totalSessionsCreated: childData.length,
        totalAmount,
        parent
      };
    });
  }

  /**
   * Retrieves all recurring series contracts with child instance summaries
   */
  static async getRecurringSeries(facilityId?: string | null) {
    const series = await prisma.bookings.findMany({
      where: {
        bookingType: 'long_term',
        ...(facilityId ? { facilityId } : {})
      },
      include: {
        court: {
          include: { courtType: true }
        },
        customer: true,
        createdByAdmin: {
          select: { id: true, fullName: true, email: true }
        },
        childInstances: {
          orderBy: { bookingDate: 'asc' },
          select: {
            id: true,
            bookingDate: true,
            startTime: true,
            endTime: true,
            statusId: true,
            amountDue: true,
            paymentMade: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return series.map((s) => {
      const totalSessions = s.childInstances.length;
      const confirmedSessions = s.childInstances.filter((c) => c.statusId === 2).length;
      const cancelledSessions = s.childInstances.filter((c) => c.statusId === 3).length;
      const pattern = s.recurringPattern as any;

      return {
        id: s.id,
        statusId: s.statusId,
        courtId: s.courtId,
        courtName: s.court.name,
        courtType: s.court.courtType.name,
        courtTypeSlug: s.court.courtType.slug,
        contactName: s.contactName,
        contactPhone: s.contactPhone,
        contactEmail: s.contactEmail,
        longTermStartDate: s.longTermStartDate ? format(s.longTermStartDate, 'yyyy-MM-dd') : pattern?.startDate || null,
        longTermEndDate: s.longTermEndDate ? format(s.longTermEndDate, 'yyyy-MM-dd') : pattern?.endDate || null,
        startTime: pattern?.startTime || null,
        endTime: pattern?.endTime || null,
        daysOfWeek: pattern?.daysOfWeek || [],
        amountDue: Number(s.amountDue),
        paymentMade: s.paymentMade,
        paymentMethod: s.paymentMethod,
        notes: s.notes,
        createdAt: s.createdAt,
        adminName: s.createdByAdmin?.fullName || 'Admin',
        totalSessions,
        confirmedSessions,
        cancelledSessions,
        childInstances: s.childInstances.map((c) => ({
          id: c.id,
          date: c.bookingDate ? format(c.bookingDate, 'yyyy-MM-dd') : null,
          startTime: c.startTime,
          endTime: c.endTime,
          statusId: c.statusId,
          amountDue: Number(c.amountDue),
          paymentMade: c.paymentMade
        }))
      };
    });
  }

  /**
   * Cancels a recurring series contract and all its future/unplayed child sessions
   */
  static async cancelRecurringSeries(params: { seriesId: string; adminId: string; reason?: string }) {
    return await prisma.$transaction(async (tx) => {
      const parent = await tx.bookings.findUnique({
        where: { id: params.seriesId, bookingType: 'long_term' },
        include: { childInstances: true }
      });

      if (!parent) {
        throw { status: 404, message: 'Recurring series contract not found' };
      }

      // 1. Cancel parent
      await tx.bookings.update({
        where: { id: params.seriesId },
        data: {
          statusId: 3, // CANCELLED
          version: { increment: 1 }
        }
      });

      // 2. Cancel all active child instances
      await tx.bookings.updateMany({
        where: {
          parentBookingId: params.seriesId,
          statusId: { in: [1, 2, 5] }
        },
        data: {
          statusId: 3 // CANCELLED
        }
      });

      // 3. Create cancellation record
      await tx.cancellations.create({
        data: {
          bookingId: params.seriesId,
          cancelledByAdminId: params.adminId,
          cancellationReason: params.reason || 'Recurring series cancellation',
          refundAmount: 0,
          refundProcessed: false
        }
      });

      // 4. Audit Log
      await tx.bookingAuditLog.create({
        data: {
          bookingId: params.seriesId,
          adminId: params.adminId,
          action: 'cancelled_series',
          newValues: { seriesId: params.seriesId, reason: params.reason } as any
        }
      });

      return {
        seriesId: params.seriesId,
        status: 'CANCELLED',
        cancelledSessionsCount: parent.childInstances.filter((c) => c.statusId === 2).length
      };
    });
  }

  /**
   * Updates payment details for a recurring series contract and all its child sessions
   */
  static async updateRecurringPayment(params: {
    seriesId: string;
    adminId: string;
    paymentMade: boolean;
    paymentMethod: string;
    amountPaid?: number;
    transactionId?: string;
    notes?: string;
  }) {
    return await prisma.$transaction(async (tx) => {
      const parent = await tx.bookings.findUnique({
        where: { id: params.seriesId, bookingType: 'long_term' },
        include: { childInstances: true }
      });

      if (!parent) {
        throw { status: 404, message: 'Recurring contract not found' };
      }

      const now = new Date();

      // 1. Update parent contract
      const updatedParent = await tx.bookings.update({
        where: { id: params.seriesId },
        data: {
          paymentMade: params.paymentMade,
          paymentMethod: params.paymentMethod,
          paymentDate: params.paymentMade ? now : null,
          transactionId: params.transactionId || null,
          notes: params.notes !== undefined ? params.notes : parent.notes,
          version: { increment: 1 }
        }
      });

      // 2. Cascade payment update to all active child instances
      await tx.bookings.updateMany({
        where: {
          parentBookingId: params.seriesId,
          statusId: 2 // CONFIRMED
        },
        data: {
          paymentMade: params.paymentMade,
          paymentMethod: params.paymentMethod,
          paymentDate: params.paymentMade ? now : null,
          transactionId: params.transactionId || null
        }
      });

      // 3. Create Audit Log
      await tx.bookingAuditLog.create({
        data: {
          bookingId: params.seriesId,
          adminId: params.adminId,
          action: 'payment_updated',
          oldValues: {
            paymentMade: parent.paymentMade,
            paymentMethod: parent.paymentMethod,
            amountDue: parent.amountDue
          } as any,
          newValues: {
            paymentMade: params.paymentMade,
            paymentMethod: params.paymentMethod,
            transactionId: params.transactionId
          } as any
        }
      });

      return updatedParent;
    });
  }
}


