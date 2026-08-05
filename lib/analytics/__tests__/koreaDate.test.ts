import { describe, it, expect } from 'vitest';
import { toKstDateString, toKstMonthString, kstLastNDates, formatKstDateTime } from '../koreaDate';

describe('koreaDate', () => {
  it('UTC 자정 직전은 KST로는 다음날 아침이라 날짜가 하루 넘어간다', () => {
    // 2026-08-05T15:30:00Z -> KST(+9h) 2026-08-06T00:30
    const utc = new Date('2026-08-05T15:30:00.000Z');
    expect(toKstDateString(utc)).toBe('2026-08-06');
  });

  it('UTC 오전 시각은 KST로도 같은 날짜일 수 있다', () => {
    // 2026-08-05T01:00:00Z -> KST 2026-08-05T10:00
    const utc = new Date('2026-08-05T01:00:00.000Z');
    expect(toKstDateString(utc)).toBe('2026-08-05');
  });

  it('월 문자열은 YYYY-MM 형식이다', () => {
    const utc = new Date('2026-08-05T01:00:00.000Z');
    expect(toKstMonthString(utc)).toBe('2026-08');
  });

  it('kstLastNDates는 오래된 날짜부터 최근 날짜 순으로 N개를 반환한다', () => {
    const from = new Date('2026-08-05T01:00:00.000Z'); // KST 2026-08-05
    const dates = kstLastNDates(3, from);
    expect(dates).toEqual(['2026-08-03', '2026-08-04', '2026-08-05']);
  });

  it('formatKstDateTime은 UTC ISO를 KST "YYYY-MM-DD HH:mm"으로 변환한다', () => {
    // 2026-08-05T07:10:00Z -> KST 2026-08-05T16:10
    expect(formatKstDateTime('2026-08-05T07:10:00.000Z')).toBe('2026-08-05 16:10');
  });

  it('파싱할 수 없는 값은 원문을 그대로 반환한다', () => {
    expect(formatKstDateTime('not-a-date')).toBe('not-a-date');
  });
});
