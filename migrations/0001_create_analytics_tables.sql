-- 혼삶 방문자 분석 시스템 (Cloudflare D1)
-- 적용: npx wrangler d1 execute honsamnote-analytics --local --file=migrations/0001_create_analytics_tables.sql
--       npx wrangler d1 execute honsamnote-analytics --remote --file=migrations/0001_create_analytics_tables.sql

-- ============================================================
-- analytics_events: page_view 원본 기록
-- ============================================================
CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  visitor_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'page_view',
  pathname TEXT NOT NULL,
  page_title TEXT,
  content_type TEXT,
  category TEXT,
  post_slug TEXT,
  post_id TEXT,
  referrer TEXT,
  referrer_group TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  device_type TEXT,
  occurred_at TEXT NOT NULL,        -- UTC ISO8601
  occurred_date_kst TEXT NOT NULL,  -- YYYY-MM-DD (Asia/Seoul 기준)
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_events_occurred_at ON analytics_events(occurred_at);
CREATE INDEX IF NOT EXISTS idx_events_occurred_date_kst ON analytics_events(occurred_date_kst);
CREATE INDEX IF NOT EXISTS idx_events_visitor_id ON analytics_events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_events_session_id ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_category ON analytics_events(category);
CREATE INDEX IF NOT EXISTS idx_events_pathname ON analytics_events(pathname);
CREATE INDEX IF NOT EXISTS idx_events_referrer_group ON analytics_events(referrer_group);
-- 중복 조회 방지 조회(visitor_id + pathname + 최근 시간) 가속용 복합 인덱스
CREATE INDEX IF NOT EXISTS idx_events_dedupe ON analytics_events(visitor_id, pathname, occurred_at);

-- ============================================================
-- analytics_visitors: 익명 방문자의 최초/최근 방문 정보
-- ============================================================
CREATE TABLE IF NOT EXISTS analytics_visitors (
  visitor_id TEXT PRIMARY KEY,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  first_seen_date_kst TEXT NOT NULL,
  last_seen_date_kst TEXT NOT NULL,
  total_page_views INTEGER NOT NULL DEFAULT 0,
  total_sessions INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_visitors_last_seen_date_kst ON analytics_visitors(last_seen_date_kst);
CREATE INDEX IF NOT EXISTS idx_visitors_first_seen_date_kst ON analytics_visitors(first_seen_date_kst);

-- ============================================================
-- analytics_sessions: 세션 정보
-- ============================================================
CREATE TABLE IF NOT EXISTS analytics_sessions (
  session_id TEXT PRIMARY KEY,
  visitor_id TEXT NOT NULL,
  started_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  landing_path TEXT,
  landing_referrer TEXT,
  referrer_group TEXT,
  device_type TEXT,
  page_view_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_visitor_id ON analytics_sessions(visitor_id);
CREATE INDEX IF NOT EXISTS idx_sessions_last_seen_at ON analytics_sessions(last_seen_at);

-- ============================================================
-- analytics_active_visitors: 현재 접속 상태(로그 아님, 상태 갱신형)
-- ============================================================
CREATE TABLE IF NOT EXISTS analytics_active_visitors (
  visitor_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  pathname TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_active_visitors_last_seen_at ON analytics_active_visitors(last_seen_at);
