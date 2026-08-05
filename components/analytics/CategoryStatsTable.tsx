'use client';

import type { CategoriesData } from './types';
import AnalyticsCard, { CardEmptyState, CardErrorState, CardLoadingState } from './AnalyticsCard';

interface Props {
  data: CategoriesData | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

export default function CategoryStatsTable({ data, loading, error, onRetry }: Props) {
  return (
    <AnalyticsCard title="카테고리별 조회">
      {loading && !data && <CardLoadingState />}
      {error && !data && <CardErrorState message={error} onRetry={onRetry} />}
      {data && data.categories.every(c => c.pageViews === 0) && <CardEmptyState />}
      {data && !data.categories.every(c => c.pageViews === 0) && (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] text-left min-w-[420px]">
            <thead>
              <tr className="text-[#a8a196] border-b border-[#f0ece2]">
                <th className="pb-2 pr-4 font-medium">카테고리</th>
                <th className="pb-2 pr-4 font-medium text-right">조회수</th>
                <th className="pb-2 pr-4 font-medium text-right">방문자</th>
                <th className="pb-2 font-medium text-right">비율</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f7f5f0]">
              {data.categories.map(c => (
                <tr key={c.category}>
                  <td className="py-2.5 pr-4 text-[#33302b] font-medium">{c.label}</td>
                  <td className="py-2.5 pr-4 text-right text-[#5c584e]">{c.pageViews.toLocaleString()}</td>
                  <td className="py-2.5 pr-4 text-right text-[#5c584e]">{c.visitors.toLocaleString()}</td>
                  <td className="py-2.5 text-right text-[#8a8377]">{Math.round(c.ratio * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AnalyticsCard>
  );
}
