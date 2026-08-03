import { describe, it, expect } from 'vitest';
import { normalizeCategory } from '../coupangCategory';

describe('normalizeCategory', () => {
  it('정규 슬러그는 그대로 반환한다', () => {
    expect(normalizeCategory('cost')).toBe('cost');
    expect(normalizeCategory('safety')).toBe('safety');
  });

  it('카테고리 이름으로 유사 매칭한다', () => {
    expect(normalizeCategory(undefined, '고정비 절약')).toBe('cost');
    expect(normalizeCategory(undefined, '원룸 정리 팁')).toBe('storage');
    expect(normalizeCategory(undefined, '방범과 화재 대비')).toBe('safety');
  });

  it('아무것도 매칭되지 않으면 all로 대체한다', () => {
    expect(normalizeCategory(undefined, undefined)).toBe('all');
    expect(normalizeCategory('unknown-slug', '전혀 관련 없는 이름')).toBe('all');
  });
});
