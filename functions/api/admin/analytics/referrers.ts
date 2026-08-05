import type { Env } from '../../../_shared/env';
import { jsonOk, jsonError } from '../../../_shared/response';
import { requireAdmin } from '../../../_shared/requireAdmin';
import { getReferrerStats, getUtmStats, getDeviceStats } from '../../../_shared/adminQueries';
import { REFERRER_GROUP_LABELS, type ReferrerGroup } from '../../../../lib/analytics/classifyReferrer';

interface Context {
  request: Request;
  env: Env;
}

const GROUP_ORDER: ReferrerGroup[] = ['google', 'naver_daum_bing', 'kakao', 'sns', 'direct', 'other'];

export async function onRequestGet({ request, env }: Context): Promise<Response> {
  const denied = await requireAdmin(request, env);
  if (denied) return denied;
  if (!env.ANALYTICS_DB) return jsonError('D1 데이터베이스가 연결되어 있지 않습니다.', 503);

  try {
    const [rawRows, utm, devices] = await Promise.all([
      getReferrerStats(env.ANALYTICS_DB),
      getUtmStats(env.ANALYTICS_DB),
      getDeviceStats(env.ANALYTICS_DB),
    ]);

    const byGroup = new Map(rawRows.map(r => [r.referrerGroup, r]));
    const totalVisitors = rawRows.reduce((sum, r) => sum + r.visitors, 0);

    const referrers = GROUP_ORDER.map(group => {
      const row = byGroup.get(group);
      const visitors = row?.visitors ?? 0;
      return {
        group,
        label: REFERRER_GROUP_LABELS[group],
        visitors,
        pageViews: row?.pageViews ?? 0,
        ratio: totalVisitors > 0 ? visitors / totalVisitors : 0,
      };
    });

    const totalDeviceVisitors = devices.reduce((s, d) => s + d.visitors, 0);
    const deviceStats = devices.map(d => ({
      device: d.deviceType,
      visitors: d.visitors,
      ratio: totalDeviceVisitors > 0 ? d.visitors / totalDeviceVisitors : 0,
    }));

    return jsonOk({ referrers, utm, devices: deviceStats });
  } catch {
    return jsonError('통계를 불러오지 못했습니다.', 500);
  }
}
