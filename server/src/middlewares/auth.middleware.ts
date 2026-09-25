import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';

export interface AdminPayload {
  id: string;
  email: string;
  role: string;
  sessionId: string;
  facilityId?: string | null;
  permissions: string[];
}

declare global {
  namespace Express {
    interface Request {
      admin?: AdminPayload;
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No authorization token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as any;

    // Check if session in DB is still active
    const session = await prisma.sessions.findUnique({
      where: { id: decoded.sessionId }
    });

    if (!session || !session.isActive || session.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Session expired or invalidated' });
    }

    req.admin = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      sessionId: decoded.sessionId,
      facilityId: decoded.facilityId,
      permissions: decoded.permissions || []
    };

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(403).json({ error: 'Invalid or forged token' });
  }
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.admin) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }

    if (req.admin.role === 'super_admin' || allowedRoles.includes(req.admin.role)) {
      return next();
    }

    return res.status(403).json({ error: 'Forbidden: Insufficient role permissions' });
  };
};

export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.admin) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }

    if (
      req.admin.role === 'super_admin' ||
      req.admin.permissions.includes('*') ||
      req.admin.permissions.includes(permission)
    ) {
      return next();
    }

    return res.status(403).json({ error: `Forbidden: Missing required permission ${permission}` });
  };
};
