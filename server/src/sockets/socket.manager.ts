import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export class SocketManager {
  private static io: Server | null = null;

  static initialize(httpServer: HttpServer): Server {
    this.io = new Server(httpServer, {
      cors: {
        origin: env.FRONTEND_URL,
        credentials: true
      },
      transports: ['websocket', 'polling'],
      pingInterval: 25000,
      pingTimeout: 20000
    });

    // JWT Handshake Authentication
    this.io.use((socket: Socket, next) => {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      try {
        const decoded = jwt.verify(token, env.JWT_SECRET) as any;
        socket.data.adminId = decoded.sub;
        socket.data.email = decoded.email;
        socket.data.role = decoded.role;
        next();
      } catch (err) {
        next(new Error('Invalid token'));
      }
    });

    this.io.on('connection', (socket: Socket) => {
      // Join date room for targeted broadcasting
      socket.on('join:date', (dateStr: string) => {
        // Leave any prior date room
        for (const room of socket.rooms) {
          if (room.startsWith('date:')) socket.leave(room);
        }
        socket.join(`date:${dateStr}`);
      });

      // Leave date room
      socket.on('leave:date', (dateStr: string) => {
        socket.leave(`date:${dateStr}`);
      });

      socket.on('disconnect', () => {
        // Cleanup handled automatically
      });
    });

    return this.io;
  }

  static getIO(): Server {
    if (!this.io) {
      throw new Error('SocketManager not initialized');
    }
    return this.io;
  }

  // Helper broadcast functions called by controllers/services
  static broadcastSlotLocked(date: string, payload: {
    courtId: string;
    startTime: string;
    endTime: string;
    bookingId: string;
    lockedByAdminId: string;
    lockedByAdminName?: string;
    expiresAt: Date;
    version: number;
  }) {
    if (!this.io) return;
    this.io.to(`date:${date}`).emit('booking:locked', payload);
  }

  static broadcastSlotUnlocked(date: string, payload: {
    courtId: string;
    startTime: string;
    endTime: string;
  }) {
    if (!this.io) return;
    this.io.to(`date:${date}`).emit('booking:unlocked', payload);
  }

  static broadcastSlotConfirmed(date: string, payload: {
    courtId: string;
    startTime: string;
    endTime: string;
    bookingId: string;
    contactName: string;
    confirmedBy: string;
  }) {
    if (!this.io) return;
    this.io.to(`date:${date}`).emit('booking:confirmed', payload);
  }

  static broadcastSlotCancelled(date: string, payload: {
    courtId: string;
    startTime: string;
    endTime: string;
    bookingId: string;
  }) {
    if (!this.io) return;
    this.io.to(`date:${date}`).emit('booking:cancelled', payload);
  }
}
