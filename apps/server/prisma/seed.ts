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
    // 신규 시드는 영양 5필드를 모두 채워 음식 추가/수정 정책과 일관 유지.
    await prisma.foodTemplate.createMany({
      data: [
        {
          name: '계란',
          memo: '삶은 계란 1개 기준',
          category: '간식',
          servingGrams: 50,
          calories: 78,
          protein: 6.3,
          fat: 5.3,
          carbohydrate: 0.6,
          active: true,
        },
        {
          name: '김치',
          memo: '배추김치 한 접시 기준',
          category: '한식',
          servingGrams: 60,
          calories: 18,
          protein: 1.1,
          fat: 0.4,
          carbohydrate: 2.4,
          active: true,
        },
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
