import type { Env } from '../../../_shared/env';
import { jsonOk, jsonError } from '../../../_shared/response';
import { requireAdmin } from '../../../_shared/requireAdmin';
import { getPopularPosts } from '../../../_shared/adminQueries';
import { kstToday, kstLastNDates, formatKstDateTime } from '../../../../lib/analytics/koreaDate';

interface Context {
  request: Request;
  env: Env;
}

type Period = 'today' | '7d' | '30d' | 'all';

function sinceDateFor(period: Period): string | null {
  if (period === 'today') return kstToday();
  if (period === '7d') return kstLastNDates(7)[0];
  if (period === '30d') return kstLastNDates(30)[0];
  return null; // all
}

// 평균 체류시간(dwell time)은 이번 1차 구현에서 의도적으로 제외했다.
// page_view 이벤트만으로는 "다음 페이지로 이동한 시각"이 없으면 체류시간을
// 알 수 없고, 정확히 재려면 beforeunload/visibilitychange 시점에 별도
// duration 이벤트를 추가로 보내야 한다 — 탭을 여러 개 열어두거나 브라우저를
// 백그라운드에 둔 경우 값이 왜곡되기 쉬워 신뢰도가 낮다고 판단해 제외했다.
export async function onRequestGet({ request, env }: Context): Promise<Response> {
  const denied = requireAdmin(request, env);
  if (denied) return denied;
  if (!env.ANALYTICS_DB) return jsonError('D1 데이터베이스가 연결되어 있지 않습니다.', 503);

  try {
    const url = new URL(request.url);
    const periodParam = (url.searchParams.get('period') ?? '30d') as Period;
    const period: Period = (['today', '7d', '30d', 'all'] as Period[]).includes(periodParam) ? periodParam : '30d';

    const rows = await getPopularPosts(env.ANALYTICS_DB, sinceDateFor(period), 20);
    const posts = rows.map((r, i) => ({
      rank: i + 1,
      postSlug: r.postSlug,
      category: r.category,
      pageTitle: r.pageTitle ?? r.postSlug,
      views: r.views,
      visitors: r.visitors,
      lastViewedAt: formatKstDateTime(r.lastViewedAt),
    }));

    return jsonOk({ period, posts, dwellTimeSupported: false });
  } catch {
    return jsonError('통계를 불러오지 못했습니다.', 500);
  }
}
