import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting NexCourt database seed...');

  // 1. Seed Booking Statuses
  const statuses = [
    { id: 1, name: 'PENDING', description: 'Slot is open or booking initiated' },
    { id: 2, name: 'CONFIRMED', description: 'Booking confirmed and active' },
    { id: 3, name: 'CANCELLED', description: 'Booking cancelled' },
    { id: 4, name: 'COMPLETED', description: 'Session completed' },
    { id: 5, name: 'UNDER_BOOKING', description: 'Slot held by admin (5-min lock)' }
  ];

  for (const s of statuses) {
    await prisma.bookingStatuses.upsert({
      where: { id: s.id },
      update: { name: s.name, description: s.description },
      create: s
    });
  }
  console.log('✅ Booking statuses seeded.');

  // 2. Seed Default Facility
  const facility = await prisma.facility.upsert({
    where: { slug: 'al-nahda-sports-complex' },
    update: {},
    create: {
      name: 'Al Nahda Boys School Sports Complex',
      slug: 'al-nahda-sports-complex',
      address: 'Al Nahda 1, Dubai / Sharjah Border',
      city: 'Sharjah',
      country: 'UAE',
      currency: 'AED',
      timezone: 'Asia/Dubai',
      phone: '+971 6 525 0000',
      email: 'sports@alnahda.sch.ae'
    }
  });
  console.log(`✅ Facility seeded: ${facility.name}`);

  // 3. Seed Super Admin
  const salt = await bcryptjs.genSalt(12);
  const passwordHash = await bcryptjs.hash('Admin@123456', salt);

  const superAdmin = await prisma.admins.upsert({
    where: { email: 'admin@alnahda.ae' },
    update: { passwordHash, role: 'super_admin' },
    create: {
      facilityId: facility.id,
      email: 'admin@alnahda.ae',
      passwordHash,
      fullName: 'Head Administrator',
      role: 'super_admin',
      phone: '+971 50 123 4567'
    }
  });
  console.log(`✅ Super Admin seeded: ${superAdmin.email} (Password: Admin@123456)`);

  // 4. Seed Court Types and Courts
  const courtConfigs = [
    { name: 'Badminton', slug: 'badminton', count: 4, weekdayRate: 60, weekendRate: 80 },
    { name: 'Basketball', slug: 'basketball', count: 2, weekdayRate: 150, weekendRate: 200 },
    { name: 'Cricket', slug: 'cricket', count: 1, weekdayRate: 200, weekendRate: 250 },
    { name: 'Pickleball', slug: 'pickleball', count: 2, weekdayRate: 70, weekendRate: 90 }
  ];

  for (const config of courtConfigs) {
    const courtType = await prisma.courtTypes.upsert({
      where: {
        facilityId_name: {
          facilityId: facility.id,
          name: config.name
        }
      },
      update: {},
      create: {
        facilityId: facility.id,
        name: config.name,
        slug: config.slug,
        description: `Professional indoor ${config.name} facility`
      }
    });

    // Seed individual courts
    for (let i = 1; i <= config.count; i++) {
      await prisma.courts.upsert({
        where: {
          facilityId_courtTypeId_courtNumber: {
            facilityId: facility.id,
            courtTypeId: courtType.id,
            courtNumber: i
          }
        },
        update: {},
        create: {
          facilityId: facility.id,
          courtTypeId: courtType.id,
          courtNumber: i,
          name: `${config.name} Court ${i}`,
          isActive: true
        }
      });
    }

    // Seed Pricing
    await prisma.pricing.upsert({
      where: {
        facilityId_courtTypeId_dayType_startTime_endTime: {
          facilityId: facility.id,
          courtTypeId: courtType.id,
          dayType: 'weekday',
          startTime: '08:00',
          endTime: '23:00'
        }
      },
      update: { ratePerHour: config.weekdayRate },
      create: {
        facilityId: facility.id,
        courtTypeId: courtType.id,
        dayType: 'weekday',
        startTime: '08:00',
        endTime: '23:00',
        ratePerHour: config.weekdayRate
      }
    });

    await prisma.pricing.upsert({
      where: {
        facilityId_courtTypeId_dayType_startTime_endTime: {
          facilityId: facility.id,
          courtTypeId: courtType.id,
          dayType: 'weekend',
          startTime: '08:00',
          endTime: '23:00'
        }
      },
      update: { ratePerHour: config.weekendRate },
      create: {
        facilityId: facility.id,
        courtTypeId: courtType.id,
        dayType: 'weekend',
        startTime: '08:00',
        endTime: '23:00',
        ratePerHour: config.weekendRate
      }
    });
  }
  console.log('✅ Court types, courts, and pricing seeded.');
  console.log('🎉 Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
