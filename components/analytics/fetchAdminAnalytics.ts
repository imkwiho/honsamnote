'use client';

// 로그인 시 서버가 발급한 HttpOnly 세션 쿠키가 동일 출처 요청에는 브라우저가
// 자동으로 실어 보내므로, 여기서 별도로 인증 헤더를 붙일 필요가 없다(그 쿠키는
// 애초에 이 클라이언트 코드가 읽을 수도 없다). 서버가 쿠키를 검증해 401을
// 주면 그대로 에러로 처리한다.
export async function fetchAdminAnalytics<T>(path: string): Promise<T> {
  const res = await fetch(path);
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
