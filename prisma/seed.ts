import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Demo user
  const demoEmail = 'demo@shist.local';
  const demoUser = await prisma.user.upsert({
    where: { email: demoEmail },
    update: {},
    create: {
      email: demoEmail,
      firstName: 'Demo',
      lastName: 'User',
      isPremium: false,
    },
  });

  // Ensure ad preferences exist
  await prisma.adPreference.upsert({
    where: { userId: demoUser.id },
    update: {},
    create: { userId: demoUser.id, showPersonalized: false },
  });

  // Default categories (minimal set)
  const categories = [
    { name: 'General', icon: 'List', parentId: null as string | null },
    { name: 'Movies', icon: 'Film', parentId: null as string | null },
    { name: 'Music', icon: 'Music', parentId: null as string | null },
  ];

  for (const c of categories) {
    await prisma.category.upsert({
      where: { name: c.name },
      update: {},
      create: c,
    } as any);
  }

  // Sample list for demo user if none exists
  const existingLists = await prisma.list.findMany({ where: { creatorId: demoUser.id } });
  if (existingLists.length === 0) {
    const list = await prisma.list.create({
      data: {
        name: 'My First List',
        description: 'A starter list',
        isPublic: false,
        creatorId: demoUser.id,
      },
    });

    await prisma.listMember.create({
      data: {
        listId: list.id,
        userId: demoUser.id,
        role: 'OWNER',
        canAdd: true,
        canEdit: true,
        canDelete: true,
      },
    });

    await prisma.listItem.create({
      data: {
        listId: list.id,
        content: 'Add your first item',
        addedById: demoUser.id,
      },
    });
  }

  console.log('Seed complete');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});