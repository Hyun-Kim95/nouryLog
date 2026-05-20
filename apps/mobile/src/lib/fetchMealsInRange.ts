import { listMeals, type MealRow } from '../api/meals';

const PAGE_SIZE = 100;

/** from/to 구간의 활성 식사를 페이지네이션으로 모두 조회. */
export async function fetchAllMealsInRange(
  token: string,
  from: string,
  to: string,
): Promise<MealRow[]> {
  const all: MealRow[] = [];
  let page = 1;
  while (true) {
    const res = await listMeals(token, { page, size: PAGE_SIZE, from, to });
    const items = res.items ?? [];
    all.push(...items);
    const total = res.total ?? 0;
    if (all.length >= total || items.length === 0) break;
    page += 1;
  }
  return all;
}
