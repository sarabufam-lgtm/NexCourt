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

    // Query all existing bookings for this court and time slot in the range
    const existing = await prisma.bookings.findMany({
      where: {
        courtId: input.courtId,
        bookingDate: { gte: start, lte: end },
        startTime: input.startTime,
        endTime: input.endTime,
        statusId: { in: [2, 5] } // CONFIRMED or UNDER_BOOKING
      },
      select: {
        id: true,
        bookingDate: true,
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
      // 1. Create Parent Long-Term Contract
      const parent = await tx.bookings.create({
        data: {
          facilityId: input.facilityId,
          courtId: input.courtId,
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
      const childData = datesToBook.map((dateStr) => ({
        facilityId: input.facilityId,
        courtId: input.courtId,
        parentBookingId: parent.id,
        bookingType: 'one_time',
        statusId: 2, // CONFIRMED
        contactName: input.contactName,
        contactPhone: input.contactPhone,
        contactEmail: input.contactEmail,
        bookingDate: parseISO(dateStr),
        startTime: input.startTime,
        endTime: input.endTime,
        amountDue: input.ratePerSession,
        paymentMade: input.paymentMade,
        paymentMethod: input.paymentMethod,
        createdByAdminId: input.adminId
      }));

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
}
