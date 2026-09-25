import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';

export class CourtController {
  static async getCourtTypes(req: Request, res: Response, next: NextFunction) {
    try {
      const types = await prisma.courtTypes.findMany({
        where: req.admin?.facilityId ? { facilityId: req.admin.facilityId } : {},
        include: {
          courts: { where: { isActive: true } },
          pricing: { where: { isActive: true } }
        },
        orderBy: { name: 'asc' }
      });
      res.json(types);
    } catch (err) {
      next(err);
    }
  }

  static async getCourts(req: Request, res: Response, next: NextFunction) {
    try {
      const courts = await prisma.courts.findMany({
        where: {
          isActive: true,
          ...(req.admin?.facilityId ? { facilityId: req.admin.facilityId } : {})
        },
        include: {
          courtType: true
        },
        orderBy: [{ courtTypeId: 'asc' }, { courtNumber: 'asc' }]
      });
      res.json(courts);
    } catch (err) {
      next(err);
    }
  }

  static async getPricing(req: Request, res: Response, next: NextFunction) {
    try {
      const pricing = await prisma.pricing.findMany({
        where: {
          isActive: true,
          ...(req.admin?.facilityId ? { facilityId: req.admin.facilityId } : {})
        },
        include: {
          courtType: true
        }
      });
      res.json(pricing);
    } catch (err) {
      next(err);
    }
  }
}
