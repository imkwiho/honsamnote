// 관리자 통계 API의 서버 측 인증. 기존 관리자 로그인(app/admin/login)은
// 비밀번호의 SHA-256 해시를 localStorage에만 저장하는 완전 클라이언트 검증이라
// 서버에서 확인할 세션이 없다. 이 통계 API들은 그 해시값을 요청 헤더
// (x-admin-auth)로 함께 보내고, Cloudflare Pages Functions가 별도 시크릿
// 환경변수(ADMIN_AUTH_HASH, NEXT_PUBLIC_ 접두사 없이 저장 — 클라이언트 번들에
// 노출되지 않음)와 비교해 서버에서 최종 검증한다. URL만 입력해 접근해도
// 이 헤더가 없으므로 차단된다.

/** 타이밍 공격에 덜 취약하도록 길이 고정 후 비교한다(완벽한 상수시간은 아니지만
 *  단순 === 비교보다 낫고, 이 정도 위협 모델에는 충분하다). */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export interface AdminAuthEnv {
  ADMIN_AUTH_HASH?: string;
}

/**
 * 요청 헤더의 x-admin-auth 값과 서버 시크릿을 비교한다.
 * ADMIN_AUTH_HASH가 설정되지 않은 배포(로컬 개발 등)에서는 항상 실패시켜
 * "설정을 깜빡해서 누구나 접근 가능"해지는 상황을 방지한다.
 */
export function verifyAdminAuth(request: Request, env: AdminAuthEnv): boolean {
  const expected = env.ADMIN_AUTH_HASH;
  if (!expected) return false;
  const provided = request.headers.get('x-admin-auth');
  if (!provided) return false;
  return safeEqual(provided, expected);
}
