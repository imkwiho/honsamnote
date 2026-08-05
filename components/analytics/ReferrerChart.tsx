'use client';

import type { ReferrersData } from './types';
import { DEVICE_LABELS } from './types';
import AnalyticsCard, { CardEmptyState, CardErrorState, CardLoadingState } from './AnalyticsCard';

interface Props {
  data: ReferrersData | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

function Bar({ label, visitors, ratio }: { label: string; visitors: number; ratio: number }) {
  const pct = Math.round(ratio * 100);
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 text-[12.5px] text-[#5c584e]">{label}</span>
      <div className="flex-1 h-2 bg-[#f2efe8] rounded-full overflow-hidden">
        <div className="h-full bg-[#8a9a7a] rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-24 shrink-0 text-right text-[12px] text-[#8a8377]">
        {visitors.toLocaleString()}명 · {pct}%
      </span>
    </div>
  );
}

export default function ReferrerChart({ data, loading, error, onRetry }: Props) {
  return (
    <AnalyticsCard title="유입 경로">
      {loading && !data && <CardLoadingState />}
      {error && !data && <CardErrorState message={error} onRetry={onRetry} />}
      {data && data.referrers.every(r => r.visitors === 0) && <CardEmptyState />}
      {data && !data.referrers.every(r => r.visitors === 0) && (
        <div className="space-y-3">
          {data.referrers.map(r => (
            <Bar key={r.group} label={r.label} visitors={r.visitors} ratio={r.ratio} />
          ))}
        </div>
      )}

      {data && data.devices.length > 0 && (
        <div className="mt-6 pt-5 border-t border-[#f0ece2]">
          <p className="text-[12px] font-semibold text-[#8a8377] mb-3">기기 유형</p>
          <div className="space-y-3">
            {data.devices.map(d => (
              <Bar key={d.device} label={DEVICE_LABELS[d.device] ?? d.device} visitors={d.visitors} ratio={d.ratio} />
            ))}
          </div>
        </div>
      )}

      {data && (data.utm.sources.length > 0 || data.utm.campaigns.length > 0) && (
        <div className="mt-6 pt-5 border-t border-[#f0ece2] grid grid-cols-1 sm:grid-cols-2 gap-5">
          {data.utm.sources.length > 0 && (
            <div>
              <p className="text-[12px] font-semibold text-[#8a8377] mb-2">UTM 소스별 방문자</p>
              <ul className="space-y-1.5">
                {data.utm.sources.map(s => (
                  <li key={s.source} className="flex justify-between text-[12.5px] text-[#5c584e]">
                    <span className="truncate pr-2">{s.source}</span>
                    <span className="text-[#8a8377] shrink-0">{s.visitors.toLocaleString()}명</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {data.utm.campaigns.length > 0 && (
            <div>
              <p className="text-[12px] font-semibold text-[#8a8377] mb-2">주요 유입 캠페인 (조회수)</p>
              <ul className="space-y-1.5">
                {data.utm.campaigns.map(c => (
                  <li key={c.campaign} className="flex justify-between text-[12.5px] text-[#5c584e]">
                    <span className="truncate pr-2">{c.campaign}</span>
                    <span className="text-[#8a8377] shrink-0">{c.pageViews.toLocaleString()}회</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </AnalyticsCard>
  );
}
