import { prisma } from '../lib/prisma.js';

export interface UpsertCustomerInput {
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  facilityId?: string | null;
}

export class CustomerService {
  /**
   * Search customers sorted alphabetically by name
   * Supports partial name or phone number search
   */
  static async searchCustomers(params: {
    query?: string;
    facilityId?: string | null;
    limit?: number;
  }) {
    const q = params.query?.trim();

    return await prisma.customer.findMany({
      where: {
        ...(params.facilityId ? { facilityId: params.facilityId } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { phone: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } }
              ]
            }
          : {})
      },
      orderBy: {
        name: 'asc' // Always sorted alphabetically
      },
      take: params.limit || 50,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        notes: true,
        createdAt: true,
        _count: {
          select: { bookings: true }
        }
      }
    });
  }

  /**
   * Upsert a customer record: if customer with matching phone exists, reuse/update.
   * If new customer, create and return.
   */
  static async upsertCustomer(input: UpsertCustomerInput) {
    const cleanPhone = input.phone.trim();
    const cleanName = input.name.trim();

    // Check if customer with this phone number already exists in facility
    const existing = await prisma.customer.findFirst({
      where: {
        phone: cleanPhone,
        ...(input.facilityId ? { facilityId: input.facilityId } : {})
      }
    });

    if (existing) {
      // Update name/email if provided
      return await prisma.customer.update({
        where: { id: existing.id },
        data: {
          name: cleanName,
          email: input.email ? input.email.trim() : existing.email,
          notes: input.notes ? input.notes.trim() : existing.notes
        }
      });
    }

    // Create new customer
    return await prisma.customer.create({
      data: {
        facilityId: input.facilityId,
        name: cleanName,
        phone: cleanPhone,
        email: input.email ? input.email.trim() : null,
        notes: input.notes ? input.notes.trim() : null
      }
    });
  }

  /**
   * Get single customer by ID with recent bookings
   */
  static async getCustomerById(id: string) {
    return await prisma.customer.findUnique({
      where: { id },
      include: {
        bookings: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: { court: true }
        }
      }
    });
  }

  /**
   * Update customer name and details, cascading changes to all existing Bookings
   * so the corrected name immediately reflects everywhere in the system.
   */
  static async updateCustomer(
    id: string,
    data: { name: string; phone?: string; email?: string; notes?: string },
    facilityId?: string | null
  ) {
    const cleanName = data.name.trim();
    if (!cleanName) {
      throw new Error('Customer name cannot be empty');
    }

    const cleanPhone = data.phone?.trim();
    const cleanEmail = data.email !== undefined ? (data.email ? data.email.trim() : null) : undefined;
    const cleanNotes = data.notes !== undefined ? (data.notes ? data.notes.trim() : null) : undefined;

    let existing = await prisma.customer.findUnique({
      where: { id }
    });

    if (!existing && cleanPhone) {
      existing = await prisma.customer.findFirst({
        where: { phone: cleanPhone }
      });
    }

    if (!existing) {
      // Check if id is a bookingId
      const booking = await prisma.bookings.findUnique({
        where: { id }
      });
      if (booking) {
        if (booking.customerId) {
          existing = await prisma.customer.findUnique({
            where: { id: booking.customerId }
          });
        }
        if (!existing && (booking.contactPhone || cleanPhone)) {
          const p = cleanPhone || booking.contactPhone;
          existing = await prisma.customer.findFirst({
            where: { phone: p }
          });
          if (!existing) {
            existing = await prisma.customer.create({
              data: {
                name: cleanName,
                phone: p,
                facilityId
              }
            });
          }
        }
      }
    }

    if (!existing) {
      throw new Error('Customer not found');
    }

    const targetCustomerId = existing.id;

    return await prisma.$transaction(async (tx) => {
      // 1. Update customer profile
      const updatedCustomer = await tx.customer.update({
        where: { id: targetCustomerId },
        data: {
          name: cleanName,
          ...(cleanPhone ? { phone: cleanPhone } : {}),
          ...(cleanEmail !== undefined ? { email: cleanEmail } : {}),
          ...(cleanNotes !== undefined ? { notes: cleanNotes } : {})
        }
      });

      // 2. Cascade updated name to all single bookings and recurring series parent/child bookings
      const matchConditions: any[] = [{ customerId: id }];
      if (existing.phone) {
        matchConditions.push({ contactPhone: existing.phone });
      }

      await tx.bookings.updateMany({
        where: {
          OR: matchConditions
        },
        data: {
          contactName: cleanName,
          ...(cleanPhone ? { contactPhone: cleanPhone } : {}),
          ...(cleanEmail !== undefined ? { contactEmail: cleanEmail } : {})
        }
      });

      return updatedCustomer;
    });
  }
}

