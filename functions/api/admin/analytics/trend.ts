import type { Env } from '../../../_shared/env';
import { jsonOk, jsonError } from '../../../_shared/response';
import { requireAdmin } from '../../../_shared/requireAdmin';
import { getTrendRaw } from '../../../_shared/adminQueries';
import { kstLastNDates } from '../../../../lib/analytics/koreaDate';

interface Context {
  request: Request;
  env: Env;
}

const TREND_DAYS = 30;

export async function onRequestGet({ request, env }: Context): Promise<Response> {
  const denied = await requireAdmin(request, env);
  if (denied) return denied;
  if (!env.ANALYTICS_DB) return jsonError('D1 데이터베이스가 연결되어 있지 않습니다.', 503);

  try {
    const dates = kstLastNDates(TREND_DAYS);
    const raw = await getTrendRaw(env.ANALYTICS_DB, dates[0]);
    const byDate = new Map(raw.map(r => [r.date, r]));

    const trend = dates.map(date => {
      const row = byDate.get(date);
      return { date, visitors: row?.visitors ?? 0, pageViews: row?.pageViews ?? 0 };
    });

    return jsonOk({ trend });
  } catch {
    return jsonError('통계를 불러오지 못했습니다.', 500);
  }
}
