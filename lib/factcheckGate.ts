// SEO 4단계 §21-22 — Factcheck Gate.
// 새 글 자동 발행 전 사실 확인 위험 카테고리 탐지.
// 고위험 카테고리 글에 FACTCHECK_REQUIRED 상태를 부여한다.
import type { AuditPost } from './seoAudit';
import { FACTCHECK_CATEGORIES, computeFactCheckFlag } from './seoAudit';

export type FactcheckStatus =
  | 'CLEAR'                 // 사실 확인 위험 없음 — 발행 가능
  | 'FACTCHECK_REQUIRED'    // P1/P2 위험 탐지 — 수동 확인 후 발행
  | 'HIGH_RISK_HOLD';       // P1 고위험 카테고리 — 카테고리 자체 일시 발행 보류

export interface FactcheckGateResult {
  status: FactcheckStatus;
  reason: string;
  riskLevel: 'P1' | 'P2' | 'P3' | null;
  claimsFound: number;
  shouldPausePublish: boolean; // true이면 자동 발행 중단 권고
}

// P1 고위험 카테고리 — 이 카테고리는 새 글 자동 발행을 일시 보류 권고
const P1_CATEGORIES = new Set([
  'housing',   // 주거 계약 / 보증금
  'safety',    // 안전
  'legal',     // 법률
]);

// P2 위험 카테고리 — 가격/수치 포함 가능성 높은 카테고리
const P2_CATEGORIES = new Set([
  'finance',
  'appliances',
  'health',
]);

/**
 * 새 글 발행 전 사실 확인 위험 검사.
 * generate-post.ts 등 자동 발행 스크립트에서 호출.
 */
export function runFactcheckGate(post: AuditPost): FactcheckGateResult {
  const cat = post.category ?? '';
  const flag = computeFactCheckFlag(post);

  // P1 고위험 카테고리
  if (P1_CATEGORIES.has(cat)) {
    return {
      status: 'HIGH_RISK_HOLD',
      reason: `카테고리 '${cat}'는 법률·안전·보증금 관련 고위험군 — 자동 발행 보류, 수동 검토 필요`,
      riskLevel: 'P1',
      claimsFound: flag.flagged ? 1 : 0,
      shouldPausePublish: true,
    };
  }

  // P2 카테고리 + 사실 확인 위험 탐지
  if (P2_CATEGORIES.has(cat) && flag.flagged) {
    return {
      status: 'FACTCHECK_REQUIRED',
      reason: `가격/수치 관련 카테고리에서 확인이 필요한 수치 탐지 — 발행 전 확인 권고`,
      riskLevel: 'P2',
      claimsFound: 1,
      shouldPausePublish: false, // 경고만, 강제 중단은 아님
    };
  }

  // FACTCHECK_CATEGORIES (seoAudit.ts에 정의된 고위험 카테고리) + flag
  if (FACTCHECK_CATEGORIES.has(cat) && flag.flagged) {
    return {
      status: 'FACTCHECK_REQUIRED',
      reason: `팩트체크 대상 카테고리에서 확인 필요 표현 탐지`,
      riskLevel: 'P3',
      claimsFound: 1,
      shouldPausePublish: false,
    };
  }

  return {
    status: 'CLEAR',
    reason: '사실 확인 위험 없음',
    riskLevel: null,
    claimsFound: 0,
    shouldPausePublish: false,
  };
}

/**
 * 발행 스크립트용 콘솔 출력 포맷.
 * status !== 'CLEAR'이면 경고를 출력하고 shouldPausePublish 여부를 반환한다.
 */
export function reportFactcheckGate(result: FactcheckGateResult, postSlug: string): boolean {
  if (result.status === 'CLEAR') return false;

  const prefix = result.status === 'HIGH_RISK_HOLD' ? '[HIGH-RISK HOLD]' : '[FACTCHECK_REQUIRED]';
  console.warn(`\n⚠️  ${prefix} ${postSlug}`);
  console.warn(`   이유: ${result.reason}`);
  console.warn(`   위험 등급: ${result.riskLevel ?? 'N/A'}`);
  if (result.shouldPausePublish) {
    console.warn('   → 자동 발행 보류. 내용 검증 후 수동 발행하세요.');
  } else {
    console.warn('   → 경고: 발행 전 해당 수치/표현 확인을 권고합니다.');
  }
  console.warn('');

  return result.shouldPausePublish;
}
