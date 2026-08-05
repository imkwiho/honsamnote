import type { Env } from '../../_shared/env';
import { jsonOk, jsonError } from '../../_shared/response';
import { sha256Hex, safeEqual, createSessionToken, buildSessionCookie, SESSION_TTL_MS } from '../../../lib/analytics/adminSession';

interface Context {
  request: Request;
  env: Env;
}

// 비밀번호는 이 요청의 JSON 본문으로만(HTTPS로 암호화된 채널) 전달되고,
// 서버에서 해시로 변환해 Cloudflare 시크릿(ADMIN_AUTH_HASH)과 비교한다.
// 비밀번호나 해시는 클라이언트 코드/응답 어디에도 담기지 않는다.
export async function onRequestPost({ request, env }: Context): Promise<Response> {
  if (!env.ADMIN_AUTH_HASH) {
    return jsonError('관리자 비밀번호가 아직 설정되지 않았습니다. Cloudflare 환경변수 ADMIN_AUTH_HASH를 설정하세요.', 503);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('잘못된 요청입니다.', 400);
  }

  const password = (body as { password?: unknown } | null)?.password;
  if (typeof password !== 'string' || password.length === 0 || password.length > 200) {
    return jsonError('비밀번호를 입력하세요.', 400);
  }

  const inputHash = await sha256Hex(password);
  if (!safeEqual(inputHash, env.ADMIN_AUTH_HASH)) {
    return jsonError('비밀번호가 올바르지 않습니다.', 401);
  }

  const token = await createSessionToken(env.ADMIN_AUTH_HASH);
  return jsonOk({ loggedIn: true }, { headers: { 'set-cookie': buildSessionCookie(token, SESSION_TTL_MS / 1000) } });
}
