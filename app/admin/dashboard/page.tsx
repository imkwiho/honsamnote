'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAllViewCounts, getTopPosts } from '@/lib/views';
import { getSubscriberCount, getRecentSubscribers } from '@/lib/subscribers';
import { getSiteVisitCount } from '@/lib/visits';
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';

interface PostMeta {
  slug: string;
  title: string;
  date: string;
}

interface ViewData {
  slug: string;
  count: number;
  title?: string;
  date?: string;
}

interface Subscriber {
  email: string;
  subscribedAt: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [totalVisitors, setTotalVisitors] = useState(0);
  const [totalViews, setTotalViews] = useState(0);
  const [topPosts, setTopPosts] = useState<ViewData[]>([]);
  const [allViews, setAllViews] = useState<ViewData[]>([]);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [recentSubs, setRecentSubs] = useState<Subscriber[]>([]);

  useEffect(() => {
    // localStorage 대신 서버에 현재 로그인 상태를 물어본다 — 로그인 시
    // 발급되는 세션 쿠키가 HttpOnly라 클라이언트 JS는 직접 확인할 수 없다.
    async function checkSessionThenLoad() {
      try {
        const res = await fetch('/api/admin/session');
        if (!res.ok) {
          router.push('/admin/login');
          return;
        }
      } catch {
        router.push('/admin/login');
        return;
      }
      await load();
    }

    async function load() {
      try {
        const [postsRes, viewCounts, top, subCount, subs, visitorCount] = await Promise.all([
          fetch('/api/posts').then(r => r.json()) as Promise<PostMeta[]>,
          getAllViewCounts(),
          getTopPosts(10),
          getSubscriberCount(),
          getRecentSubscribers(10),
          getSiteVisitCount(),
        ]);

        const postMap: Record<string, PostMeta> = {};
        postsRes.forEach((p: PostMeta) => { postMap[p.slug] = p; });

        const enrich = (data: { slug: string; count: number }[]) =>
          data.map(v => ({ ...v, title: postMap[v.slug]?.title ?? v.slug, date: postMap[v.slug]?.date ?? '' }));

        setTotalVisitors(visitorCount);
        setTotalViews(viewCounts.reduce((s, v) => s + v.count, 0));
        setTopPosts(enrich(top));
        setAllViews(enrich(viewCounts).sort((a, b) => b.count - a.count));
        setSubscriberCount(subCount);
        setRecentSubs(subs);
      } finally {
        setLoading(false);
      }
    }
    checkSessionThenLoad();
  }, [router]);

  async function logout() {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch {
      // 네트워크 오류가 나도 어차피 로그인 화면으로 보낸다.
    }
    router.push('/admin/login');
  }

  if (loading) {
    return <div className="text-center py-20 text-gray-400">로딩 중...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">관리자 대시보드</h1>
        <div className="flex items-center gap-4">
          <a href="/admin/seo" className="text-sm text-[#5f7052] hover:underline font-medium">SEO 관리 →</a>
          <button onClick={logout} className="text-sm text-gray-500 hover:text-red-500 transition-colors">로그아웃</button>
        </div>
      </div>

      {/* Cloudflare D1 방문자 통계 (신규) */}
      <div className="mb-10">
        <AnalyticsDashboard />
      </div>

      <div className="border-t border-gray-200 pt-8 mb-6">
        <p className="text-[12px] font-semibold tracking-wide uppercase text-gray-400">기존 Firebase 통계</p>
      </div>

      {/* 요약 카드 (Firebase, 기존) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-[#c9d4bd] rounded-xl p-6 ring-1 ring-[#eef1e6]">
          <p className="text-sm text-gray-500 mb-1">전체 방문자 수</p>
          <p className="text-3xl font-bold text-[#5f7052]">{totalVisitors.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <p className="text-sm text-gray-500 mb-1">전체 글 조회수</p>
          <p className="text-3xl font-bold text-gray-900">{totalViews.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <p className="text-sm text-gray-500 mb-1">구독자 수</p>
          <p className="text-3xl font-bold text-gray-900">{subscriberCount.toLocaleString()}</p>
        </div>
      </div>

      {/* 인기글 TOP 10 */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">인기글 TOP 10</h2>
        {topPosts.length === 0 ? (
          <p className="text-gray-400 text-sm">데이터가 없습니다.</p>
        ) : (
          <ol className="space-y-2">
            {topPosts.map((post, i) => (
              <li key={post.slug} className="flex items-center gap-3 text-sm">
                <span className="w-5 text-gray-400 text-right">{i + 1}</span>
                <a href={`/blog/${post.slug}`} className="flex-1 text-gray-800 hover:text-[#5f7052] transition-colors truncate">
                  {post.title}
                </a>
                <span className="text-gray-500 font-medium">{post.count.toLocaleString()}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* 글별 조회수 테이블 */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 overflow-x-auto">
        <h2 className="text-base font-semibold text-gray-800 mb-4">글별 조회수</h2>
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="text-gray-400 border-b border-gray-100">
              <th className="pb-2 pr-4 font-medium">제목</th>
              <th className="pb-2 pr-4 font-medium text-right">조회수</th>
              <th className="pb-2 pr-4 font-medium">작성일</th>
              <th className="pb-2 font-medium">링크</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {allViews.map(post => (
              <tr key={post.slug}>
                <td className="py-2 pr-4 text-gray-800 max-w-xs truncate">{post.title}</td>
                <td className="py-2 pr-4 text-gray-700 text-right font-medium">{post.count.toLocaleString()}</td>
                <td className="py-2 pr-4 text-gray-400">{post.date}</td>
                <td className="py-2">
                  <a href={`/blog/${post.slug}`} className="text-[#6b7d5e] hover:underline">보기</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 최근 구독자 */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">최근 구독자 10명</h2>
        {recentSubs.length === 0 ? (
          <p className="text-gray-400 text-sm">구독자가 없습니다.</p>
        ) : (
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-gray-400 border-b border-gray-100">
                <th className="pb-2 pr-4 font-medium">이메일</th>
                <th className="pb-2 font-medium">구독일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentSubs.map(sub => (
                <tr key={sub.email}>
                  <td className="py-2 pr-4 text-gray-800">{sub.email}</td>
                  <td className="py-2 text-gray-400">{sub.subscribedAt.split('T')[0]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
