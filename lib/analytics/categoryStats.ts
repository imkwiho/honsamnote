import { ANALYTICS_CATEGORY_ORDER } from './config';

export interface CategoryStatRow {
  category: string;
  pageViews: number;
  visitors: number;
}

export interface CategoryStatResult extends CategoryStatRow {
  label: string;
  ratio: number; // 0~1
}

/**
 * D1에서 집계된 카테고리별 원시 결과(카테고리가 없거나 존재하지 않을 수 있음)를
 * 8개 고정 카테고리 순서에 맞춰 채운다 — 조회수가 0인 카테고리도 표에 나타나야
 * "카테고리 표시 순서"가 항상 일정하게 유지된다. 정의되지 않은 카테고리 값은
 * 합계에는 포함하되 표에는 노출하지 않는다(글 데이터에 없는 카테고리 오타 등).
 */
export function mergeCategoryStats(dbRows: CategoryStatRow[]): CategoryStatResult[] {
  const byCategory = new Map(dbRows.map(r => [r.category, r]));
  const totalPageViews = dbRows.reduce((sum, r) => sum + r.pageViews, 0);

  return ANALYTICS_CATEGORY_ORDER.map(({ key, label }) => {
    const row = byCategory.get(key);
    const pageViews = row?.pageViews ?? 0;
    const visitors = row?.visitors ?? 0;
    return {
      category: key,
      label,
      pageViews,
      visitors,
      ratio: totalPageViews > 0 ? pageViews / totalPageViews : 0,
    };
  });
}
