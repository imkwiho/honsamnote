'use client';

import { useEffect } from 'react';
import { incrementSiteVisit } from '@/lib/visits';

// 브라우저 탭(세션)당 한 번만 집계 — 같은 방문자가 페이지를 옮겨 다녀도 중복 집계되지 않는다.
export default function SiteVisitTracker() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem('site_visit_counted')) return;
      sessionStorage.setItem('site_visit_counted', '1');
    } catch {
      // sessionStorage 접근 불가(프라이빗 모드 등)해도 집계 자체는 시도한다.
    }
    incrementSiteVisit().catch(() => {});
  }, []);

  return null;
}
