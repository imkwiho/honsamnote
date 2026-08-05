'use client';

import { useCallback, useState } from 'react';
import { usePolling } from './usePolling';
import { fetchAdminAnalytics } from './fetchAdminAnalytics';
import type { SummaryData, ReferrersData, CategoriesData, PostsData, RecentData, TrendData, PostsPeriod } from './types';
import AnalyticsSummaryCards from './AnalyticsSummaryCards';
import ReferrerChart from './ReferrerChart';
import CategoryStatsTable from './CategoryStatsTable';
import PopularPostsTable from './PopularPostsTable';
import VisitorTrendChart from './VisitorTrendChart';
import RecentVisitsTable from './RecentVisitsTable';

// 갱신 주기(스펙 그대로): 현재 접속자/오늘 방문자·조회수는 summary에 함께
// 담겨 있어 30초, 유입경로/카테고리/최근방문은 60초, 30일 추이는 5분.
const SUMMARY_INTERVAL_MS = 30_000;
const SIXTY_SECOND_INTERVAL_MS = 60_000;
const TREND_INTERVAL_MS = 5 * 60_000;

/**
 * Cloudflare D1 기반 방문자 통계 대시보드. 기존 관리자 대시보드(Firebase 기반
 * 인기글/구독자 섹션)는 그대로 두고, 이 컴포넌트를 그 아래에 추가로 배치한다.
 * 섹션마다 독립적으로 폴링하므로 하나가 실패해도 다른 카드는 정상 표시된다.
 */
export default function AnalyticsDashboard() {
  const [postsPeriod, setPostsPeriod] = useState<PostsPeriod>('30d');

  const summaryFetcher = useCallback(() => fetchAdminAnalytics<SummaryData>('/api/admin/analytics/summary'), []);
  const referrersFetcher = useCallback(() => fetchAdminAnalytics<ReferrersData>('/api/admin/analytics/referrers'), []);
  const categoriesFetcher = useCallback(() => fetchAdminAnalytics<CategoriesData>('/api/admin/analytics/categories'), []);
  const recentFetcher = useCallback(() => fetchAdminAnalytics<RecentData>('/api/admin/analytics/recent'), []);
  const trendFetcher = useCallback(() => fetchAdminAnalytics<TrendData>('/api/admin/analytics/trend'), []);
  const postsFetcher = useCallback(
    () => fetchAdminAnalytics<PostsData>(`/api/admin/analytics/posts?period=${postsPeriod}`),
    [postsPeriod]
  );

  const summary = usePolling(summaryFetcher, SUMMARY_INTERVAL_MS);
  const referrers = usePolling(referrersFetcher, SIXTY_SECOND_INTERVAL_MS);
  const categories = usePolling(categoriesFetcher, SIXTY_SECOND_INTERVAL_MS);
  const recent = usePolling(recentFetcher, SIXTY_SECOND_INTERVAL_MS);
  const trend = usePolling(trendFetcher, TREND_INTERVAL_MS);
  const posts = usePolling(postsFetcher, SIXTY_SECOND_INTERVAL_MS);

  function handlePeriodChange(period: PostsPeriod) {
    setPostsPeriod(period);
    // period가 바뀌면 폴링 훅의 fetcher 클로저도 바뀌지만, 다음 인터벌까지
    // 기다리지 않도록 바로 한 번 다시 불러온다.
    setTimeout(posts.refetch, 0);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-[#33302b] mb-1">방문자 통계 (Cloudflare D1)</h2>
        <p className="text-[12px] text-[#a8a196]">Firebase 없이 Cloudflare D1으로 집계 · 한국 시간(Asia/Seoul) 기준</p>
      </div>

      <AnalyticsSummaryCards data={summary.data} loading={summary.loading} error={summary.error} onRetry={summary.refetch} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ReferrerChart data={referrers.data} loading={referrers.loading} error={referrers.error} onRetry={referrers.refetch} />
        <CategoryStatsTable data={categories.data} loading={categories.loading} error={categories.error} onRetry={categories.refetch} />
      </div>

      <PopularPostsTable
        data={posts.data}
        loading={posts.loading}
        error={posts.error}
        onRetry={posts.refetch}
        period={postsPeriod}
        onPeriodChange={handlePeriodChange}
      />

      <VisitorTrendChart data={trend.data} loading={trend.loading} error={trend.error} onRetry={trend.refetch} />

      <RecentVisitsTable data={recent.data} loading={recent.loading} error={recent.error} onRetry={recent.refetch} />
    </div>
  );
}
