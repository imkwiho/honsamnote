// 관리자 통계 API 및 /admin/dashboard의 서버 측 인증. 로그인(POST
// /api/admin/login)에 성공하면 서버가 서명한 세션 토큰을 HttpOnly 쿠키로
// 내려주고, 이후 모든 관리자 요청은 이 함수로 그 쿠키를 서버에서 검증한다.
// 클라이언트 JS는 쿠키 값을 읽을 수도(HttpOnly), 위조할 수도 없다.
import { SESSION_COOKIE_NAME, parseCookieHeader, verifySessionToken } from './adminSession';

export interface AdminAuthEnv {
  ADMIN_AUTH_HASH?: string;
}

/**
 * 요청의 세션 쿠키를 검증한다. ADMIN_AUTH_HASH가 설정되지 않은 배포(설정을
 * 깜빡한 경우 등)에서는 항상 실패시켜 "설정을 안 해서 누구나 접근 가능"해지는
 * 상황을 방지한다.
 */
export async function verifyAdminAuth(request: Request, env: AdminAuthEnv): Promise<boolean> {
  const secret = env.ADMIN_AUTH_HASH;
  if (!secret) return false;
  const cookies = parseCookieHeader(request.headers.get('cookie'));
  return verifySessionToken(cookies[SESSION_COOKIE_NAME], secret);
}
