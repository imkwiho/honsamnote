'use client';

import Link from 'next/link';
import type { PostsData, PostsPeriod } from './types';
import AnalyticsCard, { CardEmptyState, CardErrorState, CardLoadingState } from './AnalyticsCard';

interface Props {
  data: PostsData | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  period: PostsPeriod;
  onPeriodChange: (period: PostsPeriod) => void;
}

const PERIOD_OPTIONS: { value: PostsPeriod; label: string }[] = [
  { value: 'today', label: '오늘' },
  { value: '7d', label: '최근 7일' },
  { value: '30d', label: '최근 30일' },
  { value: 'all', label: '전체' },
];

export default function PopularPostsTable({ data, loading, error, onRetry, period, onPeriodChange }: Props) {
  return (
    <AnalyticsCard
      title="많이 본 글"
      right={
        <div className="flex gap-1 bg-[#f7f5f0] rounded-lg p-0.5">
          {PERIOD_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => onPeriodChange(opt.value)}
              className={`px-2.5 py-1 text-[11.5px] font-medium rounded-md transition-colors ${
                period === opt.value ? 'bg-white text-[#33302b] shadow-sm' : 'text-[#a8a196] hover:text-[#5c584e]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      }
    >
      {loading && !data && <CardLoadingState />}
      {error && !data && <CardErrorState message={error} onRetry={onRetry} />}
      {data && data.posts.length === 0 && <CardEmptyState message="선택한 기간에 조회된 글이 없습니다." />}
      {data && data.posts.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] text-left min-w-[560px]">
            <thead>
              <tr className="text-[#a8a196] border-b border-[#f0ece2]">
                <th className="pb-2 pr-3 font-medium w-8">#</th>
                <th className="pb-2 pr-4 font-medium">글 제목</th>
                <th className="pb-2 pr-4 font-medium">카테고리</th>
                <th className="pb-2 pr-4 font-medium text-right">조회수</th>
                <th className="pb-2 pr-4 font-medium text-right">방문자</th>
                <th className="pb-2 font-medium">최근 조회</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f7f5f0]">
              {data.posts.map(p => (
                <tr key={p.postSlug}>
                  <td className="py-2.5 pr-3 text-[#a8a196]">{p.rank}</td>
                  <td className="py-2.5 pr-4 max-w-[280px] truncate">
                    <Link href={`/blog/${p.postSlug}`} className="text-[#33302b] hover:text-[#6b7d5e] transition-colors">
                      {p.pageTitle}
                    </Link>
                  </td>
                  <td className="py-2.5 pr-4 text-[#8a8377]">{p.category ?? '-'}</td>
                  <td className="py-2.5 pr-4 text-right text-[#5c584e]">{p.views.toLocaleString()}</td>
                  <td className="py-2.5 pr-4 text-right text-[#5c584e]">{p.visitors.toLocaleString()}</td>
                  <td className="py-2.5 text-[#a8a196] whitespace-nowrap">{p.lastViewedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && !data.dwellTimeSupported && (
        <p className="mt-3 text-[11px] text-[#c2bca9]">
          평균 체류시간은 정확한 측정을 위해 별도 이벤트가 필요해 1차 구현에서는 제외했습니다.
        </p>
      )}
    </AnalyticsCard>
  );
}
