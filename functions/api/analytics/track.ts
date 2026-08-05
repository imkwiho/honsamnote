import type { Env } from '../../_shared/env';
import { silentOk } from '../../_shared/response';
import {
  getLastEventOccurredAt,
  insertEvent,
  sessionExists,
  insertSession,
  touchSession,
  upsertVisitor,
  shouldRunOpportunisticCleanup,
  cleanupStaleSessions,
  cleanupOldEvents,
} from '../../_shared/repository';
import { validateTrackPayload, isExcludedPath } from '../../../lib/analytics/validateEvent';
import { isBot } from '../../../lib/analytics/detectBot';
import { classifyReferrer } from '../../../lib/analytics/classifyReferrer';
import { detectDeviceType } from '../../../lib/analytics/detectDevice';
import { isDuplicateView } from '../../../lib/analytics/duplicateView';
import { nowUtcIso, toKstDateString } from '../../../lib/analytics/koreaDate';
import { getAnalyticsConfig } from '../../../lib/analytics/config';

interface Context {
  request: Request;
  env: Env;
}

// page_view 기록. 방문자에게는 실패가 절대 보이면 안 되므로, 검증/봇/제외
// 경로에 걸리거나 D1 오류가 나도 항상 200을 반환한다(로그 목적 외 별도 처리 없음).
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

    const payload = validateTrackPayload(body);
    if (!payload) return silentOk();
    if (isExcludedPath(payload.pathname)) return silentOk();
    if (isBot(request.headers.get('user-agent'))) return silentOk();

    const db = env.ANALYTICS_DB;
    const nowIso = nowUtcIso();
    const nowDateKst = toKstDateString();

    const lastAt = await getLastEventOccurredAt(db, payload.visitorId, payload.pathname);
    if (isDuplicateView(lastAt, nowIso, config.duplicateViewSeconds)) {
      return silentOk();
    }

    const referrerGroup = classifyReferrer(payload.referrer, env.SITE_ORIGIN ?? 'https://honsamnote.co.kr');
    const deviceType = detectDeviceType(request.headers.get('user-agent'));
    const eventId = crypto.randomUUID();

    await insertEvent(db, {
      id: eventId,
      visitorId: payload.visitorId,
      sessionId: payload.sessionId,
      pathname: payload.pathname,
      pageTitle: payload.pageTitle,
      contentType: payload.contentType,
      category: payload.category,
      postSlug: payload.postSlug,
      postId: payload.postId,
      referrer: payload.referrer,
      referrerGroup,
      utmSource: payload.utmSource,
      utmMedium: payload.utmMedium,
      utmCampaign: payload.utmCampaign,
      deviceType,
      occurredAt: nowIso,
      occurredDateKst: nowDateKst,
    });

    const isNewSession = !(await sessionExists(db, payload.sessionId));
    if (isNewSession) {
      await insertSession(db, {
        sessionId: payload.sessionId,
        visitorId: payload.visitorId,
        nowIso,
        landingPath: payload.pathname,
        landingReferrer: payload.referrer,
        referrerGroup,
        deviceType,
      });
    } else {
      await touchSession(db, payload.sessionId, nowIso);
    }

    await upsertVisitor(db, { visitorId: payload.visitorId, nowIso, nowDateKst, incrementSessions: isNewSession });

    if (shouldRunOpportunisticCleanup()) {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const retentionCutoffDate = new Date(Date.now() - config.retentionDays * 24 * 60 * 60 * 1000);
      await Promise.all([
        cleanupStaleSessions(db, sevenDaysAgo).catch(() => {}),
        cleanupOldEvents(db, toKstDateString(retentionCutoffDate)).catch(() => {}),
      ]);
    }

    return silentOk();
  } catch {
    return silentOk();
  }
}
