'use client';

import type { TrendData } from './types';
import AnalyticsCard, { CardEmptyState, CardErrorState, CardLoadingState } from './AnalyticsCard';

interface Props {
  data: TrendData | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

const CHART_HEIGHT = 140;
const BAR_GAP = 3;
const MIN_BAR_WIDTH = 8;

// 무거운 차트 라이브러리 없이 가벼운 SVG로 최근 30일 방문자/조회수 막대그래프를 그린다.
export default function VisitorTrendChart({ data, loading, error, onRetry }: Props) {
  if (loading && !data) {
    return (
      <AnalyticsCard title="최근 30일 방문 추이">
        <CardLoadingState />
      </AnalyticsCard>
    );
  }
  if (error && !data) {
    return (
      <AnalyticsCard title="최근 30일 방문 추이">
        <CardErrorState message={error} onRetry={onRetry} />
      </AnalyticsCard>
    );
  }
  if (!data || data.trend.every(d => d.pageViews === 0)) {
    return (
      <AnalyticsCard title="최근 30일 방문 추이">
        <CardEmptyState />
      </AnalyticsCard>
    );
  }

  const { trend } = data;
  const maxValue = Math.max(...trend.map(d => Math.max(d.visitors, d.pageViews)), 1);
  const barWidth = Math.max(MIN_BAR_WIDTH, 24);
  const groupWidth = barWidth * 2 + BAR_GAP * 2;
  const chartWidth = groupWidth * trend.length;

  return (
    <AnalyticsCard title="최근 30일 방문 추이">
      <div className="flex items-center gap-4 mb-3 text-[11.5px]">
        <span className="flex items-center gap-1.5 text-[#5c584e]">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#8a9a7a] inline-block" /> 방문자
        </span>
        <span className="flex items-center gap-1.5 text-[#5c584e]">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#d9cfae] inline-block" /> 조회수
        </span>
      </div>
      <div className="overflow-x-auto">
        <svg
          width={chartWidth}
          height={CHART_HEIGHT + 24}
          viewBox={`0 0 ${chartWidth} ${CHART_HEIGHT + 24}`}
          role="img"
          aria-label="최근 30일 방문자 및 조회수 추이 막대그래프"
          className="min-w-full"
        >
          {trend.map((d, i) => {
            const x = i * groupWidth;
            const visitorsH = Math.round((d.visitors / maxValue) * CHART_HEIGHT);
            const viewsH = Math.round((d.pageViews / maxValue) * CHART_HEIGHT);
            const showLabel = trend.length <= 10 || i % 5 === 0 || i === trend.length - 1;
            const dayLabel = d.date.slice(5); // MM-DD
            return (
              <g key={d.date}>
                <rect
                  x={x}
                  y={CHART_HEIGHT - visitorsH}
                  width={barWidth}
                  height={Math.max(visitorsH, d.visitors > 0 ? 2 : 0)}
                  rx={2}
                  fill="#8a9a7a"
                >
                  <title>{`${d.date} · 방문자 ${d.visitors}명`}</title>
                </rect>
                <rect
                  x={x + barWidth + BAR_GAP}
                  y={CHART_HEIGHT - viewsH}
                  width={barWidth}
                  height={Math.max(viewsH, d.pageViews > 0 ? 2 : 0)}
                  rx={2}
                  fill="#d9cfae"
                >
                  <title>{`${d.date} · 조회수 ${d.pageViews}회`}</title>
                </rect>
                {showLabel && (
                  <text x={x + groupWidth / 2} y={CHART_HEIGHT + 16} textAnchor="middle" fontSize="10" fill="#a8a196">
                    {dayLabel}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </AnalyticsCard>
  );
}
