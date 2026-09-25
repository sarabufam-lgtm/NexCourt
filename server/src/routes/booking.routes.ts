import { Router } from 'express';
import { BookingController } from '../controllers/booking.controller.js';
import { authenticate, requirePermission } from '../middlewares/auth.middleware.js';

const router = Router();

// Availability is viewable by all authenticated admins
router.get('/availability', authenticate, BookingController.getAvailability);

// Concurrency Slot Lock & Release
router.post('/lock', authenticate, requirePermission('bookings:create'), BookingController.lockSlot);
router.post('/unlock/:id', authenticate, requirePermission('bookings:create'), BookingController.unlockSlot);

// Final Confirm & Cancel
router.put('/confirm/:id', authenticate, requirePermission('bookings:create'), BookingController.confirmBooking);
router.post('/cancel/:id', authenticate, requirePermission('bookings:cancel'), BookingController.cancelBooking);

// Recurring Series
router.post('/recurring/evaluate', authenticate, requirePermission('bookings:create'), BookingController.evaluateRecurring);
router.post('/recurring/create', authenticate, requirePermission('bookings:create'), BookingController.createRecurring);

export default router;
