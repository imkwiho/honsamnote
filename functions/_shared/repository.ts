import type { D1Database } from '@cloudflare/workers-types';

export interface EventInput {
  id: string;
  visitorId: string;
  sessionId: string;
  pathname: string;
  pageTitle?: string;
  contentType?: string;
  category?: string;
  postSlug?: string;
  postId?: string;
  referrer?: string;
  referrerGroup: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  deviceType: string;
  occurredAt: string;
  occurredDateKst: string;
}

export async function getLastEventOccurredAt(db: D1Database, visitorId: string, pathname: string): Promise<string | null> {
  const row = await db
    .prepare(`SELECT occurred_at FROM analytics_events WHERE visitor_id = ? AND pathname = ? ORDER BY occurred_at DESC LIMIT 1`)
    .bind(visitorId, pathname)
    .first<{ occurred_at: string }>();
  return row?.occurred_at ?? null;
}

export async function insertEvent(db: D1Database, e: EventInput): Promise<void> {
  await db
    .prepare(
      `INSERT INTO analytics_events (
        id, visitor_id, session_id, event_type, pathname, page_title, content_type,
        category, post_slug, post_id, referrer, referrer_group,
        utm_source, utm_medium, utm_campaign, device_type, occurred_at, occurred_date_kst
      ) VALUES (?, ?, ?, 'page_view', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      e.id,
      e.visitorId,
      e.sessionId,
      e.pathname,
      e.pageTitle ?? null,
      e.contentType ?? null,
      e.category ?? null,
      e.postSlug ?? null,
      e.postId ?? null,
      e.referrer ?? null,
      e.referrerGroup,
      e.utmSource ?? null,
      e.utmMedium ?? null,
      e.utmCampaign ?? null,
      e.deviceType,
      e.occurredAt,
      e.occurredDateKst
    )
    .run();
}

export async function sessionExists(db: D1Database, sessionId: string): Promise<boolean> {
  const row = await db.prepare(`SELECT 1 as x FROM analytics_sessions WHERE session_id = ? LIMIT 1`).bind(sessionId).first();
  return !!row;
}

export async function insertSession(
  db: D1Database,
  params: {
    sessionId: string;
    visitorId: string;
    nowIso: string;
    landingPath?: string;
    landingReferrer?: string;
    referrerGroup?: string;
    deviceType?: string;
  }
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO analytics_sessions (session_id, visitor_id, started_at, last_seen_at, landing_path, landing_referrer, referrer_group, device_type, page_view_count, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`
    )
    .bind(
      params.sessionId,
      params.visitorId,
      params.nowIso,
      params.nowIso,
      params.landingPath ?? null,
      params.landingReferrer ?? null,
      params.referrerGroup ?? null,
      params.deviceType ?? null,
      params.nowIso
    )
    .run();
}

export async function touchSession(db: D1Database, sessionId: string, nowIso: string): Promise<void> {
  await db
    .prepare(`UPDATE analytics_sessions SET last_seen_at = ?, page_view_count = page_view_count + 1, updated_at = ? WHERE session_id = ?`)
    .bind(nowIso, nowIso, sessionId)
    .run();
}

export async function upsertVisitor(
  db: D1Database,
  params: { visitorId: string; nowIso: string; nowDateKst: string; incrementSessions: boolean }
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO analytics_visitors (visitor_id, first_seen_at, last_seen_at, first_seen_date_kst, last_seen_date_kst, total_page_views, total_sessions, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?)
       ON CONFLICT(visitor_id) DO UPDATE SET
         last_seen_at = excluded.last_seen_at,
         last_seen_date_kst = excluded.last_seen_date_kst,
         total_page_views = total_page_views + 1,
         total_sessions = total_sessions + excluded.total_sessions,
         updated_at = excluded.updated_at`
    )
    .bind(
      params.visitorId,
      params.nowIso,
      params.nowIso,
      params.nowDateKst,
      params.nowDateKst,
      params.incrementSessions ? 1 : 0,
      params.nowIso
    )
    .run();
}

export async function getVisitorFirstSeenAt(db: D1Database, visitorId: string): Promise<string | null> {
  const row = await db
    .prepare(`SELECT first_seen_at FROM analytics_visitors WHERE visitor_id = ?`)
    .bind(visitorId)
    .first<{ first_seen_at: string }>();
  return row?.first_seen_at ?? null;
}

export async function upsertActiveVisitor(
  db: D1Database,
  params: { visitorId: string; sessionId: string; pathname: string; nowIso: string }
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO analytics_active_visitors (visitor_id, session_id, pathname, last_seen_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(visitor_id) DO UPDATE SET session_id = excluded.session_id, pathname = excluded.pathname, last_seen_at = excluded.last_seen_at`
    )
    .bind(params.visitorId, params.sessionId, params.pathname, params.nowIso)
    .run();
}

// 활동 없어진 지 오래된 상태 데이터를 지운다. 대량 삭제가 요청 지연을 늘리지
// 않도록, 크론이 없는 이 프로젝트에서는 "가끔" 호출되는 track/heartbeat/summary
// 요청에 슬쩍 얹어 정리한다(약 5% 확률로만 실행 — 매 요청마다 DELETE를 돌리지 않음).
export function shouldRunOpportunisticCleanup(): boolean {
  return Math.random() < 0.05;
}

export async function cleanupStaleActiveVisitors(db: D1Database, cutoffIso: string): Promise<void> {
  await db.prepare(`DELETE FROM analytics_active_visitors WHERE last_seen_at < ?`).bind(cutoffIso).run();
}

export async function cleanupStaleSessions(db: D1Database, cutoffIso: string): Promise<void> {
  await db.prepare(`DELETE FROM analytics_sessions WHERE last_seen_at < ?`).bind(cutoffIso).run();
}

export async function cleanupOldEvents(db: D1Database, cutoffDateKst: string): Promise<void> {
  await db.prepare(`DELETE FROM analytics_events WHERE occurred_date_kst < ?`).bind(cutoffDateKst).run();
}
