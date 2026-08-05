'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { getVisitorId, getOrRotateSessionId } from '@/lib/analytics/clientIds';
import { isExcludedPath } from '@/lib/analytics/validateEvent';

const HEARTBEAT_INTERVAL_MS = 60_000;
const DISABLE_FLAG_KEY = 'honsamnote_disable_analytics';

interface PageMeta {
  contentType?: string;
  category?: string;
  postSlug?: string;
  postId?: string;
  title?: string;
}

function readPageMeta(): PageMeta {
  try {
    const el = document.getElementById('__analytics_meta__');
    if (el?.textContent) return JSON.parse(el.textContent) as PageMeta;
  } catch {
    // 파싱 실패해도 추적 자체를 막지 않는다 — 폴백으로 대체한다.
  }
  return {};
}

// 글 데이터에서 카테고리를 확인할 수 없을 때만 쓰는 최소한의 URL 기반 폴백.
function deriveFallbackMeta(pathname: string): PageMeta {
  const categoryMatch = pathname.match(/^\/category\/([a-z]+)/);
  if (categoryMatch) return { contentType: 'category', category: categoryMatch[1] };
  if (pathname === '/' || pathname === '') return { contentType: 'home' };
  if (pathname.startsWith('/blog')) return { contentType: 'blog-list' };
  return { contentType: 'page' };
}

/** 개인정보를 확인할 수 있는 관리자 로그인 상태이거나, 수동으로 추적을 껐으면 true. */
function isTrackingDisabled(): boolean {
  try {
    if (window.localStorage.getItem(DISABLE_FLAG_KEY) === 'true') return true;
    const auth = window.localStorage.getItem('admin_auth');
    const expires = Number(window.localStorage.getItem('admin_auth_expires') ?? 0);
    if (auth && Date.now() < expires) return true;
  } catch {
    // localStorage 접근 불가 환경은 추적을 막지 않는다(관리자가 아닌 일반 방문자로 간주).
  }
  return false;
}

function sendBeaconOrFetch(url: string, payload: unknown): void {
  const body = JSON.stringify(payload);
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      if (navigator.sendBeacon(url, blob)) return;
    }
  } catch {
    // sendBeacon 자체가 예외를 던지는 환경도 있어(드묾) fetch로 넘어간다.
  }

  const attempt = (retriesLeft: number) => {
    fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true }).catch(() => {
      if (retriesLeft > 0) attempt(retriesLeft - 1);
    });
  };
  attempt(1); // 최초 1회 + 실패 시 재시도 1회 (무한 재시도 금지)
}

/**
 * 사이트 전체에서 루트 레이아웃에 한 번만 마운트되는 방문자 추적 컴포넌트.
 * 화면에는 아무것도 렌더링하지 않는다(return null). 이 컴포넌트에서 발생하는
 * 어떤 오류도 사이트 렌더링에 영향을 주지 않도록 모든 로직을 try/catch로 감싼다.
 */
export default function VisitorTracker() {
  const pathname = usePathname() ?? '/';
  const searchParams = useSearchParams();
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  // 경로가 바뀔 때마다 page_view 전송.
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      if (isExcludedPath(pathname)) return;
      if (isTrackingDisabled()) return;

      const meta = readPageMeta();
      const fallback = deriveFallbackMeta(pathname);

      const visitorId = getVisitorId();
      const { sessionId } = getOrRotateSessionId();
      if (!visitorId || !sessionId) return;

      sendBeaconOrFetch('/api/analytics/track', {
        visitorId,
        sessionId,
        pathname,
        pageTitle: meta.title ?? document.title,
        contentType: meta.contentType ?? fallback.contentType,
        category: meta.category ?? fallback.category,
        postSlug: meta.postSlug,
        postId: meta.postId,
        referrer: document.referrer || undefined,
        utmSource: searchParams?.get('utm_source') ?? undefined,
        utmMedium: searchParams?.get('utm_medium') ?? undefined,
        utmCampaign: searchParams?.get('utm_campaign') ?? undefined,
      });
    } catch {
      // 통계 오류가 방문자에게 보이면 안 된다.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- searchParams는 값 비교가 아닌 참조라 매 렌더 바뀔 수 있어 의도적으로 뺌
  }, [pathname]);

  // heartbeat: 탭이 보이는 동안 60초마다, 숨겨지면 중단, 다시 보이면 즉시 1회 + 재개.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isTrackingDisabled()) return;

    let intervalId: number | null = null;

    function sendHeartbeat() {
      try {
        if (document.visibilityState !== 'visible') return;
        if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
        if (isExcludedPath(pathnameRef.current)) return;
        const visitorId = getVisitorId();
        const { sessionId } = getOrRotateSessionId();
        if (!visitorId || !sessionId) return;
        sendBeaconOrFetch('/api/analytics/heartbeat', { visitorId, sessionId, pathname: pathnameRef.current });
      } catch {
        // 조용히 무시
      }
    }

    function startInterval() {
      if (intervalId !== null) return;
      sendHeartbeat();
      intervalId = window.setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
    }
    function stopInterval() {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    }
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') startInterval();
      else stopInterval();
    }

    if (document.visibilityState === 'visible') startInterval();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', stopInterval);
    window.addEventListener('offline', stopInterval);
    window.addEventListener('online', handleVisibilityChange);

    return () => {
      stopInterval();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', stopInterval);
      window.removeEventListener('offline', stopInterval);
      window.removeEventListener('online', handleVisibilityChange);
    };
  }, []);

  return null;
}
