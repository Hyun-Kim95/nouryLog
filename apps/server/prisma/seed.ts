import { MealInputMode, MealSlot, PortionUnit, PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/** user-web·통계·AI 데모 확인용 — 화면에는 name만 노출 */
const DEMO_MEAL_NOTE = '__nourylog_demo_seed__';

type DemoMealTemplate = {
  name: string;
  calories: number;
  protein: number;
  carbohydrate: number;
  fat: number;
  grams: number;
  slots: MealSlot[];
};

const DEMO_MEALS: DemoMealTemplate[] = [
  { name: '계란·토스트', calories: 320, protein: 14, carbohydrate: 38, fat: 12, grams: 180, slots: [MealSlot.BREAKFAST] },
  { name: '그릭요거트·블루베리', calories: 210, protein: 18, carbohydrate: 22, fat: 5, grams: 200, slots: [MealSlot.BREAKFAST] },
  { name: '김·밥', calories: 280, protein: 8, carbohydrate: 48, fat: 6, grams: 150, slots: [MealSlot.BREAKFAST, MealSlot.SNACK] },
  { name: '제육덮밥', calories: 720, protein: 32, carbohydrate: 82, fat: 28, grams: 350, slots: [MealSlot.LUNCH] },
  { name: '비빔밥', calories: 580, protein: 18, carbohydrate: 88, fat: 16, grams: 400, slots: [MealSlot.LUNCH] },
  { name: '순대국', calories: 480, protein: 28, carbohydrate: 42, fat: 18, grams: 500, slots: [MealSlot.LUNCH] },
  { name: '닭가슴살 샐러드', calories: 420, protein: 42, carbohydrate: 24, fat: 14, grams: 320, slots: [MealSlot.LUNCH, MealSlot.DINNER] },
  { name: '치킨(2조각)', calories: 540, protein: 38, carbohydrate: 18, fat: 32, grams: 220, slots: [MealSlot.DINNER] },
  { name: '연어·현미밥', calories: 620, protein: 36, carbohydrate: 52, fat: 28, grams: 380, slots: [MealSlot.DINNER] },
  { name: '짬뽕', calories: 620, protein: 24, carbohydrate: 78, fat: 18, grams: 500, slots: [MealSlot.LUNCH, MealSlot.DINNER] },
  { name: '프로틴 쉐이크', calories: 180, protein: 28, carbohydrate: 8, fat: 3, grams: 300, slots: [MealSlot.SNACK] },
  { name: '바나나', calories: 105, protein: 1, carbohydrate: 27, fat: 0, grams: 120, slots: [MealSlot.SNACK] },
  { name: '아메리카노·우유', calories: 45, protein: 3, carbohydrate: 5, fat: 1, grams: 250, slots: [MealSlot.SNACK] },
];

function kstDateTime(ymd: string, hour: number, minute = 0): Date {
  return new Date(`${ymd}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+09:00`);
}

function todayYmdKst(): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

function addDaysYmd(ymd: string, delta: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const t = Date.UTC(y, m - 1, d) + delta * 86_400_000;
  const kst = new Date(t + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

function pickMeal(dayIndex: number, slot: MealSlot, slotIndex: number): DemoMealTemplate {
  const pool = DEMO_MEALS.filter((m) => m.slots.includes(slot));
  return pool[(dayIndex * 5 + slotIndex * 3) % pool.length]!;
}

/** user@example.com — 홈/식단/통계/AI citation 데모용 식단·목표 */
async function seedDemoUserNutrition(email: string) {
  const user = await prisma.user.findUnique({ where: { email }, include: { profile: true } });
  if (!user) return;

  await prisma.profile.update({
    where: { userId: user.id },
    data: {
      goal: 'maintain',
      activityLevel: 'moderate',
      calorieGoalKcal: 1800,
      proteinGoalG: 75,
      carbohydrateGoalG: 220,
      fatGoalG: 55,
      proteinGoalMinG: 68,
      proteinGoalMaxG: 82,
      calorieGoalMinKcal: 1620,
      calorieGoalMaxKcal: 1980,
    },
  });

  await prisma.meal.deleteMany({ where: { userId: user.id, note: DEMO_MEAL_NOTE } });

  const templatesByName = new Map(
    (await prisma.foodTemplate.findMany({ where: { active: true }, select: { id: true, name: true } })).map(
      (t) => [t.name, t.id] as const,
    ),
  );

  const today = todayYmdKst();
  const meals: Array<{
    userId: string;
    name: string;
    note: string;
    consumedAt: Date;
    mealSlot: MealSlot;
    mealInputMode: MealInputMode;
    grams: number;
    calories: number;
    protein: number;
    carbohydrate: number;
    fat: number;
    foodTemplateId: string | null;
    active: boolean;
  }> = [];

  for (let dayOffset = -41; dayOffset <= 0; dayOffset++) {
    const ymd = addDaysYmd(today, dayOffset);
    const dayIndex = dayOffset + 41;
    const [y, mo, da] = ymd.split('-').map(Number);
    const isWeekend = [0, 6].includes(new Date(Date.UTC(y, mo - 1, da)).getUTCDay());

    const plan: { slot: MealSlot; hour: number; minute: number; skip?: boolean }[] = [
      { slot: MealSlot.BREAKFAST, hour: 8, minute: 15 },
      { slot: MealSlot.LUNCH, hour: 12, minute: 45 },
      { slot: MealSlot.SNACK, hour: 15, minute: 30, skip: dayIndex % 3 === 0 },
      { slot: MealSlot.DINNER, hour: isWeekend ? 19 : 18, minute: 30 },
    ];

    plan.forEach((p, slotIndex) => {
      if (p.skip) return;
      const tpl = pickMeal(dayIndex, p.slot, slotIndex);
      const foodTemplateId =
        templatesByName.get(tpl.name) ??
        templatesByName.get('제육덮밥') ??
        templatesByName.get('계란') ??
        null;
      meals.push({
        userId: user.id,
        name: tpl.name,
        note: DEMO_MEAL_NOTE,
        consumedAt: kstDateTime(ymd, p.hour, p.minute),
        mealSlot: p.slot,
        mealInputMode: MealInputMode.TOTAL_GRAMS,
        grams: tpl.grams,
        calories: tpl.calories,
        protein: tpl.protein,
        carbohydrate: tpl.carbohydrate,
        fat: tpl.fat,
        foodTemplateId,
        active: true,
      });
    });
  }

  const BATCH = 50;
  for (let i = 0; i < meals.length; i += BATCH) {
    await prisma.meal.createMany({ data: meals.slice(i, i + BATCH) });
  }

  const weightCount = await prisma.weightEntry.count({ where: { userId: user.id } });
  if (weightCount < 4) {
    for (let w = 3; w >= 0; w--) {
      const ymd = addDaysYmd(today, -w * 7);
      await prisma.weightEntry.create({
        data: {
          userId: user.id,
          recordedAt: kstDateTime(ymd, 7, 0),
          weightKg: 70 - w * 0.3,
          goal: 'maintain',
          activityLevel: 'moderate',
          calorieGoalKcal: 1800,
          proteinGoalG: 75,
          carbohydrateGoalG: 220,
          fatGoalG: 55,
        },
      });
    }
  }

  await prisma.statsBatch.update({
    where: { id: 'singleton' },
    data: { lastRunAt: new Date() },
  });

  const total = await prisma.meal.count({ where: { userId: user.id, active: true } });
  console.log(`Demo nutrition seed: ${email} — ${meals.length} meals added (active total ${total})`);
}

async function upsertUser(
  email: string,
  password: string,
  role: 'USER' | 'ADMIN',
) {
  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.upsert({
    where: { email },
    // 기존 계정 비밀번호는 유지(운영·UI 변경 후 시드 재실행 시 admin123으로 덮어쓰지 않음).
    update: { role },
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

  await seedDemoUserNutrition('user@example.com');

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
