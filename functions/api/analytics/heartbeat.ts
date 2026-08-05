import type { Env } from '../../_shared/env';
import { silentOk } from '../../_shared/response';
import { upsertActiveVisitor, shouldRunOpportunisticCleanup, cleanupStaleActiveVisitors } from '../../_shared/repository';
import { validateHeartbeatPayload, isExcludedPath } from '../../../lib/analytics/validateEvent';
import { isBot } from '../../../lib/analytics/detectBot';
import { nowUtcIso } from '../../../lib/analytics/koreaDate';
import { getAnalyticsConfig } from '../../../lib/analytics/config';

interface Context {
  request: Request;
  env: Env;
}

// 현재 접속 상태만 갱신한다 — 별도 로그(analytics_events)를 남기지 않고
// analytics_active_visitors 한 행을 upsert하는 것으로 끝낸다.
export async function onRequestPost({ request, env }: Context): Promise<Response> {
  try {
    if (!env.ANALYTICS_DB) return silentOk();

    const config = getAnalyticsConfig(env);
    if (!config.enabled) return silentOk();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return silentOk();
    }

    const payload = validateHeartbeatPayload(body);
    if (!payload) return silentOk();
    if (isExcludedPath(payload.pathname)) return silentOk();
    if (isBot(request.headers.get('user-agent'))) return silentOk();

    const db = env.ANALYTICS_DB;
    const nowIso = nowUtcIso();

    await upsertActiveVisitor(db, {
      visitorId: payload.visitorId,
      sessionId: payload.sessionId,
      pathname: payload.pathname,
      nowIso,
    });

    if (shouldRunOpportunisticCleanup()) {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      await cleanupStaleActiveVisitors(db, cutoff).catch(() => {});
    }

    return silentOk();
  } catch {
    return silentOk();
  }
}
