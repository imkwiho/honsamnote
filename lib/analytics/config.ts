// 방문자 분석 시스템 설정값. 환경변수로 덮어쓸 수 있는 것은 함수로 감싸
// Cloudflare Pages Functions의 env 객체를 받아 처리한다(Workers 런타임엔
// process.env가 없어 build-time 상수만으로는 배포 후 값을 바꿀 수 없다).
export const ANALYTICS_DEFAULTS = {
  enabled: true,
  activeWindowMinutes: 5,
  sessionTimeoutMinutes: 30,
  duplicateViewSeconds: 30,
  retentionDays: 365,
  heartbeatIntervalSeconds: 60,
} as const;

export interface AnalyticsEnv {
  ANALYTICS_DB?: unknown;
  ANALYTICS_ENABLED?: string;
  ANALYTICS_ACTIVE_WINDOW_MINUTES?: string;
  ANALYTICS_SESSION_TIMEOUT_MINUTES?: string;
  ANALYTICS_DUPLICATE_VIEW_SECONDS?: string;
  ANALYTICS_RETENTION_DAYS?: string;
  ADMIN_AUTH_HASH?: string;
}

function num(value: string | undefined, fallback: number): number {
  const n = value ? Number(value) : NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function getAnalyticsConfig(env: AnalyticsEnv) {
  return {
    enabled: env.ANALYTICS_ENABLED !== 'false',
    activeWindowMinutes: num(env.ANALYTICS_ACTIVE_WINDOW_MINUTES, ANALYTICS_DEFAULTS.activeWindowMinutes),
    sessionTimeoutMinutes: num(env.ANALYTICS_SESSION_TIMEOUT_MINUTES, ANALYTICS_DEFAULTS.sessionTimeoutMinutes),
    duplicateViewSeconds: num(env.ANALYTICS_DUPLICATE_VIEW_SECONDS, ANALYTICS_DEFAULTS.duplicateViewSeconds),
    retentionDays: num(env.ANALYTICS_RETENTION_DAYS, ANALYTICS_DEFAULTS.retentionDays),
  };
}

// 관리자 화면에 표시할 8개 콘텐츠 카테고리(뉴스레터 제외) — lib/coupangCategory.ts의
// 정규화 키와 동일한 값을 쓰되, 통계 표시 순서/라벨은 이 파일이 기준(source of truth)이다.
export const ANALYTICS_CATEGORY_ORDER: { key: string; label: string }[] = [
  { key: 'cost', label: '생활비' },
  { key: 'food', label: '식재료' },
  { key: 'storage', label: '수납' },
  { key: 'cleaning', label: '청소' },
  { key: 'safety', label: '안전' },
  { key: 'housing', label: '주거' },
  { key: 'products', label: '제품' },
  { key: 'lifestyle', label: '관계' },
];

export const ANALYTICS_NEWSLETTER_CATEGORY = { key: 'newsletter', label: '뉴스레터' };
