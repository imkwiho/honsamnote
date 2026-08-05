// 같은 visitorId + 같은 pathname으로 짧은 시간 안에 반복 호출되면 중복 조회로
// 판단해 다시 집계하지 않는다. 실제 D1 조회(같은 visitor_id/pathname의 가장
// 최근 occurred_at)는 Pages Function이 하고, 이 함수는 그 결과를 판정만 한다
// (D1 없이도 단위 테스트할 수 있도록 순수 함수로 분리).
export function isDuplicateView(lastEventOccurredAt: string | null, nowIso: string, windowSeconds: number): boolean {
  if (!lastEventOccurredAt) return false;
  const diffMs = new Date(nowIso).getTime() - new Date(lastEventOccurredAt).getTime();
  if (Number.isNaN(diffMs)) return false;
  return diffMs >= 0 && diffMs < windowSeconds * 1000;
}
