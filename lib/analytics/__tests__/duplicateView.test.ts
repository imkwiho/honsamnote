import { describe, it, expect } from 'vitest';
import { isDuplicateView } from '../duplicateView';

describe('isDuplicateView', () => {
  it('같은 페이지를 30초 안에 다시 열면 중복으로 판정한다', () => {
    const last = '2026-08-05T10:00:00.000Z';
    const now = '2026-08-05T10:00:15.000Z'; // 15초 후
    expect(isDuplicateView(last, now, 30)).toBe(true);
  });

  it('30초가 지나면 중복이 아니다', () => {
    const last = '2026-08-05T10:00:00.000Z';
    const now = '2026-08-05T10:00:31.000Z'; // 31초 후
    expect(isDuplicateView(last, now, 30)).toBe(false);
  });

  it('이전 조회 기록이 없으면 중복이 아니다(첫 조회)', () => {
    expect(isDuplicateView(null, '2026-08-05T10:00:00.000Z', 30)).toBe(false);
  });

  it('경계값(정확히 30초)은 중복이 아니다', () => {
    const last = '2026-08-05T10:00:00.000Z';
    const now = '2026-08-05T10:00:30.000Z';
    expect(isDuplicateView(last, now, 30)).toBe(false);
  });
});
