import type { Env } from '../../../_shared/env';
import { jsonOk, jsonError } from '../../../_shared/response';
import { requireAdmin } from '../../../_shared/requireAdmin';
import { getSummary } from '../../../_shared/adminQueries';
import { shouldRunOpportunisticCleanup, cleanupStaleActiveVisitors } from '../../../_shared/repository';
import { kstToday, kstYesterday, kstCurrentMonth } from '../../../../lib/analytics/koreaDate';
import { getAnalyticsConfig } from '../../../../lib/analytics/config';

interface Context {
  request: Request;
  env: Env;
}

export async function onRequestGet({ request, env }: Context): Promise<Response> {
  const denied = await requireAdmin(request, env);
  if (denied) return denied;
  if (!env.ANALYTICS_DB) return jsonError('D1 데이터베이스가 연결되어 있지 않습니다.', 503);

  try {
    const config = getAnalyticsConfig(env);
    const activeWindowStart = new Date(Date.now() - config.activeWindowMinutes * 60 * 1000).toISOString();

    const summary = await getSummary(env.ANALYTICS_DB, {
      today: kstToday(),
      yesterday: kstYesterday(),
      monthPrefix: kstCurrentMonth(),
      activeWindowStart,
    });

    if (shouldRunOpportunisticCleanup()) {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      await cleanupStaleActiveVisitors(env.ANALYTICS_DB, cutoff).catch(() => {});
    }

    return jsonOk(summary);
  } catch {
    return jsonError('통계를 불러오지 못했습니다.', 500);
  }
}
