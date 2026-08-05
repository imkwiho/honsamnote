import type { Env } from './env';
import { jsonError } from './response';
import { verifyAdminAuth } from '../../lib/analytics/adminAuth';

/**
 * 관리자 통계 API 공통 가드. 로그인 시 발급된 HttpOnly 세션 쿠키를 서버에서
 * 검증해 실패하면 401을 반환한다. 클라이언트에서 메뉴를 숨기는 것만으로는
 * URL 직접 접근을 막을 수 없으므로, 이 서버 측 검증이 실제 방어선이다.
 */
export async function requireAdmin(request: Request, env: Env): Promise<Response | null> {
  if (!(await verifyAdminAuth(request, env))) {
    return jsonError('관리자 인증이 필요합니다.', 401);
  }
  return null;
}
