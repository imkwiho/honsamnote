import { jsonOk } from '../../_shared/response';
import { buildClearSessionCookie } from '../../../lib/analytics/adminSession';

// 세션 쿠키를 즉시 만료시킨다. 실패할 이유가 없는 단순 작업이라 인증 확인 없이
// 항상 쿠키를 지운다(이미 로그아웃 상태였어도 안전).
export async function onRequestPost(): Promise<Response> {
  return jsonOk({ loggedOut: true }, { headers: { 'set-cookie': buildClearSessionCookie() } });
}
