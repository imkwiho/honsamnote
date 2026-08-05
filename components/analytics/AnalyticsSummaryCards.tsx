'use client';

import type { SummaryData } from './types';
import { CardErrorState, CardLoadingState } from './AnalyticsCard';

interface Props {
  data: SummaryData | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

function NumberCard({ label, visitors, pageViews }: { label: string; visitors: number; pageViews?: number }) {
  return (
    <div className="bg-white border border-[#e7e2d6] rounded-2xl p-5">
      <p className="text-[12px] text-[#8a8377] mb-1">{label}</p>
      <p className="text-[26px] font-bold text-[#33302b] leading-tight">{visitors.toLocaleString()}명</p>
      {pageViews !== undefined && (
        <p className="text-[11.5px] text-[#a8a196] mt-1">조회수 {pageViews.toLocaleString()}회</p>
      )}
    </div>
  );
}

export default function AnalyticsSummaryCards({ data, loading, error, onRetry }: Props) {
  if (loading && !data) {
    return (
      <div className="bg-white border border-[#e7e2d6] rounded-2xl">
        <CardLoadingState />
      </div>
    );
  }
  if (error && !data) {
    return (
      <div className="bg-white border border-[#e7e2d6] rounded-2xl">
        <CardErrorState message={error} onRetry={onRetry} />
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
      <NumberCard label="오늘" visitors={data.todayVisitors} pageViews={data.todayPageViews} />
      <NumberCard label="어제" visitors={data.yesterdayVisitors} pageViews={data.yesterdayPageViews} />
      <NumberCard label="이번 달" visitors={data.monthVisitors} pageViews={data.monthPageViews} />
      <NumberCard label="전체" visitors={data.totalVisitors} pageViews={data.totalPageViews} />
      <div className="bg-[#f3f6ee] border border-[#c9d4bd] rounded-2xl p-5">
        <p className="text-[12px] text-[#6b7d5e] mb-1 flex items-center gap-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#7c8f6e] opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#5f7052]" />
          </span>
          현재 접속 중
        </p>
        <p className="text-[26px] font-bold text-[#49573f] leading-tight">{data.activeVisitors.toLocaleString()}명</p>
        <p className="text-[11px] text-[#8a9a7a] mt-1">최근 5분 기준</p>
      </div>
    </div>
  );
}
