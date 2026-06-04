import { PortionUnit, PrismaClient } from '@prisma/client';
import {
  DEMO_USER_EMAIL,
  DEMO_USER_PASSWORD,
  ensureDemoSeedPrerequisites,
  seedDemoUserNutrition,
  upsertUser,
} from './seedDemoUser.js';

const prisma = new PrismaClient();

async function main() {
  await ensureDemoSeedPrerequisites();

  await upsertUser('admin@example.com', 'admin123', 'ADMIN');
  await upsertUser(DEMO_USER_EMAIL, DEMO_USER_PASSWORD, 'USER');

  await seedDemoUserNutrition(DEMO_USER_EMAIL);

  if ((await prisma.foodTemplate.count()) === 0) {
    // 신규 시드는 영양 5필드를 모두 채워 음식 추가/수정 정책과 일관 유지.
    await prisma.foodTemplate.createMany({
      data: [
        {
          name: '계란',
          memo: '삶은 계란 1개 기준',
          category: '간식',
          portionUnit: PortionUnit.PIECE,
          portionLabel: '개',
          referenceAmount: 1,
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
          portionUnit: PortionUnit.PLATE,
          portionLabel: '접시',
          referenceAmount: 1,
          servingGrams: 60,
          calories: 18,
          protein: 1.1,
          fat: 0.4,
          carbohydrate: 2.4,
          active: true,
        },
        {
          name: '김',
          memo: '구운 김 1장 기준',
          category: '한식',
          portionUnit: PortionUnit.PIECE,
          portionLabel: '장',
          referenceAmount: 1,
          servingGrams: 2,
          calories: 5,
          protein: 0.4,
          fat: 0.1,
          carbohydrate: 0.3,
          active: true,
        },
      ],
    });
  }

  if (!(await prisma.foodTemplate.findFirst({ where: { name: '김' } }))) {
    await prisma.foodTemplate.create({
      data: {
        name: '김',
        memo: '구운 김 1장 기준',
        category: '한식',
        portionUnit: PortionUnit.PIECE,
        portionLabel: '장',
        referenceAmount: 1,
        servingGrams: 2,
        calories: 5,
        protein: 0.4,
        fat: 0.1,
        carbohydrate: 0.3,
        active: true,
      },
    });
  }

  const extraTemplates: Array<{
    name: string;
    memo: string;
    category: string;
    portionUnit: PortionUnit;
    portionLabel: string;
    servingGrams: number;
    calories: number;
    protein: number;
    fat: number;
    carbohydrate: number;
  }> = [
    {
      name: '육개장 컵라면',
      memo: '컵 1개(포장 기준 근사)',
      category: '간편식',
      portionUnit: PortionUnit.PIECE,
      portionLabel: '개',
      servingGrams: 120,
      calories: 530,
      protein: 10,
      fat: 20,
      carbohydrate: 78,
    },
    {
      name: '제육덮밥',
      memo: '1인분 접시 기준 근사',
      category: '한식',
      portionUnit: PortionUnit.PLATE,
      portionLabel: '접시',
      servingGrams: 350,
      calories: 720,
      protein: 32,
      fat: 28,
      carbohydrate: 82,
    },
    {
      name: '순대국',
      memo: '1인분 그릇 기준 근사',
      category: '한식',
      portionUnit: PortionUnit.BOWL,
      portionLabel: '그릇',
      servingGrams: 500,
      calories: 480,
      protein: 28,
      fat: 18,
      carbohydrate: 42,
    },
    {
      name: '치킨',
      memo: '후라이드 1인분(근사)',
      category: '외식',
      portionUnit: PortionUnit.PLATE,
      portionLabel: '1인분',
      servingGrams: 300,
      calories: 900,
      protein: 52,
      fat: 55,
      carbohydrate: 28,
    },
    {
      name: '피자',
      memo: '치즈 피자 1조각(근사)',
      category: '외식',
      portionUnit: PortionUnit.PIECE,
      portionLabel: '조각',
      servingGrams: 120,
      calories: 285,
      protein: 12,
      fat: 11,
      carbohydrate: 32,
    },
    {
      name: '짜장면',
      memo: '1인분 그릇 기준 근사',
      category: '중식',
      portionUnit: PortionUnit.BOWL,
      portionLabel: '그릇',
      servingGrams: 500,
      calories: 680,
      protein: 18,
      fat: 22,
      carbohydrate: 98,
    },
    {
      name: '짬뽕',
      memo: '1인분 그릇 기준 근사',
      category: '중식',
      portionUnit: PortionUnit.BOWL,
      portionLabel: '그릇',
      servingGrams: 500,
      calories: 620,
      protein: 24,
      fat: 18,
      carbohydrate: 78,
    },
    {
      name: '소주',
      memo: '참이슬 등 360ml 1병(근사)',
      category: '주류',
      portionUnit: PortionUnit.PIECE,
      portionLabel: '병',
      servingGrams: 360,
      calories: 540,
      protein: 0,
      fat: 0,
      carbohydrate: 0,
    },
    {
      name: '맥주',
      memo: '일반 맥주 500ml 1병(근사)',
      category: '주류',
      portionUnit: PortionUnit.PIECE,
      portionLabel: '병',
      servingGrams: 500,
      calories: 225,
      protein: 2,
      fat: 0,
      carbohydrate: 18,
    },
  ];

  await prisma.foodTemplate.updateMany({
    where: { name: '유개장 컵라면' },
    data: { name: '육개장 컵라면' },
  });

  for (const tpl of extraTemplates) {
    if (!(await prisma.foodTemplate.findFirst({ where: { name: tpl.name } }))) {
      await prisma.foodTemplate.create({
        data: {
          ...tpl,
          referenceAmount: 1,
          active: true,
        },
      });
    }
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

  console.log(`Seed OK: admin@example.com / admin123, ${DEMO_USER_EMAIL} / ${DEMO_USER_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
