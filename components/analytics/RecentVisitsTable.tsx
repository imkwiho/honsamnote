'use client';

import type { RecentData } from './types';
import { DEVICE_LABELS } from './types';
import { ANALYTICS_CATEGORY_ORDER } from '@/lib/analytics/config';
import AnalyticsCard, { CardEmptyState, CardErrorState, CardLoadingState } from './AnalyticsCard';

interface Props {
  data: RecentData | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(ANALYTICS_CATEGORY_ORDER.map(c => [c.key, c.label]));

export default function RecentVisitsTable({ data, loading, error, onRetry }: Props) {
  return (
    <AnalyticsCard title="최근 방문 기록">
      {loading && !data && <CardLoadingState />}
      {error && !data && <CardErrorState message={error} onRetry={onRetry} />}
      {data && data.visits.length === 0 && <CardEmptyState />}
      {data && data.visits.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px] text-left min-w-[640px]">
            <thead>
              <tr className="text-[#a8a196] border-b border-[#f0ece2]">
                <th className="pb-2 pr-3 font-medium whitespace-nowrap">방문 시각</th>
                <th className="pb-2 pr-3 font-medium">방문자</th>
                <th className="pb-2 pr-3 font-medium">페이지</th>
                <th className="pb-2 pr-3 font-medium">카테고리</th>
                <th className="pb-2 pr-3 font-medium">유입 경로</th>
                <th className="pb-2 pr-3 font-medium">기기</th>
                <th className="pb-2 font-medium">구분</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f7f5f0]">
              {data.visits.map((v, i) => (
                <tr key={`${v.visitorIdShort}-${v.visitedAt}-${i}`}>
                  <td className="py-2 pr-3 text-[#a8a196] whitespace-nowrap">{v.visitedAt}</td>
                  <td className="py-2 pr-3 font-mono text-[#8a8377]">{v.visitorIdShort}</td>
                  <td className="py-2 pr-3 max-w-[220px] truncate text-[#33302b]">{v.pageTitle ?? '-'}</td>
                  <td className="py-2 pr-3 text-[#8a8377]">{v.category ? CATEGORY_LABELS[v.category] ?? v.category : '-'}</td>
                  <td className="py-2 pr-3 text-[#8a8377]">{v.referrerGroupLabel ?? '-'}</td>
                  <td className="py-2 pr-3 text-[#8a8377]">{v.deviceType ? DEVICE_LABELS[v.deviceType] ?? v.deviceType : '-'}</td>
                  <td className="py-2">
                    {v.isNewVisit ? (
                      <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-[#f3f6ee] text-[#5f7052]">신규 방문</span>
                    ) : (
                      <span className="text-[11px] text-[#c2bca9]">재방문</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AnalyticsCard>
  );
}
