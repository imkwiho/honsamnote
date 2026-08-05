'use client';

// 기존 관리자 로그인(app/admin/login)이 localStorage에 저장해둔 비밀번호
// SHA-256 해시를 그대로 x-admin-auth 헤더로 실어 보낸다. 서버(Cloudflare Pages
// Function)는 이 값을 별도 시크릿(ADMIN_AUTH_HASH)과 비교해 검증한다 —
// URL만 알아도 접근되는 게 아니라 이 헤더가 없으면 401을 받는다.
function getAdminAuthHeader(): string | null {
  try {
    const auth = window.localStorage.getItem('admin_auth');
    const expires = Number(window.localStorage.getItem('admin_auth_expires') ?? 0);
    if (!auth || Date.now() > expires) return null;
    return auth;
  } catch {
    return null;
  }
}

export async function fetchAdminAnalytics<T>(path: string): Promise<T> {
  const hash = getAdminAuthHeader();
  if (!hash) throw new Error('관리자 인증 정보가 없습니다. 다시 로그인해주세요.');

  const res = await fetch(path, { headers: { 'x-admin-auth': hash } });
  let json: { ok: boolean; data?: T; error?: string };
  try {
    json = await res.json();
  } catch {
    throw new Error('통계 응답을 해석하지 못했습니다.');
  }
  if (!res.ok || !json.ok) {
    throw new Error(json.error ?? '통계를 불러오지 못했습니다.');
  }
  return json.data as T;
}
