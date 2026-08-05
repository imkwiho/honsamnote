import type { D1Database } from '@cloudflare/workers-types';

async function countDistinctVisitors(db: D1Database, whereClause: string, params: unknown[]): Promise<number> {
  const row = await db
    .prepare(`SELECT COUNT(DISTINCT visitor_id) as cnt FROM analytics_events WHERE ${whereClause}`)
    .bind(...params)
    .first<{ cnt: number }>();
  return row?.cnt ?? 0;
}

async function countPageViews(db: D1Database, whereClause: string, params: unknown[]): Promise<number> {
  const row = await db
    .prepare(`SELECT COUNT(*) as cnt FROM analytics_events WHERE ${whereClause}`)
    .bind(...params)
    .first<{ cnt: number }>();
  return row?.cnt ?? 0;
}

export interface SummaryResult {
  todayVisitors: number;
  yesterdayVisitors: number;
  monthVisitors: number;
  totalVisitors: number;
  todayPageViews: number;
  yesterdayPageViews: number;
  monthPageViews: number;
  totalPageViews: number;
  activeVisitors: number;
}

export async function getSummary(
  db: D1Database,
  params: { today: string; yesterday: string; monthPrefix: string; activeWindowStart: string }
): Promise<SummaryResult> {
  const [
    todayVisitors, yesterdayVisitors, monthVisitors, totalVisitors,
    todayPageViews, yesterdayPageViews, monthPageViews, totalPageViews,
    activeRow,
  ] = await Promise.all([
    countDistinctVisitors(db, 'occurred_date_kst = ?', [params.today]),
    countDistinctVisitors(db, 'occurred_date_kst = ?', [params.yesterday]),
    countDistinctVisitors(db, "occurred_date_kst LIKE ?", [`${params.monthPrefix}%`]),
    countDistinctVisitors(db, '1=1', []),
    countPageViews(db, 'occurred_date_kst = ?', [params.today]),
    countPageViews(db, 'occurred_date_kst = ?', [params.yesterday]),
    countPageViews(db, "occurred_date_kst LIKE ?", [`${params.monthPrefix}%`]),
    countPageViews(db, '1=1', []),
    db
      .prepare(`SELECT COUNT(*) as cnt FROM analytics_active_visitors WHERE last_seen_at >= ?`)
      .bind(params.activeWindowStart)
      .first<{ cnt: number }>(),
  ]);

  return {
    todayVisitors, yesterdayVisitors, monthVisitors, totalVisitors,
    todayPageViews, yesterdayPageViews, monthPageViews, totalPageViews,
    activeVisitors: activeRow?.cnt ?? 0,
  };
}

export interface ReferrerRow {
  referrerGroup: string;
  visitors: number;
  pageViews: number;
}

export async function getReferrerStats(db: D1Database): Promise<ReferrerRow[]> {
  const { results } = await db
    .prepare(
      `SELECT referrer_group as referrerGroup, COUNT(DISTINCT visitor_id) as visitors, COUNT(*) as pageViews
       FROM analytics_events
       WHERE referrer_group IS NOT NULL
       GROUP BY referrer_group`
    )
    .all<{ referrerGroup: string; visitors: number; pageViews: number }>();
  return results ?? [];
}

export interface UtmSourceRow {
  source: string;
  visitors: number;
}
export interface UtmCampaignRow {
  campaign: string;
  pageViews: number;
}

export async function getUtmStats(db: D1Database): Promise<{ sources: UtmSourceRow[]; campaigns: UtmCampaignRow[] }> {
  const [sourcesRes, campaignsRes] = await Promise.all([
    db
      .prepare(
        `SELECT utm_source as source, COUNT(DISTINCT visitor_id) as visitors
         FROM analytics_events WHERE utm_source IS NOT NULL GROUP BY utm_source ORDER BY visitors DESC LIMIT 10`
      )
      .all<{ source: string; visitors: number }>(),
    db
      .prepare(
        `SELECT utm_campaign as campaign, COUNT(*) as pageViews
         FROM analytics_events WHERE utm_campaign IS NOT NULL GROUP BY utm_campaign ORDER BY pageViews DESC LIMIT 10`
      )
      .all<{ campaign: string; pageViews: number }>(),
  ]);
  return { sources: sourcesRes.results ?? [], campaigns: campaignsRes.results ?? [] };
}

export interface CategoryRow {
  category: string;
  pageViews: number;
  visitors: number;
}

export async function getCategoryRawStats(db: D1Database): Promise<CategoryRow[]> {
  const { results } = await db
    .prepare(
      `SELECT category, COUNT(*) as pageViews, COUNT(DISTINCT visitor_id) as visitors
       FROM analytics_events WHERE category IS NOT NULL GROUP BY category`
    )
    .all<{ category: string; pageViews: number; visitors: number }>();
  return results ?? [];
}

export interface PopularPostRow {
  postSlug: string;
  category: string | null;
  pageTitle: string | null;
  views: number;
  visitors: number;
  lastViewedAt: string;
}

export async function getPopularPosts(db: D1Database, sinceDateKst: string | null, limit = 20): Promise<PopularPostRow[]> {
  const where = sinceDateKst ? 'WHERE post_slug IS NOT NULL AND occurred_date_kst >= ?' : 'WHERE post_slug IS NOT NULL';
  const binds = sinceDateKst ? [sinceDateKst, limit] : [limit];
  const { results } = await db
    .prepare(
      `SELECT
         post_slug as postSlug,
         category,
         COUNT(*) as views,
         COUNT(DISTINCT visitor_id) as visitors,
         MAX(occurred_at) as lastViewedAt,
         (SELECT page_title FROM analytics_events e2 WHERE e2.post_slug = e1.post_slug ORDER BY e2.occurred_at DESC LIMIT 1) as pageTitle
       FROM analytics_events e1
       ${where}
       GROUP BY post_slug, category
       ORDER BY views DESC
       LIMIT ?`
    )
    .bind(...binds)
    .all<PopularPostRow>();
  return results ?? [];
}

export interface RecentVisitRow {
  occurredAt: string;
  visitorId: string;
  pageTitle: string | null;
  category: string | null;
  referrerGroup: string | null;
  deviceType: string | null;
  isNew: number;
}

export async function getRecentVisits(db: D1Database, limit = 50): Promise<RecentVisitRow[]> {
  const { results } = await db
    .prepare(
      `SELECT
         e.occurred_at as occurredAt,
         e.visitor_id as visitorId,
         e.page_title as pageTitle,
         e.category as category,
         e.referrer_group as referrerGroup,
         e.device_type as deviceType,
         CASE WHEN e.occurred_at = v.first_seen_at THEN 1 ELSE 0 END as isNew
       FROM analytics_events e
       LEFT JOIN analytics_visitors v ON e.visitor_id = v.visitor_id
       ORDER BY e.occurred_at DESC
       LIMIT ?`
    )
    .bind(limit)
    .all<RecentVisitRow>();
  return results ?? [];
}

export interface TrendRow {
  date: string;
  visitors: number;
  pageViews: number;
}

export async function getTrendRaw(db: D1Database, sinceDateKst: string): Promise<TrendRow[]> {
  const { results } = await db
    .prepare(
      `SELECT occurred_date_kst as date, COUNT(DISTINCT visitor_id) as visitors, COUNT(*) as pageViews
       FROM analytics_events
       WHERE occurred_date_kst >= ?
       GROUP BY occurred_date_kst
       ORDER BY occurred_date_kst ASC`
    )
    .bind(sinceDateKst)
    .all<TrendRow>();
  return results ?? [];
}

export interface DeviceRow {
  deviceType: string;
  visitors: number;
}

export async function getDeviceStats(db: D1Database): Promise<DeviceRow[]> {
  const { results } = await db
    .prepare(
      `SELECT device_type as deviceType, COUNT(DISTINCT visitor_id) as visitors
       FROM analytics_events WHERE device_type IS NOT NULL GROUP BY device_type`
    )
    .all<{ deviceType: string; visitors: number }>();
  return results ?? [];
}
