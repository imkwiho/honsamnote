import type { Env } from '../../_shared/env';
import { jsonOk, jsonError } from '../../_shared/response';
import { verifyAdminAuth } from '../../../lib/analytics/adminAuth';

interface Context {
  request: Request;
  env: Env;
}

// /admin/dashboard, /admin(QuickStats) 등 정적으로 내보내진 페이지가 렌더링
// 직후 "지금 로그인된 상태인가?"를 서버에 물어보는 용도. localStorage를 신뢰하던
// 예전 방식과 달리, 이 쿠키는 HttpOnly라 클라이언트 JS가 직접 확인할 수 없어
// 반드시 이 엔드포인트를 거쳐야 한다.
export async function onRequestGet({ request, env }: Context): Promise<Response> {
  const ok = await verifyAdminAuth(request, env);
  if (!ok) return jsonError('인증되지 않았습니다.', 401);
  return jsonOk({ authenticated: true });
}
