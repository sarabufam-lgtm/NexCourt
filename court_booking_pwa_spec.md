# Court Booking PWA - Technical Specification & Architecture Review

**Project:** Al Nahda Boys School Court Booking Management System  
**Version:** 1.0  
**Date:** September 25, 2026

---

## EXECUTIVE SUMMARY

Your requirements describe a complex real-time concurrent booking system. This spec addresses gaps in the original requirements and provides industry-grade solutions for multi-admin concurrency, security, and scalability.

**Key Improvements:**
- Optimistic locking to prevent double-booking race conditions
- JWT + Refresh Token authentication with role-based access control
- WebSocket for real-time booking status updates
- Lightweight architecture suitable for Railway/Vercel deployment
- Offline-first PWA with IndexedDB caching

---

## 1. ARCHITECTURE OVERVIEW

### 1.1 Technology Stack (Recommended)

**Frontend:**
```
- Framework: React 18 + TypeScript
- PWA: Workbox for service workers
- State Management: TanStack Query (React Query) for server state
- Local Storage: IndexedDB (via idb-keyval or localforage)
- Real-time: Socket.IO Client with fallback to polling
- UI: Tailwind CSS + shadcn/ui for mobile-first components
- Date/Time: Day.js (lightweight alternative to moment.js)
- HTTP Client: Axios with request interceptors for auth
```

**Backend:**
```
- Runtime: Node.js 20+ (LTS)
- Framework: Express.js or Fastify (Fastify is lighter, better for serverless)
- WebSocket: Socket.IO or native WebSocket
- Database: PostgreSQL (relational, ACID transactions) or SQLite for Railway
- ORM: Prisma (excellent type safety and migrations)
- Authentication: Passport.js or jsonwebtoken + bcryptjs
- Validation: Zod or Joi
- Environment: Node.js serverless on Railway/Vercel
```

**Database:**
```
- Primary: PostgreSQL (Railway supports this natively)
- Caching: Redis (optional, for session management if scaling)
- Search: PostgreSQL full-text search (sufficient for this scale)
```

---

## 2. SECURITY ARCHITECTURE

### 2.1 Authentication Flow (OAuth 2.0 + JWT Pattern)

```
┌─────────────┐
│   Admin     │
└──────┬──────┘
       │
       ├─ 1. POST /auth/login { email, password }
       │
   ┌───▼────────────────────────┐
   │  Backend validates password  │
   │  Checks against bcrypt hash │
   └───┬───────────────────────┬──┘
       │                       │
   Valid                   Invalid
       │                       │
       ├─► Generate JWT       └─► 401 Unauthorized
       │   (15 min expiry)
       │
   ┌───▼────────────────────────┐
   │ Generate Refresh Token       │
   │ (7 days, httpOnly cookie)    │
   │ Store in DB with hash        │
   └───┬───────────────────────┬──┘
       │                       │
   ┌───▼──────────────────────┐│
   │  Response to Client       ││
   │  ├─ accessToken (JWT)     ││
   │  ├─ refreshToken (cookie) ││
   │  └─ admin metadata        ││
   └───┬──────────────────────┬┘
       │                      │
       └─ Store in localStorage
          (accessToken only)
```

### 2.2 JWT Token Structure

**Access Token (15-30 minutes):**
```json
{
  "sub": "admin-id-uuid",
  "email": "admin@school.ae",
  "role": "booking_admin",
  "permissions": ["read:bookings", "create:bookings", "update:bookings"],
  "sessionId": "session-uuid",
  "iat": 1695688800,
  "exp": 1695689700
}
```

**Refresh Token (7 days, HTTP-Only):**
- Stored as httpOnly, Secure, SameSite=Strict cookie
- Token rotation: New refresh token on each use
- Revocation: Track in DB with blacklist or token family tracking

### 2.3 Password Security

```javascript
// Backend Password Hashing
import bcryptjs from 'bcryptjs';

const hashPassword = async (password) => {
  // Minimum requirements:
  // - 8+ characters
  // - Mix of uppercase, lowercase, numbers, symbols
  const salt = await bcryptjs.genSalt(12); // Cost factor: 12
  return await bcryptjs.hash(password, salt);
};

const verifyPassword = async (password, hash) => {
  return await bcryptjs.compare(password, hash);
};
```

### 2.4 RBAC (Role-Based Access Control)

```typescript
// Roles and Permissions Matrix
enum Role {
  SUPER_ADMIN = 'super_admin',      // All permissions
  BOOKING_ADMIN = 'booking_admin',  // Bookings + Cancellations
  FINANCE_ADMIN = 'finance_admin',  // Payments + Reports
  VIEW_ONLY = 'view_only'           // Read-only access
}

interface Permission {
  resource: 'bookings' | 'cancellations' | 'payments' | 'financial';
  action: 'create' | 'read' | 'update' | 'delete';
}

const rolePermissions = {
  [Role.SUPER_ADMIN]: ['*'],
  [Role.BOOKING_ADMIN]: [
    'bookings:create',
    'bookings:read',
    'bookings:update',
    'cancellations:create'
  ],
  [Role.FINANCE_ADMIN]: [
    'payments:read',
    'payments:update',
    'financial:read'
  ],
  [Role.VIEW_ONLY]: ['bookings:read', 'financial:read']
};
```

### 2.5 Request Authentication Middleware

```typescript
// Express Middleware
import jwt from 'jsonwebtoken';
import { getSession } from './db';

const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if session is still valid (not logged out)
    const session = await getSession(decoded.sessionId);
    if (!session || !session.isActive) {
      return res.status(401).json({ error: 'Session invalid' });
    }
    
    req.admin = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Permission check middleware
const requirePermission = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.admin.permissions.includes(requiredPermission)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};
```

### 2.6 Security Headers & CSP

```typescript
// Helmet.js for security headers
import helmet from 'helmet';

app.use(helmet());

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
  );
  next();
});
```

---

## 3. DATABASE SCHEMA

### 3.1 Core Tables

```sql
-- Admins Table
CREATE TABLE admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions Table (for tracking login sessions)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  refresh_token_hash VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  device_info JSONB, -- Browser, OS, IP, etc.
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_admin_id (admin_id),
  INDEX idx_expires_at (expires_at)
);

-- Court Types Table
CREATE TABLE court_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE, -- Badminton, Basketball, Cricket, Pickleball
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Courts Table
CREATE TABLE courts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  court_number INT NOT NULL,
  court_type_id UUID NOT NULL REFERENCES court_types(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(court_number, court_type_id)
);

-- Booking Statuses
CREATE TABLE booking_statuses (
  id SMALLINT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT
);
-- Values: 1=PENDING, 2=CONFIRMED, 3=CANCELLED, 4=COMPLETED, 5=UNDER_BOOKING

-- Bookings Table (Main table - CRITICAL for concurrency control)
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id UUID NOT NULL REFERENCES courts(id),
  booking_type VARCHAR(50) NOT NULL, -- 'one_time' or 'long_term'
  status_id SMALLINT NOT NULL REFERENCES booking_statuses(id),
  
  -- Concurrency Control: Optimistic Locking
  version INT NOT NULL DEFAULT 1,
  locked_by_admin_id UUID, -- Which admin is currently booking this
  lock_expires_at TIMESTAMP, -- Booking lock timeout (5 minutes)
  
  -- Booking Details
  contact_name VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(20) NOT NULL,
  contact_email VARCHAR(255),
  
  -- For One-Time Bookings
  booking_date DATE,
  start_time TIME,
  end_time TIME,
  
  -- For Long-Term Bookings
  recurring_pattern JSONB, -- { months: [...], days: [...], duration_hours: 4 }
  long_term_start_date DATE,
  long_term_end_date DATE,
  
  -- Payment
  amount_due DECIMAL(10, 2),
  payment_made BOOLEAN DEFAULT false,
  payment_method VARCHAR(50), -- 'cash', 'card', 'bank_transfer'
  payment_date TIMESTAMP,
  transaction_id VARCHAR(100),
  
  -- Admin who created booking
  created_by_admin_id UUID NOT NULL REFERENCES admins(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes for common queries
  INDEX idx_court_date (court_id, booking_date),
  INDEX idx_status (status_id),
  INDEX idx_lock_expires (lock_expires_at),
  INDEX idx_created_by (created_by_admin_id)
);

-- Booking Lock History (Audit trail)
CREATE TABLE booking_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES admins(id),
  locked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  unlocked_at TIMESTAMP,
  action VARCHAR(50), -- 'locked', 'unlocked', 'timeout'
  INDEX idx_booking_id (booking_id)
);

-- Booking Activity/Audit Log
CREATE TABLE booking_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES admins(id),
  action VARCHAR(100) NOT NULL, -- 'created', 'updated', 'cancelled', etc.
  old_values JSONB,
  new_values JSONB,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45),
  INDEX idx_booking_id (booking_id),
  INDEX idx_timestamp (timestamp)
);

-- Cancellations Table
CREATE TABLE cancellations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  cancelled_by_admin_id UUID NOT NULL REFERENCES admins(id),
  cancellation_reason TEXT,
  refund_amount DECIMAL(10, 2),
  refund_processed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pricing Table (for flexibility)
CREATE TABLE pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  court_type_id UUID NOT NULL REFERENCES court_types(id),
  day_type VARCHAR(20) NOT NULL, -- 'weekday', 'weekend'
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  rate_per_hour DECIMAL(10, 2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(court_type_id, day_type, start_time, end_time)
);
```

### 3.2 Concurrency Control Strategy

**Problem:** Multiple admins booking simultaneously can cause double-booking.

**Solution: Optimistic Locking with Timeout**

```typescript
// Backend: Lock mechanism
const initiateBooking = async (courtId, adminId, bookingDate, startTime) => {
  const lockDuration = 5 * 60 * 1000; // 5 minutes
  
  const booking = await db.bookings.update(
    { courtId, bookingDate, startTime },
    {
      locked_by_admin_id: adminId,
      lock_expires_at: new Date(Date.now() + lockDuration),
      status_id: 5 // UNDER_BOOKING
    },
    {
      where: { status_id: 1 }, // Only if PENDING
      select: ['id', 'version']
    }
  );
  
  if (!booking) {
    throw new Error('Slot already locked or unavailable');
  }
  
  return booking;
};

const confirmBooking = async (bookingId, bookingData, adminId) => {
  // Verify lock still belongs to this admin
  const booking = await db.bookings.findUnique({ where: { id: bookingId } });
  
  if (booking.locked_by_admin_id !== adminId) {
    throw new Error('You do not have the lock for this booking');
  }
  
  if (new Date() > booking.lock_expires_at) {
    // Release lock
    await db.bookings.update(
      { id: bookingId },
      {
        locked_by_admin_id: null,
        lock_expires_at: null,
        status_id: 1
      }
    );
    throw new Error('Lock expired. Please try again');
  }
  
  // Atomic update with version check (optimistic locking)
  const updated = await db.bookings.updateWhere(
    {
      id: bookingId,
      version: booking.version // Only update if version matches
    },
    {
      ...bookingData,
      status_id: 2, // CONFIRMED
      locked_by_admin_id: null,
      lock_expires_at: null,
      version: booking.version + 1,
      updated_at: new Date()
    }
  );
  
  if (!updated) {
    throw new Error('Booking was modified. Please refresh and try again');
  }
  
  return updated;
};
```

---

## 4. REAL-TIME CONCURRENCY UPDATES

### 4.1 WebSocket Integration (Socket.IO)

```typescript
// Backend: Socket.IO Setup
import { Server } from 'socket.io';

const io = new Server(httpServer, {
  cors: { origin: process.env.FRONTEND_URL, credentials: true }
});

// Authenticate socket connections
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.adminId = decoded.sub;
    socket.adminEmail = decoded.email;
    next();
  } catch {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  console.log(`Admin ${socket.adminEmail} connected`);
  
  // Join room based on date (all admins booking same day share room)
  socket.on('subscribe:date', (date) => {
    socket.join(`bookings:${date}`);
    socket.emit('subscribed', { date });
  });
  
  // Broadcast when booking is locked
  socket.on('booking:lock', (data) => {
    io.to(`bookings:${data.date}`).emit('booking:locked', {
      courtId: data.courtId,
      slot: data.slot,
      lockedBy: socket.adminEmail,
      expiresIn: 300 // seconds
    });
  });
  
  // Broadcast when booking is confirmed
  socket.on('booking:confirmed', (data) => {
    io.to(`bookings:${data.date}`).emit('booking:updated', {
      courtId: data.courtId,
      slot: data.slot,
      status: 'CONFIRMED',
      bookedBy: socket.adminEmail
    });
  });
  
  socket.on('disconnect', () => {
    console.log(`Admin ${socket.adminEmail} disconnected`);
  });
});
```

### 4.2 Frontend: Real-time Status Updates

```typescript
// Frontend: React Hook for real-time booking updates
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export const useBookingSync = (selectedDate, accessToken) => {
  const [bookingStatus, setBookingStatus] = useState({});
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const newSocket = io(process.env.REACT_APP_API_URL, {
      auth: { token: accessToken },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    newSocket.on('connect', () => {
      newSocket.emit('subscribe:date', selectedDate);
    });

    newSocket.on('booking:locked', (data) => {
      setBookingStatus(prev => ({
        ...prev,
        [`${data.courtId}-${data.slot}`]: {
          status: 'LOCKED',
          lockedBy: data.lockedBy,
          expiresAt: Date.now() + data.expiresIn * 1000
        }
      }));
    });

    newSocket.on('booking:updated', (data) => {
      setBookingStatus(prev => ({
        ...prev,
        [`${data.courtId}-${data.slot}`]: {
          status: 'CONFIRMED',
          bookedBy: data.bookedBy
        }
      }));
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, [selectedDate, accessToken]);

  return { bookingStatus, socket };
};
```

---

## 5. API ENDPOINTS

### 5.1 Authentication Endpoints

```
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
POST   /api/auth/change-password
GET    /api/auth/me (current user)
```

### 5.2 Booking Endpoints

```
GET    /api/bookings?date=YYYY-MM-DD&courtType=badminton
POST   /api/bookings/initiate          (Lock slot)
PUT    /api/bookings/:id/confirm       (Save booking)
DELETE /api/bookings/:id/cancel
GET    /api/bookings/availability      (Real-time)
```

### 5.3 Court Management

```
GET    /api/courts
GET    /api/courts/types
POST   /api/courts (admin only)
```

### 5.4 Financial Endpoints

```
GET    /api/payments/summary
POST   /api/payments/:bookingId/record
GET    /api/reports/revenue
```

---

## 6. FRONTEND ARCHITECTURE

### 6.1 Component Structure

```
src/
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   ├── ProtectedRoute.tsx
│   │   └── SessionTimeout.tsx
│   ├── booking/
│   │   ├── BookingCard.tsx
│   │   ├── DatePicker.tsx
│   │   ├── CourtGrid.tsx
│   │   ├── TimeSlotSelector.tsx
│   │   └── BookingDetails.tsx
│   ├── longterm/
│   │   ├── MonthSelector.tsx
│   │   ├── DaySelector.tsx
│   │   ├── DurationSelector.tsx
│   │   └── LongTermPreview.tsx
│   └── common/
│       ├── Header.tsx
│       ├── NavToggle.tsx
│       └── ResponsiveLayout.tsx
├── hooks/
│   ├── useAuth.ts
│   ├── useBookingSync.ts
│   ├── useOfflineSupport.ts
│   └── useResponsive.ts
├── services/
│   ├── api.ts (Axios instance)
│   ├── auth.ts
│   ├── bookings.ts
│   └── storage.ts
├── store/
│   ├── authSlice.ts
│   ├── bookingSlice.ts
│   └── store.ts
├── utils/
│   ├── validators.ts
│   ├── formatters.ts
│   └── constants.ts
└── App.tsx
```

### 6.2 Responsive Layout Logic

```typescript
// Hook to detect device type
export const useResponsive = () => {
  const [isMobile, setIsMobile] = useState(
    window.matchMedia('(max-width: 768px)').matches
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const handleChange = (e) => setIsMobile(e.matches);
    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  return isMobile;
};

// Component that enforces mobile UI on all devices
export const ResponsiveBookingLayout = () => {
  const isMobile = useResponsive();
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className={isMobile ? 'mobile-layout' : 'desktop-layout'}>
      <Header>
        <MenuToggle 
          onClick={() => setShowMenu(!showMenu)}
          isOpen={showMenu}
        />
      </Header>
      
      {showMenu && !isMobile && (
        // Full landscape menu on desktop
        <SideMenu />
      )}
      
      {showMenu && isMobile && (
        // Hamburger menu on mobile
        <MobileMenu />
      )}
      
      <MainContent />
    </div>
  );
};
```

---

## 7. LLM PROMPTS FOR AUTOMATION

### 7.1 Booking Confirmation Email Prompt

```
You are an automated customer service assistant for Al Nahda Boys School Court Booking System.

Generate a professional booking confirmation email with the following details:
- Court Type: {courtType}
- Court Number: {courtNumber}
- Booking Date: {bookingDate}
- Time Slot: {startTime} - {endTime}
- Contact Name: {contactName}
- Booking Type: {bookingType}
- Amount: AED {amount}
- Confirmation ID: {confirmationId}
- Booking Policy: Cancellations must be made 24 hours before slot
- Contact: Email reservations@school.ae or call +971-XX-XXXXXX

Email format:
- Professional tone
- Clear booking details
- Cancellation policy
- Contact information
- CTA to view booking details

Output: Only the email body, no subject line.
```

### 7.2 Payment Reminder Prompt

```
Generate a payment reminder message for unpaid bookings:

Booking Details:
- Customer: {customerName}
- Booking Reference: {bookingRef}
- Court: {courtType} - {courtNumber}
- Date/Time: {dateTime}
- Amount Due: AED {amount}
- Payment Methods: Bank Transfer, Card, Cash
- Deadline: {paymentDeadline}

Message should:
- Politely remind of outstanding payment
- Include booking reference
- Provide payment options
- Set clear deadline
- Offer assistance

Output format: Professional SMS + Email variants (keep SMS under 160 characters)
```

### 7.3 Booking Report Summarization Prompt

```
Analyze daily booking data and generate a summary report:

Input Data:
{
  "date": "2026-09-25",
  "totalBookings": {courtType}
  "occupancyRate": {percentage},
  "revenue": {amount},
  "cancellations": {count},
  "noShows": {count},
  "peakHours": [{hours}],
  "averageBookingValue": {amount}
}

Generate:
1. Executive Summary (2-3 sentences)
2. Key Metrics (formatted table)
3. Insights (trend analysis)
4. Recommendations (actionable)

Output: Markdown format suitable for dashboard display
```

---

## 8. DEPLOYMENT ARCHITECTURE

### 8.1 Railway.app Deployment

```yaml
# railway.toml
[build]
builder = "nix"
buildCommand = "npm install && npm run build"
startCommand = "npm start"

[environment]
PORT = 3000
NODE_ENV = "production"
DATABASE_URL = "${DATABASE_URL}"
JWT_SECRET = "${JWT_SECRET}"
FRONTEND_URL = "${FRONTEND_URL}"
```

### 8.2 Vercel Deployment (Frontend)

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "build",
  "envPrefix": "REACT_APP_",
  "env": {
    "REACT_APP_API_URL": "@api-url"
  }
}
```

### 8.3 Environment Variables

```bash
# Backend (.env)
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/court_booking
JWT_SECRET=your-super-secret-key-min-32-chars-here
JWT_REFRESH_SECRET=another-secret-for-refresh-token
FRONTEND_URL=https://yourdomain.com
CORS_ORIGIN=https://yourdomain.com
LOG_LEVEL=info
SESSION_TIMEOUT=900000 # 15 minutes

# Frontend (.env)
REACT_APP_API_URL=https://api.yourdomain.com
REACT_APP_ENVIRONMENT=production
```

---

## 9. PERFORMANCE OPTIMIZATION

### 9.1 Database Query Optimization

```sql
-- Index for concurrent booking checks
CREATE INDEX idx_booking_slot_available 
  ON bookings (court_id, booking_date, start_time, end_time, status_id)
  WHERE status_id IN (2, 5); -- CONFIRMED or UNDER_BOOKING

-- Index for recurring booking queries
CREATE INDEX idx_long_term_bookings
  ON bookings (court_id, recurring_pattern, status_id)
  WHERE booking_type = 'long_term' AND status_id = 2;

-- Query optimization: Check availability
EXPLAIN ANALYZE
SELECT COUNT(*) as available_slots
FROM bookings
WHERE court_id = $1 
  AND booking_date = $2 
  AND status_id = 1; -- PENDING (available)
```

### 9.2 API Response Caching

```typescript
// Cache strategy with stale-while-revalidate
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 60 }); // 60 second TTL

app.get('/api/bookings/availability', (req, res) => {
  const cacheKey = `availability:${req.query.date}:${req.query.courtType}`;
  
  const cached = cache.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  // Fetch from DB
  const availability = fetchAvailability(req.query);
  cache.set(cacheKey, availability);
  res.json(availability);
});
```

### 9.3 PWA Optimization

```javascript
// Service Worker caching strategy
const CACHE_NAME = 'court-booking-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/static/css/main.css',
  '/static/js/main.js',
  '/manifest.json',
  '/offline.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Network-first strategy for API calls
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, response.clone());
            return response;
          });
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    // Cache-first for static assets
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});
```

---

## 10. SECURITY CHECKLIST

### Pre-Launch Security Audit

- [ ] All endpoints require authentication
- [ ] HTTPS/TLS enforced (not just recommended)
- [ ] CORS properly configured (specific domains only)
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (input sanitization, CSP headers)
- [ ] CSRF tokens on state-changing operations
- [ ] Rate limiting on auth endpoints (5 attempts per minute)
- [ ] Password hashing with bcryptjs (cost: 12+)
- [ ] JWT tokens have reasonable expiry (15-30 min)
- [ ] Refresh tokens rotated on use
- [ ] Audit logging on all sensitive operations
- [ ] PII encryption at rest (passwords, emails)
- [ ] Secure headers (X-Frame-Options, X-Content-Type-Options, CSP)
- [ ] No sensitive data in logs
- [ ] Environment variables never in code
- [ ] Secrets rotation policy defined
- [ ] Session timeout implemented
- [ ] Concurrent session limits (e.g., max 3 per admin)

---

## 11. TESTING STRATEGY

### 11.1 Unit Tests

```typescript
// Example: Booking lock/unlock logic
describe('Booking Lock Management', () => {
  it('should lock a slot for 5 minutes', async () => {
    const booking = await initiateBooking(courtId, adminId, date, time);
    expect(booking.locked_by_admin_id).toBe(adminId);
    expect(booking.lock_expires_at).toBeDefined();
  });

  it('should prevent booking lock from expiring', async () => {
    jest.useFakeTimers();
    const booking = await initiateBooking(courtId, adminId, date, time);
    
    jest.advanceTimersByTime(6 * 60 * 1000); // 6 minutes
    
    await expect(confirmBooking(booking.id, data, adminId))
      .rejects
      .toThrow('Lock expired');
  });

  it('should prevent concurrent bookings', async () => {
    const booking = await initiateBooking(courtId, admin1, date, time);
    
    await expect(initiateBooking(courtId, admin2, date, time))
      .rejects
      .toThrow('Slot already locked');
  });
});
```

### 11.2 Load Testing

```bash
# Using Apache JMeter or k6
# Simulate 50 concurrent admins booking simultaneously
k6 run load-test.js --vus 50 --duration 2m
```

---

## 12. RECOMMENDATIONS & NEXT STEPS

### Immediate Actions:
1. **Use PostgreSQL** over SQLite for production (better concurrency handling)
2. **Implement token rotation** in refresh token flow
3. **Add rate limiting** on all auth endpoints
4. **Setup audit logging** for all booking operations
5. **Use HTTPS everywhere** (not just prod)

### Phase 2 Features:
1. Payment gateway integration (Stripe/2Checkout UAE)
2. Email/SMS notifications (SendGrid/Twilio)
3. Analytics dashboard (ChartJS/Recharts)
4. Advanced reporting (CSV export)
5. Bulk booking import

### Monitoring & Observability:
1. Sentry for error tracking
2. Datadog/New Relic for performance monitoring
3. Structured logging (Winston/Pino)
4. Uptime monitoring (UptimeRobot)

---

## 13. TECHNOLOGY COMPARISON

| Aspect | Your Plan | Alternative | Notes |
|--------|-----------|-------------|-------|
| Database | PostgreSQL | SQLite | PG better for concurrency |
| Backend | Express/Fastify | NestJS | Express lighter, NestJS more structured |
| Frontend | React | Vue.js | React has better ecosystem |
| PWA | Workbox | Preact | Workbox is standard |
| WebSocket | Socket.IO | Native WS | Socket.IO has auto-reconnect |
| Auth | JWT + Refresh | OAuth2 | JWT sufficient for internal tool |
| Deployment | Railway | Heroku | Railway cheaper, better DX |

---

## CONCLUSION

This architecture provides:
✅ **Security**: Multi-layer auth, RBAC, audit logging  
✅ **Scalability**: Optimistic locking, caching, indexed queries  
✅ **Real-time**: WebSocket + fallback polling  
✅ **Reliability**: Transaction safety, offline support, error handling  
✅ **Maintainability**: Clean separation of concerns, TypeScript, modular design  
✅ **Deployment**: Serverless-ready, lightweight, minimal dependencies  

**Estimated Development Timeline:**
- Auth & Security: 1 week
- Core Booking Engine: 2 weeks
- Real-time Sync: 1 week
- Payment Integration: 1 week
- Testing & Deployment: 1 week
- **Total: 6-8 weeks with 1 full-stack developer**

---

**Document Version:** 1.0  
**Last Updated:** September 25, 2026  
**Maintainer:** S (Project Owner)
