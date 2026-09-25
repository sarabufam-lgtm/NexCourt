# NexCourt: Architecture & Critical Gaps Resolution Guide

**Project:** NexCourt — Court Booking Management System (PWA)  
**Location:** Al Nahda Boys School Sports Complex, UAE  
**Document Version:** 1.0  
**Date:** September 25, 2026  

---

## Executive Summary & System Objectives

NexCourt is a high-concurrency, mobile-first Progressive Web Application (PWA) tailored for sports facility managers and court administrators in the UAE. The system manages multi-sport court scheduling (Badminton, Basketball, Cricket, Pickleball), handling both walk-in single reservations and multi-month recurring academy bookings across multi-admin shifts.

This document delivers production-grade architectures and resolution specifications for the **5 Critical Technical Gaps**:
1. **Race Condition & Multi-Admin Concurrency Engine** (Optimistic locking + atomic 5-min holds)
2. **Enterprise Authentication, Security & RBAC** (Dual-token JWT, rotation, replay defense)
3. **Offline-First PWA & Conflict Resolution Strategy** (IndexedDB, sync queues, reconciliation state machine)
4. **Real-Time Multi-Admin Synchronization** (Socket.IO date/court rooms, fallback polling, presence)
5. **Long-Term Recurring Booking Conflict Detection Engine** (Parent-child series model, matrix validation)

---

## GAP 1: Race Condition Vulnerability & Concurrency Control

### 1.1 The Multi-Admin Collision Problem
During peak hours (e.g., Badminton 18:00–22:00), multiple desk and field administrators simultaneously view and attempt to book the exact same court and time slot. Without atomic locking, two transactions can validate availability simultaneously, leading to embarrassing double-bookings.

### 1.2 Two-Phase Concurrency Protocol

```
Admin A (Desk)                            PostgreSQL Server                           Admin B (Mobile)
     │                                            │                                          │
     ├─ 1. Click Slot (Initiate Lock) ───────────►│                                          │
     │     POST /api/bookings/lock                │                                          │
     │                                            ├─ Atomic UPDATE / SELECT FOR UPDATE       │
     │                                            │  Status: 5 (UNDER_BOOKING)               │
     │                                            │  LockedBy: Admin A, Expires: NOW() + 5m  │
     │◄── 2. 200 OK { lockId, expiresAt: 5:00 } ──┤                                          │
     │                                            ├─ 3. Broadcast 'booking:locked' ─────────►│ (Slot turns Yellow)
     │                                            │     via WebSocket                        │ (Shows Admin A initials)
     │                                            │                                          │
     │                                            │◄── 4. Click Same Slot ───────────────────┤
     │                                            │       POST /api/bookings/lock            │
     │                                            ├─ Check: Slot locked & expiresAt > NOW()  │
     │                                            ├─── 5. 409 Conflict: Slot Locked ────────►│ (Disabled with timer)
     │                                            │                                          │
     ├─ 6. Fill Details & Submit ────────────────►│                                          │
     │     PUT /api/bookings/:id/confirm          │                                          │
     │     (Sends current version: 1)             ├─ Atomic CAS (Compare-And-Swap):          │
     │                                            │  UPDATE WHERE id=$1 AND version=1        │
     │                                            │  Set status: 2 (CONFIRMED), version: 2   │
     │◄── 7. 200 OK (Confirmed) ─────────────────┤                                          │
     │                                            ├─ 8. Broadcast 'booking:confirmed' ──────►│ (Slot turns Green/Booked)
```

### 1.3 Implementation: Atomic Lock & Optimistic Confirmation

#### A. Database Schema Migration for Lock Safety
```sql
-- Ensure PostgreSQL has explicit indexes and status constraints
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS locked_by_admin_id UUID REFERENCES admins(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS lock_expires_at TIMESTAMP WITH TIME ZONE;

-- Partial index for active locks to make availability lookups instantaneous
CREATE INDEX IF NOT EXISTS idx_bookings_active_locks 
ON bookings (court_id, booking_date, start_time, end_time) 
WHERE status_id IN (2, 5); -- CONFIRMED or UNDER_BOOKING
```

#### B. Atomic Slot Hold (`booking.service.ts`)
```typescript
import { prisma } from '../lib/prisma';

export async function acquireSlotLock(params: {
  courtId: string;
  bookingDate: Date;
  startTime: string;
  endTime: string;
  adminId: string;
}) {
  const LOCK_DURATION_MS = 5 * 60 * 1000; // 5 minutes
  const now = new Date();
  const lockExpiresAt = new Date(now.getTime() + LOCK_DURATION_MS);

  // Execute in an atomic PostgreSQL transaction
  return await prisma.$transaction(async (tx) => {
    // Check if an existing confirmed booking or valid lock exists
    const conflict = await tx.bookings.findFirst({
      where: {
        courtId: params.courtId,
        bookingDate: params.bookingDate,
        startTime: params.startTime,
        endTime: params.endTime,
        OR: [
          { statusId: 2 }, // CONFIRMED
          {
            statusId: 5, // UNDER_BOOKING
            lockExpiresAt: { gt: now },
            lockedByAdminId: { not: params.adminId } // Locked by someone else
          }
        ]
      }
    });

    if (conflict) {
      if (conflict.statusId === 2) {
        throw new Error('SLOT_ALREADY_CONFIRMED');
      }
      throw new Error(`SLOT_LOCKED_BY_ANOTHER_ADMIN`);
    }

    // Clean up any stale expired lock for this slot if present
    await tx.bookings.deleteMany({
      where: {
        courtId: params.courtId,
        bookingDate: params.bookingDate,
        startTime: params.startTime,
        endTime: params.endTime,
        statusId: 5,
        lockExpiresAt: { lte: now }
      }
    });

    // Create the temporary reservation lock
    const lockedBooking = await tx.bookings.create({
      data: {
        courtId: params.courtId,
        bookingDate: params.bookingDate,
        startTime: params.startTime,
        endTime: params.endTime,
        bookingType: 'one_time',
        statusId: 5, // UNDER_BOOKING
        version: 1,
        lockedByAdminId: params.adminId,
        lockExpiresAt,
        createdByAdminId: params.adminId,
        contactName: 'HOLD',
        contactPhone: 'HOLD',
        amountDue: 0
      }
    });

    // Record in audit trail
    await tx.bookingLocks.create({
      data: {
        bookingId: lockedBooking.id,
        adminId: params.adminId,
        action: 'locked'
      }
    });

    return {
      bookingId: lockedBooking.id,
      lockExpiresAt,
      expiresInSeconds: 300
    };
  });
}
```

#### C. Atomic Confirmation with Optimistic Lock Check
```typescript
export async function confirmSlotBooking(params: {
  bookingId: string;
  expectedVersion: number;
  adminId: string;
  customerData: {
    contactName: string;
    contactPhone: string;
    contactEmail?: string;
    amountDue: number;
    paymentMade: boolean;
    paymentMethod?: string;
  };
}) {
  const now = new Date();

  return await prisma.$transaction(async (tx) => {
    const booking = await tx.bookings.findUnique({
      where: { id: params.bookingId }
    });

    if (!booking) throw new Error('BOOKING_NOT_FOUND');

    if (booking.lockedByAdminId !== params.adminId) {
      throw new Error('LOCK_NOT_OWNED');
    }

    if (!booking.lockExpiresAt || booking.lockExpiresAt < now) {
      // Release expired lock
      await tx.bookings.delete({ where: { id: params.bookingId } });
      throw new Error('LOCK_EXPIRED');
    }

    if (booking.version !== params.expectedVersion) {
      throw new Error('CONCURRENT_MODIFICATION_DETECTED');
    }

    // Atomically upgrade to CONFIRMED and release lock
    const confirmed = await tx.bookings.update({
      where: {
        id: params.bookingId,
        version: params.expectedVersion
      },
      data: {
        statusId: 2, // CONFIRMED
        contactName: params.customerData.contactName,
        contactPhone: params.customerData.contactPhone,
        contactEmail: params.customerData.contactEmail,
        amountDue: params.customerData.amountDue,
        paymentMade: params.customerData.paymentMade,
        paymentMethod: params.customerData.paymentMethod,
        paymentDate: params.customerData.paymentMade ? now : null,
        lockedByAdminId: null,
        lockExpiresAt: null,
        version: { increment: 1 }
      }
    });

    // Audit log
    await tx.bookingAuditLog.create({
      data: {
        bookingId: confirmed.id,
        adminId: params.adminId,
        action: 'confirmed',
        newValues: confirmed as any
      }
    });

    return confirmed;
  });
}
```

---

## GAP 2: Enterprise Authentication, Security & RBAC

### 2.1 Dual-Token Lifecycle with Replay Attack Detection

```
Client (Browser)                           Backend API                             Auth Database
      │                                         │                                        │
      ├── 1. POST /api/auth/login ─────────────►│                                        │
      │      { email, password }                ├─ Verify bcrypt hash (cost: 12)         │
      │                                         ├─ Generate sessionId (UUID)             │
      │                                         ├─ AccessToken (JWT, 15m)                │
      │                                         ├─ RefreshToken (Cryptographic random)   │
      │                                         ├─ Hash RefreshToken with SHA-256 ──────►│ Store Session
      │◄── 2. 200 OK ───────────────────────────┤                                        │
      │       Set-Cookie: refreshToken (httpOnly)                                        │
      │       Body: { accessToken, adminProfile }                                        │
      │                                                                                  │
      ▼  (Every 14 minutes or on 401 response)                                          │
      ├── 3. POST /api/auth/refresh ───────────►│                                        │
      │      (Sends httpOnly refreshToken cookie)                                        │
      │                                         ├─ Lookup active session in DB ─────────►│
      │                                         ├─ Compare token hashes                  │
      │                                         │                                        │
      │                                         ├── IF REUSED / STALE:                   │
      │                                         │   *REPLAY ATTACK DETECTED*             │
      │                                         │   Invalidate all sessions for user ───►│ Kill Sessions
      │                                         │   Return 401 Unauthorized              │
      │                                         │                                        │
      │                                         └── IF VALID:                            │
      │                                             Rotate Token: new sessionId & token  │
      │                                             Update DB hash ─────────────────────►│ Update Session
      │◄── 4. 200 OK (New Access & Refresh) ────┤                                        │
```

### 2.2 Role & Permission Matrix
| Role | Bookings Create/Edit | Bookings Cancel | Payments Collect | Financial Reports | Court Config / Admins |
|---|:---:|:---:|:---:|:---:|:---:|
| `super_admin` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `booking_admin` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `finance_admin` | ❌ | ❌ | ✅ | ✅ | ❌ |
| `view_only` | ❌ | ❌ | ❌ | ❌ (Dashboard Only) | ❌ |

### 2.3 Express RBAC Middleware Implementation
```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

export interface AuthenticatedAdmin {
  id: string;
  email: string;
  role: string;
  sessionId: string;
  permissions: string[];
}

export const authenticateJWT = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'UNAUTHORIZED_NO_TOKEN' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;

    // Verify session has not been revoked or killed
    const session = await prisma.sessions.findUnique({
      where: { id: payload.sessionId }
    });

    if (!session || !session.isActive || session.expiresAt < new Date()) {
      return res.status(401).json({ error: 'SESSION_REVOKED_OR_EXPIRED' });
    }

    req.admin = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      sessionId: payload.sessionId,
      permissions: payload.permissions || []
    };

    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'ACCESS_TOKEN_EXPIRED' });
    }
    return res.status(403).json({ error: 'INVALID_TOKEN' });
  }
};

export const authorizePermission = (requiredPermission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.admin) return res.status(401).json({ error: 'UNAUTHENTICATED' });
    
    if (req.admin.role === 'super_admin' || req.admin.permissions.includes(requiredPermission)) {
      return next();
    }
    return res.status(403).json({ error: 'FORBIDDEN_INSUFFICIENT_PERMISSIONS' });
  };
};
```

---

## GAP 3: Offline-First PWA Strategy & Conflict Resolution

### 3.1 The Fundamental Offline Constraint
> **Rule:** An offline client **cannot** authoritatively guarantee a slot hold against live online clients, because the physical server holds truth.

Therefore, NexCourt implements a **Split-Tier Offline Mode**:
1. **Tier 1 (Cached Explorer):** Full read access to the schedule, court calendars, and booking search using IndexedDB.
2. **Tier 2 (Provisional Sync Queue):** Draft bookings created offline are saved locally in a `SyncQueue` with a clear warning: *"Saved offline. Will attempt reservation when network reconnects."*

### 3.2 Sync-On-Reconnect State Machine

```
      [ Normal Online State ]
                 │
                 ▼ Network Drop detected (window 'offline')
      [ Offline Mode Active ]
        ├─ Read-only calendar from IndexedDB
        ├─ Action Button: "Save Draft Offline"
        └─ Local sync_queue.add({ action: 'CREATE_BOOKING', payload })
                 │
                 ▼ Network Restored (window 'online')
      [ Syncing State (Sticky Banner) ]
        ├─ 1. Silent JWT Re-authentication
        ├─ 2. Fetch server schedule diff (lastSyncedAt)
        ├─ 3. Dequeue offline items in FIFO order:
        │     ├─ Server validates slot status
        │     ├─ IF SLOT FREE: Server confirms, local draft replaced with confirmed ID
        │     └─ IF SLOT TAKEN: Server returns 409 CONFLICT
        │
        ▼ 
      [ Conflict Resolution Dialog ]
        ├─ Displays: "Court 2 at 19:00 was reserved by Admin Z while offline."
        ├─ Suggests: Next available slot (e.g., Court 3 at 19:00 or Court 2 at 20:00)
        └─ Admin selects alternative or cancels draft
```

### 3.3 Client-Side IndexedDB Storage Layer (`offline-storage.ts`)
```typescript
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface NexCourtDB extends DBSchema {
  schedule_cache: {
    key: string; // 'date_YYYY-MM-DD'
    value: {
      date: string;
      courts: any[];
      cachedAt: number;
    };
  };
  offline_queue: {
    key: string; // uuid
    value: {
      id: string;
      action: 'BOOKING_REQUEST' | 'PAYMENT_UPDATE' | 'CANCEL_REQUEST';
      payload: any;
      createdAt: number;
      retryCount: number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<NexCourtDB>>;

export function getOfflineDB() {
  if (!dbPromise) {
    dbPromise = openDB<NexCourtDB>('nexcourt_offline_v1', 1, {
      upgrade(db) {
        db.createObjectStore('schedule_cache', { keyPath: 'date' });
        db.createObjectStore('offline_queue', { keyPath: 'id' });
      }
    });
  }
  return dbPromise;
}

// Queue an action while offline
export async function queueOfflineAction(action: 'BOOKING_REQUEST' | 'PAYMENT_UPDATE', payload: any) {
  const db = await getOfflineDB();
  const id = crypto.randomUUID();
  await db.put('offline_queue', {
    id,
    action,
    payload,
    createdAt: Date.now(),
    retryCount: 0
  });
  return id;
}

// Background sync process executed when back online
export async function flushOfflineQueue(apiClient: any, onConflict: (conflict: any) => void) {
  const db = await getOfflineDB();
  const queue = await db.getAll('offline_queue');

  for (const item of queue) {
    try {
      if (item.action === 'BOOKING_REQUEST') {
        // Attempt reservation + confirmation on server
        await apiClient.post('/api/bookings/offline-reconcile', item.payload);
      }
      // Success: Remove from queue
      await db.delete('offline_queue', item.id);
    } catch (err: any) {
      if (err.response?.status === 409) {
        // Conflict! The slot was taken while offline
        onConflict({
          item,
          conflictData: err.response.data
        });
        await db.delete('offline_queue', item.id); // Handled by resolution UI
      } else {
        item.retryCount++;
        await db.put('offline_queue', item);
      }
    }
  }
}
```

---

## GAP 4: Real-Time Synchronization Mechanism

### 4.1 WebSocket Architecture & Room Partitioning
Rather than broadcasting all facility events to every client, Socket.IO rooms are partitioned dynamically by **Booking Date** (`date:YYYY-MM-DD`). Only administrators actively viewing or editing a specific date receive high-frequency slot changes.

```
       Admin 1 (Viewing Today)         Admin 2 (Viewing Today)         Admin 3 (Viewing Tomorrow)
                  │                               │                               │
                  ▼                               ▼                               ▼
        ┌──────────────────────────────────────────────────┐            ┌───────────────────┐
        │             Room: 'bookings:2026-09-25'          │            │ Room: '2026-09-26'│
        │ - booking:locked (Court 1, 18:00)                │            │                   │
        │ - booking:confirmed (Court 2, 20:00)             │            │                   │
        └──────────────────────────────────────────────────┘            └───────────────────┘
```

### 4.2 Socket.IO Server & Fallback Strategy (`socket.server.ts`)
```typescript
import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

export function setupSocketServer(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      credentials: true
    },
    transports: ['websocket', 'polling'], // Fallback enabled
    pingInterval: 25000,
    pingTimeout: 20000
  });

  // Authenticate socket handshake using JWT
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('AUTHENTICATION_REQUIRED'));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      socket.data.adminId = decoded.sub;
      socket.data.adminEmail = decoded.email;
      socket.data.fullName = decoded.fullName;
      next();
    } catch (err) {
      next(new Error('INVALID_TOKEN'));
    }
  });

  io.on('connection', (socket) => {
    // Admin joins the date room
    socket.on('join:date', (dateStr: string) => {
      // Leave existing date rooms
      for (const room of socket.rooms) {
        if (room.startsWith('date:')) socket.leave(room);
      }
      socket.join(`date:${dateStr}`);
    });

    // Notify others of active slot lock
    socket.on('client:lock_slot', (data: { courtId: string; date: string; slot: string; lockId: string }) => {
      socket.to(`date:${data.date}`).emit('booking:locked', {
        courtId: data.courtId,
        date: data.date,
        slot: data.slot,
        lockedByAdmin: socket.data.fullName || socket.data.adminEmail,
        lockedByAdminId: socket.data.adminId,
        lockExpiresAt: Date.now() + 5 * 60 * 1000
      });
    });

    // Notify others on release / modal close
    socket.on('client:unlock_slot', (data: { courtId: string; date: string; slot: string }) => {
      socket.to(`date:${data.date}`).emit('booking:unlocked', {
        courtId: data.courtId,
        date: data.date,
        slot: data.slot
      });
    });

    // Notify others on confirmation
    socket.on('client:confirmed_slot', (data: { courtId: string; date: string; slot: string; customerName: string }) => {
      socket.to(`date:${data.date}`).emit('booking:confirmed', {
        courtId: data.courtId,
        date: data.date,
        slot: data.slot,
        customerName: data.customerName,
        confirmedBy: socket.data.fullName
      });
    });
  });

  return io;
}
```

### 4.3 Client Real-Time Hook (`useRealTimeBookings.ts`)
- Features automatic reconnection with exponential backoff.
- Features automatic fallback to 5-second polling if WebSocket transport fails behind strict firewalls.
- Displays live countdown timers on locked slots.

---

## GAP 5: Long-Term & Recurring Booking Engine

### 5.1 The Recurring Series Problem
A sports academy wishes to book **Court 1 and Court 2 every Tuesday and Thursday from 18:00 to 20:00 for 12 weeks** (total 48 slot sessions).
If a single one-time booking already exists on Week 4, a naive system either fails the entire series or causes a silent double-booking.

### 5.2 The Parent-Child Architectural Solution
Instead of storing just a JSON recurrence blob, NexCourt utilizes a **Parent Series + Individual Instance Matrix**:

```
                       Parent Booking Record
                       ID: series-uuid-001
                       bookingType: 'long_term'
                       recurringPattern: JSONB
                       totalAmount: AED 7,200
                                │
       ┌────────────────────────┼────────────────────────┐
       ▼                        ▼                        ▼
Instance 1 (Oct 06)      Instance 2 (Oct 08)      Instance 3 (Oct 13) ...
Court 1, 18:00-20:00     Court 1, 18:00-20:00     Court 1, 18:00-20:00
Status: 2 (CONFIRMED)    Status: 2 (CONFIRMED)    Status: 3 (CANCELLED/REFUNDED)
Parent: series-uuid-001  Parent: series-uuid-001  Parent: series-uuid-001
```

**Benefits of this Model:**
- Individual sessions can be rescheduled or cancelled without breaking the contract series.
- Day-view calendars query simple flat rows with 0 runtime recurrence expansion overhead.
- Direct foreign-key cascade maintains integrity.

### 5.3 Overlap Detection & Conflict Matrix Engine (`recurring.service.ts`)
```typescript
import { addDays, format, getDay, isBefore, parseISO } from 'date-fns';
import { prisma } from '../lib/prisma';

export interface RecurrenceRule {
  courtId: string;
  daysOfWeek: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  startDate: string;    // 'YYYY-MM-DD'
  endDate: string;      // 'YYYY-MM-DD'
  startTime: string;    // '18:00'
  endTime: string;      // '20:00'
  blackoutDates?: string[];
}

export interface ConflictCheckResult {
  totalRequestedSessions: number;
  availableDates: string[];
  conflictedDates: {
    date: string;
    courtId: string;
    existingBookingId: string;
    existingCustomerName: string;
    existingStatus: string;
  }[];
  isClean: boolean;
}

export async function evaluateRecurringConflicts(rule: RecurrenceRule): Promise<ConflictCheckResult> {
  const start = parseISO(rule.startDate);
  const end = parseISO(rule.endDate);
  const requestedDates: string[] = [];

  // 1. Expand recurrence rule into concrete calendar dates
  let cursor = start;
  while (!isBefore(end, cursor)) {
    const day = getDay(cursor);
    const dateStr = format(cursor, 'yyyy-MM-dd');

    if (rule.daysOfWeek.includes(day) && !rule.blackoutDates?.includes(dateStr)) {
      requestedDates.push(dateStr);
    }
    cursor = addDays(cursor, 1);
  }

  // 2. Query all existing bookings for this court and time slot across the date range
  const existingBookings = await prisma.bookings.findMany({
    where: {
      courtId: rule.courtId,
      bookingDate: {
        gte: start,
        lte: end
      },
      startTime: rule.startTime,
      endTime: rule.endTime,
      statusId: { in: [2, 5] } // CONFIRMED or UNDER_BOOKING
    },
    select: {
      id: true,
      bookingDate: true,
      contactName: true,
      statusId: true
    }
  });

  const conflictMap = new Map<string, any>();
  for (const b of existingBookings) {
    if (b.bookingDate) {
      const bDateStr = format(b.bookingDate, 'yyyy-MM-dd');
      conflictMap.set(bDateStr, b);
    }
  }

  const availableDates: string[] = [];
  const conflictedDates: any[] = [];

  for (const d of requestedDates) {
    if (conflictMap.has(d)) {
      const conflict = conflictMap.get(d);
      conflictedDates.push({
        date: d,
        courtId: rule.courtId,
        existingBookingId: conflict.id,
        existingCustomerName: conflict.contactName,
        existingStatus: conflict.statusId === 2 ? 'CONFIRMED' : 'HELD'
      });
    } else {
      availableDates.push(d);
    }
  }

  return {
    totalRequestedSessions: requestedDates.length,
    availableDates,
    conflictedDates,
    isClean: conflictedDates.length === 0
  };
}
```

### 5.4 Long-Term Booking Creation with Partial Resolution
When conflicts are present, the UI presents the Administrator with 3 automated options:
1. **Exclude Conflicted Dates:** Book only the available dates; automatically prorate total cost.
2. **Shift Conflicted Sessions to Alternate Court:** (e.g. Court 2 instead of Court 1 for the 2 conflicted dates).
3. **Override (Super Admin only):** Initiates automated rescheduling workflow for the conflicting one-time customer with SMS/email notification.

---

## Summary & Verification Matrix

| Gap | Threat / Limitation | Implemented Resolution | Tech Enabler |
|---|---|---|---|
| **1. Race Conditions** | Admins double-booking slots | 5-minute atomic holds + Optimistic version counter | PostgreSQL atomic transaction + Prisma `version` field |
| **2. Authentication** | Uncontrolled access / token leaks | Dual-token with replay family rotation + RBAC middleware | JWT (15m) + Secure httpOnly Cookie (7d) + SHA-256 session table |
| **3. Offline Mode** | Network drops on field tablets | Read-only IndexedDB cache + provisional queue + sync reconciliation | `idb` library + Service Worker + Conflict Resolution Modal |
| **4. Real-Time Sync** | Stale screen view on desk/mobile | Date-partitioned Socket.IO rooms + live timer + fallback polling | Socket.IO + HTTP Polling fallback |
| **5. Long-Term Slots** | Recurring clashes with one-time slots | Parent-Child Series architecture + vector conflict evaluation | Date-fns recurrence generator + Prorated resolution engine |

---
*Created for NexCourt Project — Al Nahda Boys School Sports Complex.*
