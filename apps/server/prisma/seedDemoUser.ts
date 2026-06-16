import { MealInputMode, MealSlot, PortionUnit } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma.js';

/** 데모·인사이트 스모크 — SSOT (프로덕션 `npm run seed:demo-user` 동일) */
export const DEMO_USER_EMAIL = 'user@example.com';
export const DEMO_USER_PASSWORD = 'user123';

/** 데모 식단 시드 — 화면에는 name만 노출 */
export const DEMO_MEAL_NOTE = '__nourylog_demo_seed__';

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

export type UpsertUserOptions = {
  /** true면 기존 계정 비밀번호·active 갱신 (프로덕션 데모 복구용) */
  resetPassword?: boolean;
  reactivate?: boolean;
};

export async function upsertUser(
  email: string,
  password: string,
  role: 'USER' | 'ADMIN',
  options: UpsertUserOptions = {},
) {
  const passwordHash = await bcrypt.hash(password, 10);
  const { resetPassword = false, reactivate = false } = options;
  return prisma.user.upsert({
    where: { email },
    update: {
      role,
      ...(resetPassword ? { passwordHash } : {}),
      ...(reactivate
        ? { active: true, deactivatedAt: null, deactivationReason: null, deactivationReasonCode: null }
        : {}),
    },
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

/** stats 배치·음식 템플릿 최소치 — 데모 식단 citation용 */
export async function ensureDemoSeedPrerequisites() {
  await prisma.statsBatch.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', lastRunAt: new Date() },
    update: { lastRunAt: new Date() },
  });

  if ((await prisma.foodTemplate.count()) > 0) return;

  await prisma.foodTemplate.createMany({
    data: [
      {
        name: '계란',
        memo: '데모',
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
        name: '제육덮밥',
        memo: '데모',
        category: '한식',
        portionUnit: PortionUnit.PLATE,
        portionLabel: '그릇',
        referenceAmount: 1,
        servingGrams: 350,
        calories: 720,
        protein: 32,
        fat: 28,
        carbohydrate: 82,
        active: true,
      },
      {
        name: '닭가슴살 샐러드',
        memo: '데모',
        category: '샐러드',
        portionUnit: PortionUnit.PLATE,
        portionLabel: '그릇',
        referenceAmount: 1,
        servingGrams: 320,
        calories: 420,
        protein: 42,
        fat: 14,
        carbohydrate: 24,
        active: true,
      },
    ],
  });
  console.log('Demo prerequisites: created minimal food templates');
}

/** user@example.com — 홈/식단/통계/AI citation 데모용 식단·목표 */
export async function seedDemoUserNutrition(email: string) {
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

/** 프로덕션·로컬 공통 — 데모 USER 계정 + 영양 시드 */
export async function runDemoUserSeed(options: UpsertUserOptions = {}) {
  const resetPassword = options.resetPassword ?? process.env.SEED_DEMO_RESET_PASSWORD !== '0';
  const reactivate = options.reactivate ?? true;
  await ensureDemoSeedPrerequisites();
  await upsertUser(DEMO_USER_EMAIL, DEMO_USER_PASSWORD, 'USER', { resetPassword, reactivate });
  await seedDemoUserNutrition(DEMO_USER_EMAIL);
}
