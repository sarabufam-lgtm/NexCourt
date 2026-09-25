import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';

export interface LoginParams {
  email: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}

export class AuthService {
  private static rolePermissions: Record<string, string[]> = {
    super_admin: ['*'],
    booking_admin: ['bookings:create', 'bookings:read', 'bookings:update', 'bookings:cancel'],
    finance_admin: ['payments:read', 'payments:update', 'financial:read'],
    view_only: ['bookings:read', 'financial:read']
  };

  static async hashPassword(password: string): Promise<string> {
    const salt = await bcryptjs.genSalt(12);
    return bcryptjs.hash(password, salt);
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcryptjs.compare(password, hash);
  }

  static getPermissions(role: string): string[] {
    return this.rolePermissions[role] || [];
  }

  static generateAccessToken(admin: { id: string; email: string; role: string; facilityId?: string | null }, sessionId: string): string {
    const permissions = this.getPermissions(admin.role);
    return jwt.sign(
      {
        sub: admin.id,
        email: admin.email,
        role: admin.role,
        facilityId: admin.facilityId,
        permissions,
        sessionId
      },
      env.JWT_SECRET,
      { expiresIn: '15m' }
    );
  }

  static async login(params: LoginParams) {
    const admin = await prisma.admins.findUnique({
      where: { email: params.email.toLowerCase() },
      include: { facility: true }
    });

    if (!admin || !admin.isActive) {
      await prisma.loginAuditLog.create({
        data: {
          email: params.email,
          success: false,
          ipAddress: params.ipAddress,
          deviceInfo: { userAgent: params.userAgent }
        }
      });
      throw { status: 401, message: 'Invalid email or password' };
    }

    const isValid = await this.verifyPassword(params.password, admin.passwordHash);
    if (!isValid) {
      await prisma.loginAuditLog.create({
        data: {
          adminId: admin.id,
          email: params.email,
          success: false,
          ipAddress: params.ipAddress,
          deviceInfo: { userAgent: params.userAgent }
        }
      });
      throw { status: 401, message: 'Invalid email or password' };
    }

    // Generate random refresh token & session ID
    const sessionId = crypto.randomUUID();
    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const refreshTokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await prisma.sessions.create({
      data: {
        id: sessionId,
        adminId: admin.id,
        refreshTokenHash,
        expiresAt,
        deviceInfo: { userAgent: params.userAgent, ip: params.ipAddress }
      }
    });

    // Update last login
    await prisma.admins.update({
      where: { id: admin.id },
      data: { lastLogin: new Date() }
    });

    await prisma.loginAuditLog.create({
      data: {
        adminId: admin.id,
        email: admin.email,
        success: true,
        ipAddress: params.ipAddress,
        deviceInfo: { userAgent: params.userAgent }
      }
    });

    const accessToken = this.generateAccessToken(admin, sessionId);
    const refreshTokenPayload = jwt.sign(
      { sub: admin.id, sessionId, token: rawRefreshToken },
      env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    return {
      accessToken,
      refreshToken: refreshTokenPayload,
      admin: {
        id: admin.id,
        email: admin.email,
        fullName: admin.fullName,
        role: admin.role,
        facilityId: admin.facilityId,
        facilityName: admin.facility?.name
      }
    };
  }

  static async refreshToken(refreshTokenJwt: string) {
    try {
      const decoded = jwt.verify(refreshTokenJwt, env.JWT_REFRESH_SECRET) as any;
      const { sessionId, token: rawRefreshToken, sub: adminId } = decoded;

      const session = await prisma.sessions.findUnique({
        where: { id: sessionId },
        include: { admin: true }
      });

      if (!session || !session.isActive || session.expiresAt < new Date()) {
        throw { status: 401, message: 'Session expired or invalidated' };
      }

      // Check refresh token hash
      const providedHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
      if (providedHash !== session.refreshTokenHash) {
        // REPLAY ATTACK DETECTED! Invalidate all sessions for this admin!
        await prisma.sessions.updateMany({
          where: { adminId },
          data: { isActive: false }
        });
        throw { status: 401, message: 'Security alert: Refresh token replay detected. All sessions revoked.' };
      }

      // Rotate Refresh Token
      const newRawRefreshToken = crypto.randomBytes(40).toString('hex');
      const newRefreshTokenHash = crypto.createHash('sha256').update(newRawRefreshToken).digest('hex');

      await prisma.sessions.update({
        where: { id: sessionId },
        data: {
          refreshTokenHash: newRefreshTokenHash,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });

      const newAccessToken = this.generateAccessToken(session.admin, sessionId);
      const newRefreshTokenPayload = jwt.sign(
        { sub: session.admin.id, sessionId, token: newRawRefreshToken },
        env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      );

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshTokenPayload
      };
    } catch (err: any) {
      throw { status: 401, message: err.message || 'Invalid refresh token' };
    }
  }

  static async logout(sessionId: string) {
    await prisma.sessions.updateMany({
      where: { id: sessionId },
      data: { isActive: false }
    });
  }
}
