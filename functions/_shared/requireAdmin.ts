import type { Env } from './env';
import { jsonError } from './response';
import { verifyAdminAuth } from '../../lib/analytics/adminAuth';

/**
 * 관리자 통계 API 공통 가드. x-admin-auth 헤더를 서버 시크릿(ADMIN_AUTH_HASH)과
 * 비교해 실패하면 401을 반환한다. 클라이언트에서 메뉴를 숨기는 것만으로는
 * URL 직접 접근을 막을 수 없으므로, 이 서버 측 검증이 실제 방어선이다.
 */
export function requireAdmin(request: Request, env: Env): Response | null {
  if (!verifyAdminAuth(request, env)) {
    return jsonError('관리자 인증이 필요합니다.', 401);
  }
  return null;
}
