// 클라이언트가 보낸 track/heartbeat 요청 바디를 신뢰하지 않고 최소 검증한다.
// 실패 시 조용히 무시(200 반환, 실제 사이트 방문자에게는 절대 에러를 보여주지 않는다).

export interface TrackPayload {
  visitorId: string;
  sessionId: string;
  pathname: string;
  pageTitle?: string;
  contentType?: string;
  category?: string;
  postSlug?: string;
  postId?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export interface HeartbeatPayload {
  visitorId: string;
  sessionId: string;
  pathname: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// localStorage 불가 환경의 세션 임시 ID 등, UUID 형식이 아닐 수도 있는 값을 폭넓게 허용하되
// 길이/문자셋은 제한한다(악의적으로 큰 페이로드를 ID 필드에 넣는 것을 방지).
const SAFE_ID_RE = /^[A-Za-z0-9-]{8,64}$/;

function isValidId(value: unknown): value is string {
  return typeof value === 'string' && (UUID_RE.test(value) || SAFE_ID_RE.test(value));
}

const MAX_TEXT_LENGTH = 300;

function isSafeText(value: unknown, maxLength = MAX_TEXT_LENGTH): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= maxLength;
}

export function validateTrackPayload(body: unknown): TrackPayload | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;

  if (!isValidId(b.visitorId) || !isValidId(b.sessionId)) return null;
  if (!isSafeText(b.pathname, 500) || !b.pathname.startsWith('/')) return null;

  const result: TrackPayload = {
    visitorId: b.visitorId,
    sessionId: b.sessionId,
    pathname: b.pathname,
  };

  if (isSafeText(b.pageTitle)) result.pageTitle = b.pageTitle;
  if (isSafeText(b.contentType, 50)) result.contentType = b.contentType;
  if (isSafeText(b.category, 50)) result.category = b.category;
  if (isSafeText(b.postSlug, 200)) result.postSlug = b.postSlug;
  if (isSafeText(b.postId, 200)) result.postId = b.postId;
  if (isSafeText(b.referrer, 500)) result.referrer = b.referrer;
  if (isSafeText(b.utmSource, 100)) result.utmSource = b.utmSource;
  if (isSafeText(b.utmMedium, 100)) result.utmMedium = b.utmMedium;
  if (isSafeText(b.utmCampaign, 100)) result.utmCampaign = b.utmCampaign;

  return result;
}

export function validateHeartbeatPayload(body: unknown): HeartbeatPayload | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  if (!isValidId(b.visitorId) || !isValidId(b.sessionId)) return null;
  if (!isSafeText(b.pathname, 500) || !b.pathname.startsWith('/')) return null;
  return { visitorId: b.visitorId, sessionId: b.sessionId, pathname: b.pathname };
}

const EXCLUDED_PATH_PREFIXES = ['/admin', '/api/', '/_next/'];
const EXCLUDED_EXACT_PATHS = ['/favicon.ico', '/robots.txt', '/sitemap.xml'];
const STATIC_FILE_RE = /\.(css|js|mjs|map|png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|eot)$/i;

/** 관리자 경로/정적 파일/API 경로는 통계 대상에서 제외한다. */
export function isExcludedPath(pathname: string): boolean {
  const clean = pathname.split('?')[0];
  if (EXCLUDED_EXACT_PATHS.includes(clean)) return true;
  if (EXCLUDED_PATH_PREFIXES.some(p => clean.startsWith(p))) return true;
  if (STATIC_FILE_RE.test(clean)) return true;
  return false;
}
