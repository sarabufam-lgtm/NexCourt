import { Router } from 'express';
import authRoutes from './auth.routes.js';
import bookingRoutes from './booking.routes.js';
import courtRoutes from './court.routes.js';
import customerRoutes from './customer.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/bookings', bookingRoutes);
router.use('/courts', courtRoutes);
router.use('/customers', customerRoutes);

// Health check endpoint for cloud monitoring & load balancers
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'NexCourt API'
  });
});

export default router;
