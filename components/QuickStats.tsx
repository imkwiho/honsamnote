'use client';

import { useState, useEffect } from 'react';
import { getTopPosts } from '@/lib/views';

interface StatItem { slug: string; count: number }

export default function QuickStats() {
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState<StatItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('admin_auth');
      if (raw) {
        const { expiry } = JSON.parse(raw);
        if (Date.now() < expiry) setIsAdmin(true);
      }
    } catch {}
  }, []);

  async function handleOpen() {
    if (!isAdmin) {
      window.location.href = '/admin/login/';
      return;
    }
    setOpen(true);
    if (stats.length === 0) {
      setLoading(true);
      try {
        const top = await getTopPosts(8);
        setStats(top);
      } catch {}
      setLoading(false);
    }
  }

  return (
    <>
      {/* 떠있는 트래픽 아이콘 */}
      <button
        onClick={handleOpen}
        title="트래픽 현황"
        className="fixed bottom-5 left-5 z-40 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95"
        style={{ background: '#1d1d1f', color: '#f5f5f7' }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      </button>

      {/* 팝업 오버레이 */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-sm rounded-3xl p-6 shadow-2xl"
            style={{ background: '#fff' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[11px] font-semibold tracking-widest uppercase text-[#aeaeb2]">트래픽 현황</p>
                <h3 className="text-[17px] font-bold text-[#1d1d1f]">인기 게시물 조회수</h3>
              </div>
              <button onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-full bg-[#f5f5f7] flex items-center justify-center text-[#6e6e73] hover:bg-[#e5e5ea] transition-colors">
                ✕
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-[#6e6e73] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : stats.length === 0 ? (
              <p className="text-[13px] text-[#aeaeb2] text-center py-6">데이터가 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {stats.map((s, i) => (
                  <div key={s.slug} className="flex items-center gap-3">
                    <span className="text-[11px] font-bold text-[#aeaeb2] w-4 shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-[#1d1d1f] truncate">{s.slug}</p>
                      <div className="mt-0.5 h-1.5 bg-[#f5f5f7] rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-[#1d1d1f]"
                          style={{ width: `${Math.round((s.count / (stats[0]?.count || 1)) * 100)}%` }} />
                      </div>
                    </div>
                    <span className="text-[12px] font-semibold text-[#6e6e73] shrink-0">{s.count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}

            <a href="/admin/dashboard/"
              className="mt-5 block text-center text-[12px] font-semibold text-[#6e6e73] hover:text-[#1d1d1f] transition-colors">
              전체 대시보드 →
            </a>
          </div>
        </div>
      )}
    </>
  );
}
