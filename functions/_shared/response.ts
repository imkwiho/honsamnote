// 통계 API 응답을 일관된 형태로 만든다. 관리자 화면이 "일부 통계 API가
// 실패해도 다른 카드까지 사라지지 않게" 처리할 수 있도록, 성공/실패를
// 항상 { ok, data } 또는 { ok: false, error } 형태로 내려준다.

export function jsonOk(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify({ ok: true, data }), {
    status: 200,
    ...init,
    headers: { 'content-type': 'application/json; charset=utf-8', ...(init?.headers ?? {}) },
  });
}

export function jsonError(message: string, status = 400): Response {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

// 방문자에게 노출되는 공개 track/heartbeat 엔드포인트는 실패해도 항상 200을
// 반환한다 — 통계 오류가 브라우저 콘솔이나 재시도 로직으로 새어나가 사이트
// 경험에 영향을 주지 않게 하기 위함(스펙: "네트워크 오류 시 조용히 실패").
export function silentOk(): Response {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
