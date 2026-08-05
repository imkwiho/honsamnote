import { describe, it, expect } from 'vitest';
import { mergeCategoryStats } from '../categoryStats';

describe('mergeCategoryStats', () => {
  it('8개 카테고리를 고정 순서로 반환하고, 데이터 없는 카테고리는 0으로 채운다', () => {
    const result = mergeCategoryStats([
      { category: 'cost', pageViews: 1735, visitors: 1204 },
      { category: 'food', pageViews: 1565, visitors: 1087 },
    ]);
    expect(result).toHaveLength(8);
    expect(result.map(r => r.category)).toEqual([
      'cost', 'food', 'storage', 'cleaning', 'safety', 'housing', 'products', 'lifestyle',
    ]);
    expect(result.find(r => r.category === 'storage')).toMatchObject({ pageViews: 0, visitors: 0, ratio: 0 });
  });

  it('비율은 전체 조회수 대비로 계산된다', () => {
    const result = mergeCategoryStats([
      { category: 'cost', pageViews: 75, visitors: 50 },
      { category: 'food', pageViews: 25, visitors: 20 },
    ]);
    const cost = result.find(r => r.category === 'cost')!;
    expect(cost.ratio).toBeCloseTo(0.75);
  });

  it('데이터가 아예 없으면 모든 항목이 0이고 비율도 0이다(0으로 나누기 방지)', () => {
    const result = mergeCategoryStats([]);
    expect(result.every(r => r.pageViews === 0 && r.ratio === 0)).toBe(true);
  });

  it('한글 라벨이 카테고리 순서와 함께 매칭된다', () => {
    const result = mergeCategoryStats([]);
    expect(result[0]).toMatchObject({ category: 'cost', label: '생활비' });
    expect(result[7]).toMatchObject({ category: 'lifestyle', label: '관계' });
  });
});
