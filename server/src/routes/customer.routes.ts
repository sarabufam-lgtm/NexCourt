import { Router } from 'express';
import { CustomerController } from '../controllers/customer.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/', authenticate, CustomerController.search);
router.post('/', authenticate, CustomerController.upsert);
router.get('/:id', authenticate, CustomerController.getById);
router.put('/:id', authenticate, CustomerController.update);

export default router;
