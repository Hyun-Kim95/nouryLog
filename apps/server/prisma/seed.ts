import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function upsertUser(
  email: string,
  password: string,
  role: 'USER' | 'ADMIN',
) {
  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.upsert({
    where: { email },
    update: { passwordHash, role },
    create: {
      email,
      passwordHash,
      role,
      profile: {
        create: { gender: 'unspecified', age: 30, heightCm: 170, weightKg: 70 },
      },
      billing: { create: {} },
    },
  });
}

async function main() {
  await prisma.statsBatch.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', lastRunAt: new Date() },
    update: { lastRunAt: new Date() },
  });

  await upsertUser('admin@example.com', 'admin123', 'ADMIN');
  await upsertUser('user@example.com', 'user123', 'USER');

  if ((await prisma.foodTemplate.count()) === 0) {
    await prisma.foodTemplate.createMany({
      data: [
        { name: '계란', memo: '템플릿', active: true },
        { name: '김치', memo: '템플릿', active: true },
      ],
    });
  }

  if ((await prisma.inquiry.count()) === 0) {
    await prisma.inquiry.createMany({
      data: Array.from({ length: 5 }, (_, i) => ({
        subject: `문의 샘플 ${i + 1}`,
        body: '본문',
        status: i % 3 === 0 ? 'done' : 'pending',
        active: true,
      })),
    });
  }

  if ((await prisma.notice.count()) === 0) {
    await prisma.notice.create({
      data: { title: '환영 공지', body: '서비스 이용 안내', active: true },
    });
  }

  console.log('Seed OK: admin@example.com / admin123, user@example.com / user123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
