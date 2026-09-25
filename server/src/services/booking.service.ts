import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';

export interface LockSlotInput {
  courtId: string;
  bookingDate: string; // 'YYYY-MM-DD'
  startTime: string;   // '18:00'
  endTime: string;     // '19:00'
  adminId: string;
  facilityId?: string | null;
}

export interface ConfirmBookingInput {
  bookingId: string;
  expectedVersion: number;
  adminId: string;
  contactName: string;
  contactPhone: string;
  contactEmail?: string;
  amountDue: number;
  paymentMade: boolean;
  paymentMethod?: string;
  notes?: string;
}

export class BookingService {
  /**
   * Cleans up stale expired locks
   */
  static async cleanupExpiredLocks(): Promise<number> {
    const now = new Date();
    const result = await prisma.bookings.deleteMany({
      where: {
        statusId: 5, // UNDER_BOOKING
        lockExpiresAt: { lte: now }
      }
    });
    return result.count;
  }

  /**
   * Get court grid availability for a given date
   */
  static async getAvailability(params: { courtTypeId?: string; date: string; facilityId?: string | null }) {
    await this.cleanupExpiredLocks();

    const targetDate = parseISO(params.date);
    const dayStart = startOfDay(targetDate);
    const dayEnd = endOfDay(targetDate);
    const dayOfWeek = targetDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday

    // 1. Fetch Courts
    const courts = await prisma.courts.findMany({
      where: {
        isActive: true,
        ...(params.courtTypeId ? { courtTypeId: params.courtTypeId } : {}),
        ...(params.facilityId ? { facilityId: params.facilityId } : {})
      },
      include: {
        courtType: true
      },
      orderBy: [{ courtTypeId: 'asc' }, { courtNumber: 'asc' }]
    });

    // 2. Fetch Active Bookings and Locks for Date
    const activeBookings = await prisma.bookings.findMany({
      where: {
        courtId: { in: courts.map((c) => c.id) },
        bookingDate: {
          gte: dayStart,
          lte: dayEnd
        },
        statusId: { in: [2, 5] } // CONFIRMED or UNDER_BOOKING
      },
      include: {
        createdByAdmin: {
          select: { id: true, fullName: true, email: true }
        }
      }
    });

    // 3. Generate Time Slots (Weekdays: 16:00-23:00, Weekends: 08:00-23:00)
    const startHour = isWeekend ? 8 : 16;
    const endHour = 23;
    const timeSlots: { startTime: string; endTime: string; label: string }[] = [];

    for (let h = startHour; h < endHour; h++) {
      const s = `${String(h).padStart(2, '0')}:00`;
      const e = `${String(h + 1).padStart(2, '0')}:00`;
      timeSlots.push({ startTime: s, endTime: e, label: `${s} - ${e}` });
    }

    // 4. Map Court Matrix
    const matrix = courts.map((court) => {
      const slots = timeSlots.map((slot) => {
        const booking = activeBookings.find(
          (b) =>
            b.courtId === court.id &&
            b.startTime === slot.startTime &&
            b.endTime === slot.endTime
        );

        let status: 'AVAILABLE' | 'LOCKED' | 'CONFIRMED' = 'AVAILABLE';
        let lockInfo = null;
        let bookingInfo = null;

        if (booking) {
          if (booking.statusId === 2) {
            status = 'CONFIRMED';
            bookingInfo = {
              bookingId: booking.id,
              contactName: booking.contactName,
              paymentMade: booking.paymentMade,
              amountDue: Number(booking.amountDue),
              bookingType: booking.bookingType
            };
          } else if (booking.statusId === 5) {
            status = 'LOCKED';
            const remainingMs = booking.lockExpiresAt ? booking.lockExpiresAt.getTime() - Date.now() : 0;
            lockInfo = {
              bookingId: booking.id,
              lockedByAdminId: booking.lockedByAdminId,
              lockedByAdminName: booking.createdByAdmin?.fullName || 'Admin',
              expiresAt: booking.lockExpiresAt,
              remainingSeconds: Math.max(0, Math.floor(remainingMs / 1000)),
              version: booking.version
            };
          }
        }

        return {
          ...slot,
          status,
          lockInfo,
          bookingInfo
        };
      });

      return {
        courtId: court.id,
        courtNumber: court.courtNumber,
        courtName: court.name,
        courtType: court.courtType.name,
        courtTypeSlug: court.courtType.slug,
        slots
      };
    });

    return {
      date: params.date,
      isWeekend,
      totalCourts: courts.length,
      courts: matrix
    };
  }

  /**
   * Acquire a 5-minute atomic lock on a slot
   */
  static async acquireSlotLock(input: LockSlotInput) {
    const lockDurationMs = env.SLOT_LOCK_TIMEOUT_SECONDS * 1000;
    const now = new Date();
    const lockExpiresAt = new Date(now.getTime() + lockDurationMs);
    const parsedDate = parseISO(input.bookingDate);

    return await prisma.$transaction(async (tx) => {
      // Check for active conflicts
      const existing = await tx.bookings.findFirst({
        where: {
          courtId: input.courtId,
          bookingDate: parsedDate,
          startTime: input.startTime,
          endTime: input.endTime,
          OR: [
            { statusId: 2 }, // CONFIRMED
            {
              statusId: 5, // Active lock by someone else
              lockExpiresAt: { gt: now },
              lockedByAdminId: { not: input.adminId }
            }
          ]
        },
        include: {
          createdByAdmin: { select: { fullName: true } }
        }
      });

      if (existing) {
        if (existing.statusId === 2) {
          throw { status: 409, message: 'Slot has already been booked and confirmed by another user' };
        }
        throw {
          status: 409,
          message: `Slot is temporarily held by ${existing.createdByAdmin?.fullName || 'another admin'}. Please wait or choose another slot.`
        };
      }

      // Clean up stale or own expired lock
      await tx.bookings.deleteMany({
        where: {
          courtId: input.courtId,
          bookingDate: parsedDate,
          startTime: input.startTime,
          endTime: input.endTime,
          statusId: 5
        }
      });

      // Create new lock
      const lockBooking = await tx.bookings.create({
        data: {
          facilityId: input.facilityId,
          courtId: input.courtId,
          bookingDate: parsedDate,
          startTime: input.startTime,
          endTime: input.endTime,
          bookingType: 'one_time',
          statusId: 5, // UNDER_BOOKING
          version: 1,
          lockedByAdminId: input.adminId,
          lockExpiresAt,
          createdByAdminId: input.adminId,
          contactName: 'HOLD',
          contactPhone: 'HOLD',
          amountDue: 0
        }
      });

      await tx.bookingLocks.create({
        data: {
          bookingId: lockBooking.id,
          adminId: input.adminId,
          action: 'locked'
        }
      });

      return {
        bookingId: lockBooking.id,
        version: lockBooking.version,
        lockExpiresAt,
        expiresInSeconds: env.SLOT_LOCK_TIMEOUT_SECONDS
      };
    });
  }

  /**
   * Release slot lock when admin closes modal or cancels
   */
  static async releaseSlotLock(bookingId: string, adminId: string) {
    const booking = await prisma.bookings.findUnique({ where: { id: bookingId } });
    if (!booking || booking.statusId !== 5) return;

    if (booking.lockedByAdminId === adminId) {
      await prisma.bookings.delete({ where: { id: bookingId } });
    }
  }

  /**
   * Confirm booking with optimistic version verification
   */
  static async confirmBooking(input: ConfirmBookingInput) {
    const now = new Date();

    return await prisma.$transaction(async (tx) => {
      const booking = await tx.bookings.findUnique({
        where: { id: input.bookingId }
      });

      if (!booking) {
        throw { status: 404, message: 'Booking reservation not found' };
      }

      if (booking.lockedByAdminId !== input.adminId) {
        throw { status: 403, message: 'You do not own the lock on this slot' };
      }

      if (!booking.lockExpiresAt || booking.lockExpiresAt < now) {
        await tx.bookings.delete({ where: { id: input.bookingId } });
        throw { status: 410, message: 'Reservation lock has expired. Please reselect the slot.' };
      }

      if (booking.version !== input.expectedVersion) {
        throw { status: 409, message: 'Booking was modified concurrently. Please refresh.' };
      }

      // Upgrade to CONFIRMED
      const confirmed = await tx.bookings.update({
        where: {
          id: input.bookingId,
          version: input.expectedVersion
        },
        data: {
          statusId: 2, // CONFIRMED
          contactName: input.contactName,
          contactPhone: input.contactPhone,
          contactEmail: input.contactEmail,
          amountDue: input.amountDue,
          paymentMade: input.paymentMade,
          paymentMethod: input.paymentMethod,
          paymentDate: input.paymentMade ? now : null,
          notes: input.notes,
          lockedByAdminId: null,
          lockExpiresAt: null,
          version: { increment: 1 }
        },
        include: {
          court: { include: { courtType: true } }
        }
      });

      // Audit Log
      await tx.bookingAuditLog.create({
        data: {
          bookingId: confirmed.id,
          adminId: input.adminId,
          action: 'confirmed',
          newValues: confirmed as any
        }
      });

      return confirmed;
    });
  }

  /**
   * Cancel booking with refund calculation
   */
  static async cancelBooking(params: { bookingId: string; adminId: string; reason?: string }) {
    const booking = await prisma.bookings.findUnique({
      where: { id: params.bookingId }
    });

    if (!booking) throw { status: 404, message: 'Booking not found' };

    // Calculate hours until booking starts
    let hoursUntilStart = 48;
    if (booking.bookingDate && booking.startTime) {
      const [h, m] = booking.startTime.split(':').map(Number);
      const bookingDateTime = new Date(booking.bookingDate);
      bookingDateTime.setHours(h, m, 0, 0);
      hoursUntilStart = (bookingDateTime.getTime() - Date.now()) / (1000 * 60 * 60);
    }

    let refundAmount = Number(booking.amountDue);
    if (hoursUntilStart < 24) {
      refundAmount = 0; // Less than 24h: 0% refund
    } else if (hoursUntilStart < 48) {
      refundAmount = Number(booking.amountDue) * 0.5; // 24-48h: 50% refund
    }

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.bookings.update({
        where: { id: params.bookingId },
        data: {
          statusId: 3, // CANCELLED
          version: { increment: 1 }
        }
      });

      await tx.cancellations.create({
        data: {
          bookingId: params.bookingId,
          cancelledByAdminId: params.adminId,
          cancellationReason: params.reason || 'Customer requested cancellation',
          refundAmount,
          refundProcessed: false
        }
      });

      await tx.bookingAuditLog.create({
        data: {
          bookingId: params.bookingId,
          adminId: params.adminId,
          action: 'cancelled',
          oldValues: booking as any,
          newValues: updated as any
        }
      });

      return {
        bookingId: params.bookingId,
        status: 'CANCELLED',
        refundAmount,
        message: `Booking cancelled. Eligible refund: AED ${refundAmount}`
      };
    });
  }
}
