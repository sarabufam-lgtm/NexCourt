# Court Booking PWA - LLM Prompts & Backend Code Samples

---

## SECTION 1: INDUSTRY-GRADE LLM PROMPTS

### 1.1 Booking Confirmation Email Generator

**Use Case:** Auto-generate professional booking confirmation emails

```
SYSTEM PROMPT:
You are an expert email copywriter for a sports facility booking system in UAE.
Your emails are professional, clear, and customer-focused.
Always include all provided details and follow UAE business conventions.
Tone: Friendly professional
Language: English (UAE English)

USER PROMPT TEMPLATE:
Generate a booking confirmation email for the following reservation:

**Booking Details:**
- Facility Name: Al Nahda Boys School Sports Complex
- Customer Name: {customerName}
- Contact Phone: {phoneNumber}
- Contact Email: {emailAddress}
- Court Type: {courtType} (Badminton/Basketball/Cricket/Pickleball)
- Court Number: {courtNumber}
- Booking Date: {bookingDate} ({dayOfWeek})
- Time Slot: {startTime} to {endTime} (Local Time - GST)
- Duration: {duration} hours
- Booking Type: {bookingType} (One-Time/Long-Term)
- Total Amount: AED {amount}
- Payment Status: {paymentStatus}
- Confirmation ID: {confirmationId}
- Booking Reference: {bookingRef}

**Email Requirements:**
1. Subject line that includes booking reference
2. Personalized greeting
3. Complete booking summary in a clear table format
4. Cancellation policy: "Cancellations must be made 24 hours in advance for full refund"
5. Rescheduling instructions
6. Facility directions and parking info
7. Contact person and support hours
8. Payment receipt info (if paid)
9. Professional closing with signature

**Important Notes:**
- Include facility policies clearly
- Add WhatsApp contact as alternative
- Mention that confirmation is only after payment
- Include QR code hint for booking management portal

Output: Ready-to-send HTML email content (no wrapper tags)
```

### 1.2 Payment Reminder Generator

```
SYSTEM PROMPT:
You are a payment collection specialist for a sports facility management system.
Generate courteous but firm payment reminders in multiple formats.
Maintain professional relationships while ensuring payment compliance.
Timezone: UAE (GST/GMT+4)

USER PROMPT TEMPLATE:
Create payment reminder messages for pending reservation:

**Payment Details:**
- Customer Name: {customerName}
- Booking Reference: {bookingRef}
- Outstanding Amount: AED {amount}
- Original Booking Date: {bookingDate}
- Time Slot: {timeSlot}
- Court: {courtType} #{courtNumber}
- Days Until Payment Deadline: {daysUntilDeadline}
- Previous Reminder Count: {reminderCount}

**Generate:**
1. **SMS Version** (Max 160 characters, one message)
   - Urgent but polite
   - Include booking ref
   - Include payment deadline
   - Add WhatsApp link if possible
   
2. **Email Version** (Professional)
   - Subject line
   - Explanation of overdue payment
   - Available payment methods (Bank Transfer, Card, Cash)
   - Payment details/instructions
   - Consequences of non-payment (cancellation after X days)
   - Contact support option
   
3. **WhatsApp Version** (Conversational, emoji-friendly)
   - Informal but professional
   - Quick facts
   - Payment options as buttons
   - Call-to-action

**Context:**
- If reminderCount > 2, add "Final Notice" tone
- Include escalation statement for 4+ reminders
- Provide payment plan option if applicable

Output: Three separate messages optimized for each channel
```

### 1.3 Daily Operations Report Generator

```
SYSTEM PROMPT:
You are a data analyst for a sports facility management system.
Generate executive summaries of daily operations based on provided metrics.
Focus on actionable insights and trends.
Use clear, concise business language.

USER PROMPT TEMPLATE:
Create a daily operations report based on this data:

**Date:** {date}

**Occupancy Metrics:**
- Total Bookings: {totalBookings}
- Successful Completions: {completedBookings}
- Cancellations: {cancelCount}
- No-Shows: {noShowCount}
- Occupancy Rate: {occupancyPercentage}%

**Revenue Data:**
- Total Revenue (Confirmed): AED {totalRevenue}
- Pending Payments: AED {pendingPayments}
- Collection Rate: {collectionPercentage}%
- Average Booking Value: AED {avgBookingValue}

**Hourly Performance:**
- Peak Hour: {peakHour} ({peakHourBookings} bookings)
- Slowest Hour: {slowHour} ({slowHourBookings} bookings)
- Off-Peak Hours: {offPeakHours}

**Court Performance:**
- Most Booked: {courtType1} ({count1} bookings)
- Least Booked: {courtType2} ({count2} bookings)
- Average Utilization: {utilPercentage}%

**Recurring Issues:**
- {issue1}: {frequency}
- {issue2}: {frequency}
- {issue3}: {frequency}

**Generate Report With:**
1. Executive Summary (2-3 sentences highlighting performance)
2. Key Metrics Table (formatted for presentation)
3. Performance Insights
   - Trend analysis (up/down from yesterday/last week)
   - Peak hour analysis
   - Cancellation rate analysis
4. Recommendations
   - Pricing adjustments
   - Marketing focus
   - Operational improvements
   - Risk mitigation

Output: Markdown formatted report with clear sections
```

### 1.4 Booking Dispute Resolution Prompt

```
SYSTEM PROMPT:
You are a customer service specialist handling booking disputes.
Analyze the situation objectively and provide fair resolutions.
Maintain facility profitability while ensuring customer satisfaction.
Reference company policies when applicable.

USER PROMPT TEMPLATE:
Resolve this booking dispute:

**Dispute Details:**
- Booking Reference: {bookingRef}
- Customer: {customerName}
- Dispute Type: {type} (Late Cancellation/No-Show/Overbooking/Quality Issue/Other)
- Booking Date: {bookingDate}
- Time: {timeSlot}
- Amount: AED {amount}
- Date Reported: {dateReported}
- Days Since Booking: {daysSince}

**Customer Claim:**
{customerStatement}

**Facility Response:**
{facilityStatement}

**Relevant Policy:**
- Cancellation Window: 24 hours
- No-Show Policy: No refund, credit issued
- Refund Window: 7 days
- Overbooking Compensation: {compensationPolicy}

**Customer History:**
- Total Bookings: {totalBookings}
- Cancellation Rate: {cancellationRate}%
- Previous Disputes: {disputeCount}
- Loyalty Status: {loyaltyStatus}

**Provide:**
1. **Analysis** - What likely happened (objective assessment)
2. **Policy Application** - How company policy applies
3. **Recommended Resolution** - Fair outcome with justification
4. **Response Template** - Professional email to send customer
5. **Follow-up Actions** - How to prevent similar issues

Output: Structured resolution document with implementation steps
```

### 1.5 Promotional Campaign Generator

```
SYSTEM PROMPT:
You are a marketing manager for a premium sports facility in UAE.
Create targeted promotional campaigns that drive booking volume while maintaining premium positioning.
Consider local UAE holidays and sporting seasons.
Tone: Professional yet engaging

USER PROMPT TEMPLATE:
Create a promotional campaign for increased court utilization:

**Campaign Context:**
- Target Period: {startDate} to {endDate}
- Target Audience: {audience} (Corporate/Families/Students/Athletes)
- Objective: {objective} (Increase Occupancy/Off-Peak Usage/New Customers/Loyalty)
- Budget: AED {budget}
- Current Occupancy: {currentOccupancy}%
- Target Occupancy: {targetOccupancy}%

**Court Availability to Promote:**
- Underutilized Court Type: {courtType}
- Underutilized Time Slots: {timeSlots}
- Discount Available: {discountPercentage}%

**Market Conditions:**
- Upcoming Events: {events}
- Competing Facilities: {competitors}
- Customer Feedback: {feedback}

**Campaign Should Include:**
1. **Campaign Theme** - Catchy name and tagline
2. **Messages for Each Channel:**
   - WhatsApp (Promotional, time-limited urgency)
   - Email (Detailed value proposition)
   - Social Media (Engaging, visual-friendly)
   - SMS (Concise call-to-action)
3. **Promotional Strategy:**
   - Tiered discount structure
   - Bundle offers (e.g., 5-session package)
   - Referral incentives
   - Corporate group rates
4. **Success Metrics** - KPIs to track campaign effectiveness
5. **Timeline** - Phased rollout plan

Output: Complete campaign blueprint with all messaging variants
```

---

## SECTION 2: BACKEND CODE SAMPLES

### 2.1 Authentication Service (auth.service.ts)

```typescript
// auth.service.ts - Production-ready authentication service
import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import { prisma } from './prisma';
import { generateRandomToken } from './utils/crypto';

export interface AdminLoginPayload {
  email: string;
  password: string;
  deviceInfo?: {
    userAgent: string;
    ip: string;
    timestamp: Date;
  };
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  admin: {
    id: string;
    email: string;
    fullName: string;
    role: string;
  };
  expiresIn: number;
}

class AuthService {
  private accessTokenExpiry = '15m';
  private refreshTokenExpiry = '7d';
  private passwordCost = 12;

  /**
   * Hash password using bcryptjs
   */
  async hashPassword(password: string): Promise<string> {
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }
    const salt = await bcryptjs.genSalt(this.passwordCost);
    return bcryptjs.hash(password, salt);
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcryptjs.compare(password, hash);
  }

  /**
   * Login admin and create session
   */
  async login(payload: AdminLoginPayload): Promise<AuthResponse> {
    // Find admin by email
    const admin = await prisma.admins.findUnique({
      where: { email: payload.email.toLowerCase() }
    });

    if (!admin) {
      // Log failed attempt for security audit
      await this.logFailedLoginAttempt(payload.email, payload.deviceInfo);
      throw new Error('Invalid email or password');
    }

    if (!admin.isActive) {
      throw new Error('Account is inactive. Contact administrator.');
    }

    // Verify password
    const passwordValid = await this.verifyPassword(
      payload.password,
      admin.passwordHash
    );

    if (!passwordValid) {
      await this.logFailedLoginAttempt(payload.email, payload.deviceInfo);
      throw new Error('Invalid email or password');
    }

    // Check for suspicious activity (rate limiting)
    const recentFailedAttempts = await prisma.loginAuditLog.count({
      where: {
        email: payload.email,
        success: false,
        timestamp: {
          gte: new Date(Date.now() - 15 * 60 * 1000) // Last 15 min
        }
      }
    });

    if (recentFailedAttempts >= 5) {
      throw new Error('Account temporarily locked. Try again in 15 minutes.');
    }

    // Create session
    const sessionId = generateRandomToken();
    const refreshTokenPlain = generateRandomToken();
    const refreshTokenHash = await this.hashPassword(refreshTokenPlain);

    const session = await prisma.sessions.create({
      data: {
        id: sessionId,
        adminId: admin.id,
        refreshTokenHash,
        deviceInfo: payload.deviceInfo || {},
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        isActive: true
      }
    });

    // Generate tokens
    const accessToken = this.generateAccessToken(admin, sessionId);
    const refreshToken = this.generateRefreshToken(
      admin,
      sessionId,
      refreshTokenPlain
    );

    // Update last login
    await prisma.admins.update({
      where: { id: admin.id },
      data: { lastLogin: new Date() }
    });

    // Log successful login
    await this.logSuccessfulLogin(admin.id, payload.deviceInfo);

    return {
      accessToken,
      refreshToken,
      admin: {
        id: admin.id,
        email: admin.email,
        fullName: admin.fullName,
        role: admin.role
      },
      expiresIn: 15 * 60 // 15 minutes in seconds
    };
  }

  /**
   * Generate access token (short-lived JWT)
   */
  private generateAccessToken(admin: any, sessionId: string): string {
    const payload = {
      sub: admin.id,
      email: admin.email,
      role: admin.role,
      permissions: this.getPermissionsForRole(admin.role),
      sessionId,
      iat: Math.floor(Date.now() / 1000)
    };

    return jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: this.accessTokenExpiry,
      algorithm: 'HS256'
    });
  }

  /**
   * Generate refresh token
   */
  private generateRefreshToken(
    admin: any,
    sessionId: string,
    refreshTokenPlain: string
  ): string {
    const payload = {
      sub: admin.id,
      sessionId,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000)
    };

    // For sending to client - we return plain token but store hash
    const token = jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
      expiresIn: this.refreshTokenExpiry,
      algorithm: 'HS256'
    });

    return token;
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(
    refreshToken: string,
    refreshTokenFromDb: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET!
      ) as any;

      // Verify session exists and is active
      const session = await prisma.sessions.findUnique({
        where: { id: decoded.sessionId }
      });

      if (!session || !session.isActive) {
        throw new Error('Session invalid or expired');
      }

      if (new Date() > session.expiresAt) {
        throw new Error('Session expired');
      }

      // Verify refresh token hash matches
      const tokenValid = await this.verifyPassword(
        refreshToken,
        refreshTokenFromDb
      );
      if (!tokenValid) {
        throw new Error('Invalid refresh token');
      }

      // Get admin details
      const admin = await prisma.admins.findUnique({
        where: { id: decoded.sub }
      });

      if (!admin || !admin.isActive) {
        throw new Error('Admin not found or inactive');
      }

      // Generate new tokens (token rotation)
      const newSessionId = generateRandomToken();
      const newRefreshTokenPlain = generateRandomToken();
      const newRefreshTokenHash = await this.hashPassword(
        newRefreshTokenPlain
      );

      // Update session (rotate refresh token)
      await prisma.sessions.update({
        where: { id: session.id },
        data: {
          refreshTokenHash: newRefreshTokenHash,
          id: newSessionId // Rotate session ID
        }
      });

      const newAccessToken = this.generateAccessToken(admin, newSessionId);
      const newRefreshToken = this.generateRefreshToken(
        admin,
        newSessionId,
        newRefreshTokenPlain
      );

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      };
    } catch (error) {
      throw new Error('Failed to refresh token: ' + error.message);
    }
  }

  /**
   * Logout and invalidate session
   */
  async logout(sessionId: string): Promise<void> {
    await prisma.sessions.update(
      { where: { id: sessionId } },
      { data: { isActive: false } }
    );
  }

  /**
   * Get permissions for role
   */
  private getPermissionsForRole(role: string): string[] {
    const rolePermissionMap: Record<string, string[]> = {
      super_admin: ['*'],
      booking_admin: [
        'bookings:create',
        'bookings:read',
        'bookings:update',
        'bookings:cancel'
      ],
      finance_admin: ['payments:read', 'payments:update', 'financial:read'],
      view_only: ['bookings:read', 'financial:read']
    };

    return rolePermissionMap[role] || [];
  }

  /**
   * Log failed login attempt
   */
  private async logFailedLoginAttempt(
    email: string,
    deviceInfo?: any
  ): Promise<void> {
    await prisma.loginAuditLog.create({
      data: {
        email,
        success: false,
        deviceInfo,
        timestamp: new Date()
      }
    });
  }

  /**
   * Log successful login
   */
  private async logSuccessfulLogin(
    adminId: string,
    deviceInfo?: any
  ): Promise<void> {
    await prisma.loginAuditLog.create({
      data: {
        adminId,
        success: true,
        deviceInfo,
        timestamp: new Date()
      }
    });
  }
}

export default new AuthService();
```

### 2.2 Booking Concurrency Manager (booking.service.ts)

```typescript
// booking.service.ts - Handles concurrent booking with optimistic locking
import { prisma } from './prisma';

export interface InitiateBookingPayload {
  courtId: string;
  bookingDate: Date;
  startTime: string;
  endTime: string;
  adminId: string;
}

export interface ConfirmBookingPayload {
  bookingId: string;
  contactName: string;
  contactPhone: string;
  contactEmail?: string;
  paymentMade: boolean;
  rate: number;
  adminId: string;
}

class BookingService {
  private lockTimeoutMinutes = 5;
  private maxConcurrentBookings = 5;

  /**
   * Initiate booking - Creates lock for slot
   */
  async initiateBooking(payload: InitiateBookingPayload) {
    const lockExpiresAt = new Date(
      Date.now() + this.lockTimeoutMinutes * 60 * 1000
    );

    try {
      // Atomically check if slot is available and create booking with lock
      const booking = await prisma.bookings.create({
        data: {
          courtId: payload.courtId,
          bookingDate: payload.bookingDate,
          startTime: payload.startTime,
          endTime: payload.endTime,
          bookingType: 'one_time',
          statusId: 5, // UNDER_BOOKING
          lockedByAdminId: payload.adminId,
          lockExpiresAt,
          version: 1,
          createdByAdminId: payload.adminId,
          amountDue: 0 // Will be calculated on confirm
        },
        select: {
          id: true,
          courtId: true,
          bookingDate: true,
          lockExpiresAt: true
        }
      });

      return {
        bookingId: booking.id,
        lockExpiresAt: booking.lockExpiresAt,
        message: 'Booking slot locked. Complete booking within 5 minutes.'
      };
    } catch (error) {
      // Unique constraint violation means slot already locked/booked
      if (error.code === 'P2002') {
        throw new Error('Slot already locked or booked by another admin');
      }
      throw error;
    }
  }

  /**
   * Confirm booking - Save booking details with version check (optimistic locking)
   */
  async confirmBooking(payload: ConfirmBookingPayload) {
    // Fetch current booking state
    const currentBooking = await prisma.bookings.findUnique({
      where: { id: payload.bookingId }
    });

    if (!currentBooking) {
      throw new Error('Booking not found');
    }

    // Verify lock ownership and expiry
    if (currentBooking.lockedByAdminId !== payload.adminId) {
      throw new Error('You do not have the lock for this booking');
    }

    if (new Date() > currentBooking.lockExpiresAt!) {
      // Release expired lock
      await prisma.bookings.update(
        { where: { id: payload.bookingId } },
        {
          lockedByAdminId: null,
          lockExpiresAt: null,
          statusId: 1 // PENDING
        }
      );
      throw new Error('Booking lock expired. Please try again.');
    }

    // Atomically update with version check (optimistic locking)
    try {
      const updated = await prisma.bookings.update(
        {
          where: {
            id: payload.bookingId,
            version: currentBooking.version // Only update if version matches
          }
        },
        {
          contactName: payload.contactName,
          contactPhone: payload.contactPhone,
          contactEmail: payload.contactEmail,
          paymentMade: payload.paymentMade,
          amountDue: payload.rate,
          statusId: 2, // CONFIRMED
          lockedByAdminId: null,
          lockExpiresAt: null,
          version: currentBooking.version + 1,
          updatedAt: new Date()
        }
      );

      // Log booking confirmation
      await this.logBookingActivity(
        payload.bookingId,
        payload.adminId,
        'confirmed',
        null,
        updated
      );

      return updated;
    } catch (error) {
      // Version mismatch - concurrent modification detected
      throw new Error('Booking was modified. Please refresh and try again.');
    }
  }

  /**
   * Cancel booking with refund processing
   */
  async cancelBooking(bookingId: string, adminId: string, reason?: string) {
    const booking = await prisma.bookings.findUnique({
      where: { id: bookingId }
    });

    if (!booking) {
      throw new Error('Booking not found');
    }

    // Calculate refund based on cancellation timing
    const hoursUntilBooking = this.calculateHoursUntilBooking(
      booking.bookingDate,
      booking.startTime
    );

    let refundAmount = booking.amountDue;
    if (hoursUntilBooking < 24) {
      refundAmount = 0; // No refund within 24 hours
    } else if (hoursUntilBooking < 48) {
      refundAmount = booking.amountDue * 0.5; // 50% refund
    }

    // Update booking status
    const cancelled = await prisma.bookings.update(
      { where: { id: bookingId } },
      {
        statusId: 3, // CANCELLED
        version: booking.version + 1,
        updatedAt: new Date()
      }
    );

    // Record cancellation
    await prisma.cancellations.create({
      data: {
        bookingId,
        cancelledByAdminId: adminId,
        cancellationReason: reason || 'No reason provided',
        refundAmount,
        refundProcessed: false
      }
    });

    // Log activity
    await this.logBookingActivity(
      bookingId,
      adminId,
      'cancelled',
      booking,
      cancelled
    );

    return {
      bookingId,
      refundAmount,
      message: `Booking cancelled. Refund: AED ${refundAmount}`
    };
  }

  /**
   * Get availability for a specific date and court type
   */
  async getAvailability(courtType: string, bookingDate: Date) {
    // Fetch all courts of this type
    const courts = await prisma.courts.findMany({
      where: {
        courtType: { name: courtType },
        isActive: true
      }
    });

    // Fetch booked/locked slots for the date
    const bookedSlots = await prisma.bookings.findMany({
      where: {
        bookingDate,
        statusId: { in: [2, 5] }, // CONFIRMED or UNDER_BOOKING
        courtId: { in: courts.map((c) => c.id) }
      },
      select: {
        courtId: true,
        startTime: true,
        endTime: true,
        lockedByAdminId: true,
        lockExpiresAt: true,
        statusId: true
      }
    });

    // Generate availability grid
    const dayOfWeek = bookingDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const timeSlots = this.generateTimeSlots(isWeekend);
    const availability = courts.map((court) => ({
      courtId: court.id,
      courtNumber: court.courtNumber,
      slots: timeSlots.map((slot) => {
        const isBooked = bookedSlots.some(
          (b) =>
            b.courtId === court.id &&
            this.slotOverlaps(slot.start, slot.end, b.startTime, b.endTime)
        );

        const bookedSlot = bookedSlots.find(
          (b) =>
            b.courtId === court.id &&
            this.slotOverlaps(slot.start, slot.end, b.startTime, b.endTime)
        );

        return {
          ...slot,
          isAvailable: !isBooked,
          isLocked: bookedSlot?.statusId === 5 ? true : false,
          lockedBy: bookedSlot?.lockedByAdminId,
          locksExpiresIn: bookedSlot?.lockExpiresAt
            ? Math.floor(
                (bookedSlot.lockExpiresAt.getTime() - Date.now()) / 1000
              )
            : null
        };
      })
    }));

    return availability;
  }

  /**
   * Generate time slots based on day type
   */
  private generateTimeSlots(isWeekend: boolean) {
    const slots = [];

    if (isWeekend) {
      // Weekends: 8 AM to 11 PM
      for (let hour = 8; hour < 23; hour++) {
        slots.push({
          start: `${String(hour).padStart(2, '0')}:00`,
          end: `${String(hour + 1).padStart(2, '0')}:00`,
          label: `${hour}:00 - ${hour + 1}:00`
        });
      }
    } else {
      // Weekdays: 4 PM to 11 PM
      for (let hour = 16; hour < 23; hour++) {
        slots.push({
          start: `${String(hour).padStart(2, '0')}:00`,
          end: `${String(hour + 1).padStart(2, '0')}:00`,
          label: `${hour}:00 - ${hour + 1}:00`
        });
      }
    }

    return slots;
  }

  /**
   * Check if two time slots overlap
   */
  private slotOverlaps(
    start1: string,
    end1: string,
    start2: string,
    end2: string
  ): boolean {
    return start1 < end2 && end1 > start2;
  }

  /**
   * Calculate hours until booking starts
   */
  private calculateHoursUntilBooking(bookingDate: Date, startTime: string) {
    const bookingDateTime = new Date(bookingDate);
    const [hours, minutes] = startTime.split(':').map(Number);
    bookingDateTime.setHours(hours, minutes, 0, 0);

    return (bookingDateTime.getTime() - Date.now()) / (1000 * 60 * 60);
  }

  /**
   * Log booking activity for audit trail
   */
  private async logBookingActivity(
    bookingId: string,
    adminId: string,
    action: string,
    oldValues: any,
    newValues: any
  ) {
    await prisma.bookingAuditLog.create({
      data: {
        bookingId,
        adminId,
        action,
        oldValues,
        newValues,
        timestamp: new Date()
      }
    });
  }
}

export default new BookingService();
```

### 2.3 Express Middleware Setup (middleware.ts)

```typescript
// middleware.ts - Security and authentication middleware
import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';

declare global {
  namespace Express {
    interface Request {
      admin?: {
        id: string;
        email: string;
        role: string;
        permissions: string[];
        sessionId: string;
      };
    }
  }
}

// 1. Security Headers
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'", process.env.FRONTEND_URL]
    }
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
  noSniff: true,
  xssFilter: true,
  frameguard: { action: 'deny' }
});

// 2. CORS Configuration
export const corsConfig = cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400
});

// 3. Rate Limiting
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method !== 'POST' || !req.path.includes('/auth/login')
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false
});

// 4. Authentication Middleware
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No authentication token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    // Verify session is still active
    // (In production, check against DB to detect logout)
    req.admin = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions,
      sessionId: decoded.sessionId
    };

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// 5. Authorization Middleware
export const requirePermission = (requiredPermission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.admin) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (
      req.admin.permissions.includes('*') ||
      req.admin.permissions.includes(requiredPermission)
    ) {
      next();
    } else {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: requiredPermission
      });
    }
  };
};

// 6. Error Handling Middleware
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', err);

  // Don't leak error details in production
  const message =
    process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message;

  res.status(err.status || 500).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
};

// 7. Request Logging Middleware
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      admin: req.admin?.email || 'anonymous',
      timestamp: new Date().toISOString()
    });
  });

  next();
};

// 8. Validation Middleware (example)
export const validateRequest = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (error: any) {
      res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }
  };
};
```

### 2.4 WebSocket Real-time Updates (socket.service.ts)

```typescript
// socket.service.ts - WebSocket server setup for real-time booking updates
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma';

export class SocketService {
  private io: Server;

  constructor(httpServer: any) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL,
        credentials: true
      },
      transports: ['websocket', 'polling'],
      pingInterval: 25000,
      pingTimeout: 60000
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  /**
   * Setup socket authentication
   */
  private setupMiddleware() {
    this.io.use(async (socket: any, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication error'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

        socket.adminId = decoded.sub;
        socket.adminEmail = decoded.email;
        socket.role = decoded.role;
        socket.permissions = decoded.permissions;

        next();
      } catch (error) {
        next(new Error('Invalid token'));
      }
    });
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers() {
    this.io.on('connection', (socket: Socket) => {
      console.log(
        `Admin ${socket.data?.adminEmail} connected: ${socket.id}`
      );

      /**
       * Subscribe to booking updates for a specific date
       */
      socket.on('subscribe:date', (date: string) => {
        const room = `bookings:${date}`;
        socket.join(room);
        console.log(
          `${socket.data?.adminEmail} joined room ${room}`
        );

        socket.emit('subscribed', {
          date,
          message: `Subscribed to bookings for ${date}`
        });
      });

      /**
       * Notify other admins when booking is locked
       */
      socket.on('booking:lock', (data: any) => {
        const room = `bookings:${data.date}`;

        this.io.to(room).emit('booking:locked', {
          courtId: data.courtId,
          slot: `${data.startTime}-${data.endTime}`,
          lockedBy: socket.data?.adminEmail,
          lockedAt: new Date(),
          expiresIn: 300, // seconds
          lockId: data.lockId
        });

        console.log(
          `Booking locked by ${socket.data?.adminEmail}: ${data.courtId} at ${data.startTime}`
        );
      });

      /**
       * Notify when booking is confirmed
       */
      socket.on('booking:confirm', (data: any) => {
        const room = `bookings:${data.date}`;

        this.io.to(room).emit('booking:confirmed', {
          courtId: data.courtId,
          slot: `${data.startTime}-${data.endTime}`,
          confirmedBy: socket.data?.adminEmail,
          customerName: data.customerName,
          paymentStatus: data.paymentMade ? 'PAID' : 'PENDING',
          timestamp: new Date()
        });

        console.log(
          `Booking confirmed by ${socket.data?.adminEmail}: ${data.courtId}`
        );
      });

      /**
       * Release lock when admin closes booking form
       */
      socket.on('booking:unlock', (data: any) => {
        const room = `bookings:${data.date}`;

        this.io.to(room).emit('booking:unlocked', {
          courtId: data.courtId,
          slot: `${data.startTime}-${data.endTime}`,
          unlockedBy: socket.data?.adminEmail,
          reason: data.reason || 'Booking cancelled'
        });
      });

      /**
       * Subscribe to payment updates
       */
      socket.on('subscribe:payments', () => {
        socket.join('payments');
        socket.emit('subscribed_payments', { message: 'Subscribed to payments' });
      });

      /**
       * Notify when payment is received
       */
      socket.on('payment:received', (data: any) => {
        this.io.to('payments').emit('payment:processed', {
          bookingId: data.bookingId,
          amount: data.amount,
          method: data.method,
          processedBy: socket.data?.adminEmail,
          timestamp: new Date()
        });
      });

      /**
       * Handle disconnection
       */
      socket.on('disconnect', () => {
        console.log(
          `Admin ${socket.data?.adminEmail} disconnected: ${socket.id}`
        );
      });

      /**
       * Handle errors
       */
      socket.on('error', (error: any) => {
        console.error(
          `Socket error for ${socket.data?.adminEmail}:`,
          error
        );
      });
    });
  }

  /**
   * Broadcast real-time occupancy update
   */
  public broadcastOccupancyUpdate(date: string, occupancyData: any) {
    this.io.to(`bookings:${date}`).emit('occupancy:updated', {
      date,
      data: occupancyData,
      timestamp: new Date()
    });
  }

  /**
   * Notify admins of system alerts
   */
  public broadcastAlert(alertType: string, message: string, severity: 'info' | 'warning' | 'error') {
    this.io.emit('system:alert', {
      type: alertType,
      message,
      severity,
      timestamp: new Date()
    });
  }

  /**
   * Get active connections count
   */
  public getActiveConnections(): number {
    return this.io.engine.clientsCount;
  }
}
```

---

## SECTION 3: DATABASE MIGRATION SCRIPT (Prisma)

```prisma
// schema.prisma - Database schema
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Admins {
  id           String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  email        String    @unique
  passwordHash String
  fullName     String
  role         String    // super_admin, booking_admin, finance_admin, view_only
  isActive     Boolean   @default(true)
  lastLogin    DateTime?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  sessions       Sessions[]
  bookings       Bookings[]
  cancellations  Cancellations[]
  auditLogs      BookingAuditLog[]
  loginLogs      LoginAuditLog[]

  @@index([email])
  @@index([role])
}

model Sessions {
  id                String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  adminId           String    @db.Uuid
  refreshTokenHash  String
  isActive          Boolean   @default(true)
  deviceInfo        Json?
  expiresAt         DateTime
  createdAt         DateTime  @default(now())

  admin Admins @relation(fields: [adminId], references: [id], onDelete: Cascade)

  @@index([adminId])
  @@index([expiresAt])
}

model CourtTypes {
  id   String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name String @unique // Badminton, Basketball, Cricket, Pickleball

  courts Courts[]

  @@index([name])
}

model Courts {
  id           String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  courtNumber  Int
  courtTypeId  String @db.Uuid
  isActive     Boolean @default(true)
  createdAt    DateTime @default(now())

  courtType   CourtTypes @relation(fields: [courtTypeId], references: [id])
  bookings    Bookings[]

  @@unique([courtNumber, courtTypeId])
  @@index([courtTypeId])
}

model BookingStatuses {
  id   Int    @id
  name String @unique
  // 1=PENDING, 2=CONFIRMED, 3=CANCELLED, 4=COMPLETED, 5=UNDER_BOOKING
}

model Bookings {
  id                  String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  courtId             String    @db.Uuid
  bookingType         String    // one_time, long_term
  statusId            Int
  version             Int       @default(1) // Optimistic locking
  lockedByAdminId     String?   @db.Uuid
  lockExpiresAt       DateTime?

  // Booking Details
  contactName         String
  contactPhone        String
  contactEmail        String?
  bookingDate         DateTime?
  startTime           String?
  endTime             String?

  // Long-term specific
  recurringPattern    Json?
  longTermStartDate   DateTime?
  longTermEndDate     DateTime?

  // Payment
  amountDue           Decimal   @db.Decimal(10, 2)
  paymentMade         Boolean   @default(false)
  paymentMethod       String?   // cash, card, bank_transfer
  paymentDate         DateTime?
  transactionId       String?

  createdByAdminId    String    @db.Uuid
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  court              Courts           @relation(fields: [courtId], references: [id])
  createdByAdmin     Admins           @relation(fields: [createdByAdminId], references: [id])
  locks              BookingLocks[]
  cancellation       Cancellations?
  auditLogs          BookingAuditLog[]

  @@index([courtId, bookingDate])
  @@index([statusId])
  @@index([lockExpiresAt])
  @@index([createdByAdminId])
}

model BookingLocks {
  id          String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  bookingId   String    @db.Uuid
  adminId     String    @db.Uuid
  lockedAt    DateTime  @default(now())
  unlockedAt  DateTime?
  action      String    // locked, unlocked, timeout

  booking Bookings @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  admin   Admins   @relation(fields: [adminId], references: [id])

  @@index([bookingId])
}

model Cancellations {
  id                   String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  bookingId            String    @unique @db.Uuid
  cancelledByAdminId   String    @db.Uuid
  cancellationReason   String?
  refundAmount         Decimal   @db.Decimal(10, 2)
  refundProcessed      Boolean   @default(false)
  createdAt            DateTime  @default(now())

  booking             Bookings @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  cancelledByAdmin    Admins   @relation(fields: [cancelledByAdminId], references: [id])

  @@index([bookingId])
}

model BookingAuditLog {
  id          String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  bookingId   String    @db.Uuid
  adminId     String?   @db.Uuid
  action      String    // created, updated, cancelled, confirmed
  oldValues   Json?
  newValues   Json?
  timestamp   DateTime  @default(now())
  ipAddress   String?

  booking Bookings @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  admin   Admins?  @relation(fields: [adminId], references: [id])

  @@index([bookingId])
  @@index([timestamp])
}

model LoginAuditLog {
  id        String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  adminId   String?   @db.Uuid
  email     String
  success   Boolean
  deviceInfo Json?
  timestamp DateTime  @default(now())

  admin Admins? @relation(fields: [adminId], references: [id])

  @@index([email])
  @@index([timestamp])
}

model Pricing {
  id            String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  courtTypeId   String    @db.Uuid
  dayType       String    // weekday, weekend
  startTime     String
  endTime       String
  ratePerHour   Decimal   @db.Decimal(10, 2)
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())

  @@unique([courtTypeId, dayType, startTime, endTime])
}
```

---

## SECTION 4: DEPLOYMENT CHECKLIST

- [ ] Generate strong JWT secrets (min 32 characters)
- [ ] Setup PostgreSQL connection with SSL
- [ ] Configure environment variables on Railway/Vercel
- [ ] Run database migrations (`prisma migrate deploy`)
- [ ] Setup monitoring and error tracking (Sentry)
- [ ] Configure automated backups
- [ ] Enable CORS only for specific domains
- [ ] Setup rate limiting on auth endpoints
- [ ] Enable HTTPS with strong TLS
- [ ] Test token refresh flow
- [ ] Test concurrent booking scenarios
- [ ] Setup logging and audit trail
- [ ] Create admin user and test login
- [ ] Test WebSocket connections
- [ ] Load test with concurrent users
- [ ] Security audit of all endpoints

---

**End of Technical Specification**
