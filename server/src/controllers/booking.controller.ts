import { Request, Response, NextFunction } from 'express';
import { BookingService } from '../services/booking.service.js';
import { RecurringBookingService } from '../services/recurring.service.js';
import { SocketManager } from '../sockets/socket.manager.js';

export class BookingController {
  static async getAvailability(req: Request, res: Response, next: NextFunction) {
    try {
      const { date, courtTypeId } = req.query;
      if (!date || typeof date !== 'string') {
        return res.status(400).json({ error: 'Date (YYYY-MM-DD) is required' });
      }

      const result = await BookingService.getAvailability({
        date,
        courtTypeId: typeof courtTypeId === 'string' ? courtTypeId : undefined,
        facilityId: req.admin?.facilityId
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async lockSlot(req: Request, res: Response, next: NextFunction) {
    try {
      const { courtId, bookingDate, startTime, endTime } = req.body;
      if (!courtId || !bookingDate || !startTime || !endTime) {
        return res.status(400).json({ error: 'Missing required lock fields' });
      }

      const adminId = req.admin!.id;
      const result = await BookingService.acquireSlotLock({
        courtId,
        bookingDate,
        startTime,
        endTime,
        adminId,
        facilityId: req.admin?.facilityId
      });

      // Broadcast live hold to other admins on this date
      SocketManager.broadcastSlotLocked(bookingDate, {
        courtId,
        startTime,
        endTime,
        bookingId: result.bookingId,
        lockedByAdminId: adminId,
        lockedByAdminName: req.admin?.email,
        expiresAt: result.lockExpiresAt,
        version: result.version
      });

      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async unlockSlot(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { courtId, bookingDate, startTime, endTime } = req.body;

      await BookingService.releaseSlotLock(id, req.admin!.id);

      if (bookingDate && courtId && startTime && endTime) {
        SocketManager.broadcastSlotUnlocked(bookingDate, {
          courtId,
          startTime,
          endTime
        });
      }

      res.json({ message: 'Slot unlocked successfully' });
    } catch (err) {
      next(err);
    }
  }

  static async confirmBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const {
        expectedVersion,
        contactName,
        contactPhone,
        contactEmail,
        amountDue,
        paymentMade,
        paymentMethod,
        notes,
        bookingDate,
        courtId,
        startTime,
        endTime
      } = req.body;

      if (!expectedVersion || !contactName || !contactPhone || amountDue === undefined) {
        return res.status(400).json({ error: 'Missing required booking confirmation fields' });
      }

      const confirmed = await BookingService.confirmBooking({
        bookingId: id,
        expectedVersion: Number(expectedVersion),
        adminId: req.admin!.id,
        contactName,
        contactPhone,
        contactEmail,
        amountDue: Number(amountDue),
        paymentMade: Boolean(paymentMade),
        paymentMethod,
        notes
      });

      // Broadcast confirmation
      if (bookingDate && courtId && startTime && endTime) {
        SocketManager.broadcastSlotConfirmed(bookingDate, {
          courtId,
          startTime,
          endTime,
          bookingId: confirmed.id,
          contactName: confirmed.contactName,
          confirmedBy: req.admin?.email || 'Admin'
        });
      }

      res.json(confirmed);
    } catch (err) {
      next(err);
    }
  }

  static async cancelBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { reason, bookingDate, courtId, startTime, endTime } = req.body;

      const result = await BookingService.cancelBooking({
        bookingId: id,
        adminId: req.admin!.id,
        reason
      });

      if (bookingDate && courtId && startTime && endTime) {
        SocketManager.broadcastSlotCancelled(bookingDate, {
          courtId,
          startTime,
          endTime,
          bookingId: id
        });
      }

      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async evaluateRecurring(req: Request, res: Response, next: NextFunction) {
    try {
      const { courtId, startDate, endDate, daysOfWeek, startTime, endTime, blackoutDates } = req.body;
      if (!courtId || !startDate || !endDate || !daysOfWeek || !startTime || !endTime) {
        return res.status(400).json({ error: 'Missing required recurrence fields' });
      }

      const result = await RecurringBookingService.evaluateConflicts({
        courtId,
        startDate,
        endDate,
        daysOfWeek,
        startTime,
        endTime,
        blackoutDates
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async createRecurring(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        courtId,
        daysOfWeek,
        startDate,
        endDate,
        startTime,
        endTime,
        blackoutDates,
        contactName,
        contactPhone,
        contactEmail,
        ratePerSession,
        paymentMade,
        paymentMethod,
        notes,
        datesToBook
      } = req.body;

      if (!datesToBook || !Array.isArray(datesToBook) || datesToBook.length === 0) {
        return res.status(400).json({ error: 'At least one date must be selected for booking' });
      }

      const result = await RecurringBookingService.createSeries(
        {
          courtId,
          facilityId: req.admin?.facilityId,
          adminId: req.admin!.id,
          daysOfWeek,
          startDate,
          endDate,
          startTime,
          endTime,
          blackoutDates,
          contactName,
          contactPhone,
          contactEmail,
          ratePerSession: Number(ratePerSession),
          paymentMade: Boolean(paymentMade),
          paymentMethod,
          notes
        },
        datesToBook
      );

      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async getRecurringSeries(req: Request, res: Response, next: NextFunction) {
    try {
      const series = await RecurringBookingService.getRecurringSeries(req.admin?.facilityId);
      res.json(series);
    } catch (err) {
      next(err);
    }
  }

  static async cancelRecurringSeries(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const result = await RecurringBookingService.cancelRecurringSeries({
        seriesId: id,
        adminId: req.admin!.id,
        reason
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async updateRecurringPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { paymentMade, paymentMethod, amountPaid, transactionId, notes } = req.body;

      if (!paymentMethod) {
        return res.status(400).json({ error: 'Payment method is required (e.g. cash, card, bank_transfer)' });
      }

      const result = await RecurringBookingService.updateRecurringPayment({
        seriesId: id,
        adminId: req.admin!.id,
        paymentMade: Boolean(paymentMade),
        paymentMethod,
        amountPaid: amountPaid ? Number(amountPaid) : undefined,
        transactionId,
        notes
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

