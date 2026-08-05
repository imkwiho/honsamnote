import type { Env } from '../../../_shared/env';
import { jsonOk, jsonError } from '../../../_shared/response';
import { requireAdmin } from '../../../_shared/requireAdmin';
import { getRecentVisits } from '../../../_shared/adminQueries';
import { REFERRER_GROUP_LABELS, type ReferrerGroup } from '../../../../lib/analytics/classifyReferrer';
import { formatKstDateTime } from '../../../../lib/analytics/koreaDate';

interface Context {
  request: Request;
  env: Env;
}

// 개인정보 없음: visitorId는 앞 8자리만 노출한다(전체 값은 서버 밖으로 나가지 않음).
export async function onRequestGet({ request, env }: Context): Promise<Response> {
  const denied = requireAdmin(request, env);
  if (denied) return denied;
  if (!env.ANALYTICS_DB) return jsonError('D1 데이터베이스가 연결되어 있지 않습니다.', 503);

  try {
    const rows = await getRecentVisits(env.ANALYTICS_DB, 50);
    const visits = rows.map(r => ({
      visitedAt: formatKstDateTime(r.occurredAt),
      visitorIdShort: r.visitorId.slice(0, 8),
      pageTitle: r.pageTitle,
      category: r.category,
      referrerGroupLabel: r.referrerGroup ? REFERRER_GROUP_LABELS[r.referrerGroup as ReferrerGroup] ?? r.referrerGroup : null,
      deviceType: r.deviceType,
      isNewVisit: r.isNew === 1,
    }));

    return jsonOk({ visits });
  } catch {
    return jsonError('통계를 불러오지 못했습니다.', 500);
  }
}
