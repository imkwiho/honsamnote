// SEO 5단계 §24-27 — P2 변동 정보 관리 구조.
// 가격·비용·요금·정책 정보의 재검토 일정을 추적한다.
// 공개 페이지에 무조건 경고를 띄우지 않는다 — 관리자 도구 전용.

export type ClaimVolatility =
  | 'HIGH'    // 자주 변동 (가격·요금·정책) — 상대적으로 짧은 주기 재검토
  | 'MEDIUM'  // 가끔 변동 (법령 개정 가능) — 중간 주기
  | 'LOW';    // 안정적 (일반 생활 수치) — 긴 주기

export interface VolatileClaimRecord {
  post_id: string;
  claim: string;
  claim_type: string;
  risk_level: 'P1' | 'P2' | 'P3';
  volatility: ClaimVolatility;
  verified_date: string;      // YYYY-MM-DD
  source_url: string;
  recheck_interval_days: number;
  next_review_date: string;   // YYYY-MM-DD (computed)
  status: 'CURRENT' | 'RECHECK_REQUIRED' | 'OUTDATED';
}

// 재검토 주기 기본값 (설정 가능 — 하드코딩 아님)
const DEFAULT_INTERVALS: Record<ClaimVolatility, number> = {
  HIGH: 90,    // 3개월
  MEDIUM: 180, // 6개월
  LOW: 365,    // 1년
};

export function computeNextReviewDate(verifiedDate: string, intervalDays: number): string {
  const d = new Date(verifiedDate);
  d.setDate(d.getDate() + intervalDays);
  return d.toISOString().slice(0, 10);
}

export function computeClaimStatus(record: VolatileClaimRecord): 'CURRENT' | 'RECHECK_REQUIRED' | 'OUTDATED' {
  const today = new Date().toISOString().slice(0, 10);
  const nextReview = record.next_review_date;
  const interval = record.recheck_interval_days;

  if (today < nextReview) return 'CURRENT';

  const daysSinceVerified = Math.floor(
    (new Date(today).getTime() - new Date(record.verified_date).getTime()) / (1000 * 60 * 60 * 24)
  );

  // 재검토 기한 초과 2배 이상이면 OUTDATED
  if (daysSinceVerified > interval * 2) return 'OUTDATED';

  return 'RECHECK_REQUIRED';
}

export function createVolatileClaimRecord(
  partial: Pick<VolatileClaimRecord, 'post_id' | 'claim' | 'claim_type' | 'risk_level'> & {
    volatility?: ClaimVolatility;
    verified_date?: string;
    source_url?: string;
    recheck_interval_days?: number;
  }
): VolatileClaimRecord {
  const volatility = partial.volatility ?? (partial.risk_level === 'P1' ? 'HIGH' : partial.risk_level === 'P2' ? 'HIGH' : 'LOW');
  const intervalDays = partial.recheck_interval_days ?? DEFAULT_INTERVALS[volatility];
  const verifiedDate = partial.verified_date ?? new Date().toISOString().slice(0, 10);
  const nextReviewDate = computeNextReviewDate(verifiedDate, intervalDays);

  const record: VolatileClaimRecord = {
    post_id: partial.post_id,
    claim: partial.claim,
    claim_type: partial.claim_type,
    risk_level: partial.risk_level,
    volatility,
    verified_date: verifiedDate,
    source_url: partial.source_url ?? '',
    recheck_interval_days: intervalDays,
    next_review_date: nextReviewDate,
    status: 'CURRENT',
  };

  record.status = computeClaimStatus(record);
  return record;
}

/**
 * P2 전체 목록에서 재검토 필요 항목 필터링.
 * 관리자 화면에서 호출.
 */
export function filterRecheckRequired(records: VolatileClaimRecord[]): VolatileClaimRecord[] {
  return records
    .map(r => ({ ...r, status: computeClaimStatus(r) }))
    .filter(r => r.status === 'RECHECK_REQUIRED' || r.status === 'OUTDATED')
    .sort((a, b) => a.next_review_date.localeCompare(b.next_review_date));
}
