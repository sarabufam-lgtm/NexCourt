import { Request, Response, NextFunction } from 'express';
import { CustomerService } from '../services/customer.service.js';
import { SocketManager } from '../sockets/socket.manager.js';

export class CustomerController {
  static async search(req: Request, res: Response, next: NextFunction) {
    try {
      const query = typeof req.query.q === 'string' ? req.query.q : undefined;
      const limit = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : undefined;

      const customers = await CustomerService.searchCustomers({
        query,
        facilityId: req.admin?.facilityId,
        limit
      });

      res.json(customers);
    } catch (err) {
      next(err);
    }
  }

  static async upsert(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, phone, email, notes } = req.body;
      if (!name || !phone) {
        return res.status(400).json({ error: 'Customer name and phone number are required' });
      }

      const customer = await CustomerService.upsertCustomer({
        name,
        phone,
        email,
        notes,
        facilityId: req.admin?.facilityId
      });

      res.status(200).json(customer);
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { name, phone, email, notes } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'Customer name is required' });
      }

      const updated = await CustomerService.updateCustomer(
        id,
        { name, phone, email, notes },
        req.admin?.facilityId
      );

      SocketManager.broadcastCustomerUpdated({
        customerId: updated.id,
        name: updated.name,
        phone: updated.phone
      });

      res.json(updated);
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const customer = await CustomerService.getCustomerById(id);
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      res.json(customer);
    } catch (err) {
      next(err);
    }
  }
}
