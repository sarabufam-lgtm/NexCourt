import { Router } from 'express';
import { CourtController } from '../controllers/court.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/types', authenticate, CourtController.getCourtTypes);
router.get('/', authenticate, CourtController.getCourts);
router.get('/pricing', authenticate, CourtController.getPricing);

export default router;
