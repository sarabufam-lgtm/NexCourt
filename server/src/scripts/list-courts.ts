import { prisma } from '../lib/prisma.js';

async function main() {
  const courts = await prisma.courts.findMany({
    where: { isActive: true },
    include: { courtType: true },
    orderBy: [{ courtTypeId: 'asc' }, { courtNumber: 'asc' }]
  });

  console.log(`=== Active Courts Count: ${courts.length} ===`);
  const byType: Record<string, string[]> = {};
  for (const c of courts) {
    const typeName = c.courtType.name;
    if (!byType[typeName]) byType[typeName] = [];
    byType[typeName].push(c.name || `Court ${c.courtNumber}`);
  }

  for (const [type, list] of Object.entries(byType)) {
    console.log(`${type} (${list.length}): ${list.join(', ')}`);
  }
}

main().finally(() => prisma.$disconnect());
