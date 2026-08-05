import type { Env } from '../../../_shared/env';
import { jsonOk, jsonError } from '../../../_shared/response';
import { requireAdmin } from '../../../_shared/requireAdmin';
import { getCategoryRawStats } from '../../../_shared/adminQueries';
import { mergeCategoryStats } from '../../../../lib/analytics/categoryStats';

interface Context {
  request: Request;
  env: Env;
}

export async function onRequestGet({ request, env }: Context): Promise<Response> {
  const denied = requireAdmin(request, env);
  if (denied) return denied;
  if (!env.ANALYTICS_DB) return jsonError('D1 데이터베이스가 연결되어 있지 않습니다.', 503);

  try {
    const raw = await getCategoryRawStats(env.ANALYTICS_DB);
    const categories = mergeCategoryStats(raw.map(r => ({ category: r.category, pageViews: r.pageViews, visitors: r.visitors })));
    return jsonOk({ categories });
  } catch {
    return jsonError('통계를 불러오지 못했습니다.', 500);
  }
}
