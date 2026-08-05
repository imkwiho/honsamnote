// 모든 통계는 Asia/Seoul(KST, UTC+9, 서머타임 없음) 기준으로 계산한다.
// D1에는 UTC ISO 문자열로 저장하고, 날짜 경계(오늘/어제/이번 달) 계산과
// 화면 표시 시점에만 이 유틸로 KST 변환한다.

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** UTC Date를 KST로 이동한 Date 객체(달력 필드 읽기 전용 — KST 벽시계 값을 UTC 필드에 그대로 담는다). */
function toKstShifted(date: Date): Date {
  return new Date(date.getTime() + KST_OFFSET_MS);
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** KST 기준 YYYY-MM-DD */
export function toKstDateString(date: Date = new Date()): string {
  const k = toKstShifted(date);
  return `${k.getUTCFullYear()}-${pad2(k.getUTCMonth() + 1)}-${pad2(k.getUTCDate())}`;
}

/** KST 기준 YYYY-MM (이번 달 집계용) */
export function toKstMonthString(date: Date = new Date()): string {
  const k = toKstShifted(date);
  return `${k.getUTCFullYear()}-${pad2(k.getUTCMonth() + 1)}`;
}

/** KST 기준 오늘 날짜 문자열 */
export function kstToday(): string {
  return toKstDateString(new Date());
}

/** KST 기준 어제 날짜 문자열 */
export function kstYesterday(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return toKstDateString(d);
}

/** KST 기준 이번 달(YYYY-MM) */
export function kstCurrentMonth(): string {
  return toKstMonthString(new Date());
}

/** occurred_date_kst가 오늘로부터 최근 N일(오늘 포함) 안에 드는지 판단할 때 쓸 시작 날짜 문자열 목록. */
export function kstLastNDates(n: number, from: Date = new Date()): string[] {
  const dates: string[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(from);
    d.setUTCDate(d.getUTCDate() - i);
    dates.push(toKstDateString(d));
  }
  return dates.reverse(); // 오래된 날짜 -> 최근 날짜 순
}

/** 관리자 화면 표시용: UTC ISO 문자열을 "YYYY-MM-DD HH:mm" KST로 포맷. */
export function formatKstDateTime(isoUtc: string): string {
  const date = new Date(isoUtc);
  if (Number.isNaN(date.getTime())) return isoUtc;
  const k = toKstShifted(date);
  return `${k.getUTCFullYear()}-${pad2(k.getUTCMonth() + 1)}-${pad2(k.getUTCDate())} ${pad2(k.getUTCHours())}:${pad2(k.getUTCMinutes())}`;
}

/** 현재 UTC 시각의 ISO 문자열 (D1 저장용). */
export function nowUtcIso(): string {
  return new Date().toISOString();
}

/** 두 UTC ISO 시각 사이의 경과 분(음수 가능). */
export function minutesBetween(fromIso: string, toIso: string): number {
  return (new Date(toIso).getTime() - new Date(fromIso).getTime()) / 60000;
}
