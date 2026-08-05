import type { D1Database } from '@cloudflare/workers-types';

// Cloudflare Pages 프로젝트 Settings > Bindings에서 연결하는 값들.
// ANALYTICS_DB: D1 database binding (변수명 그대로 사용해야 함)
// ADMIN_AUTH_HASH: 관리자 통계 API 서버 검증용 시크릿(NEXT_PUBLIC_ 아님 — 클라이언트에 노출 안 됨)
export interface Env {
  ANALYTICS_DB: D1Database;
  ADMIN_AUTH_HASH?: string;
  ANALYTICS_ENABLED?: string;
  ANALYTICS_ACTIVE_WINDOW_MINUTES?: string;
  ANALYTICS_SESSION_TIMEOUT_MINUTES?: string;
  ANALYTICS_DUPLICATE_VIEW_SECONDS?: string;
  ANALYTICS_RETENTION_DAYS?: string;
  SITE_ORIGIN?: string;
}
