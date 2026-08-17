'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface SeoPostRow {
  slug: string;
  title: string;
  seoTitle: string;
  primaryKeyword: string;
  clusterId: string;
  clusterName: string;
  pillarSlug: string | null;
  pillarName: string | null;
  category: string | null;
  categoryName: string | null;
  titleConfidence: 'HIGH' | 'MEDIUM' | 'LOW';
  titleNeedsFix: boolean;
  metaNeedsFix: boolean;
  outgoingLinks: number;
  incomingLinks: number;
  isOrphan: boolean;
  isClusterUnassigned: boolean;
  isPillarUnlinked: boolean;
  isMergeCandidate: boolean;
  isCannibalizationCandidate: boolean;
  isFactcheckNeeded: boolean;
}

interface SeoData {
  generatedAt: string;
  summary: Record<string, number>;
  posts: SeoPostRow[];
}

const SUMMARY_LABELS: Record<string, string> = {
  totalPosts: '전체 글 수',
  titleFixNeeded: 'title 수정 필요',
  metaFixNeeded: 'description 수정 필요',
  noInternalLinks: '내부링크 없는 글',
  orphanPages: 'orphan 페이지',
  clusterUnassigned: 'cluster 미지정',
  pillarUnlinked: 'pillar 미연결',
  mergeCandidates: '통합 후보',
  cannibalizationCandidates: '역할분리 후보',
  factcheckNeeded: 'fact-check 필요',
};

type FilterKey = 'titleNeedsFix' | 'metaNeedsFix' | 'isOrphan' | 'isMergeCandidate' | 'isCannibalizationCandidate' | 'isFactcheckNeeded';

const PAGE_SIZE = 30;

export default function AdminSeoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SeoData | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [flagFilter, setFlagFilter] = useState<FilterKey | ''>('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    async function checkThenLoad() {
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
      try {
        const res = await fetch('/api/seo-data');
        const json = (await res.json()) as SeoData;
        setData(json);
      } finally {
        setLoading(false);
      }
    }
    checkThenLoad();
  }, [router]);

  const categories = useMemo(() => {
    if (!data) return [];
    const set = new Set(data.posts.map(p => p.categoryName).filter((c): c is string => !!c));
    return [...set].sort();
  }, [data]);

  const filteredPosts = useMemo(() => {
    if (!data) return [];
    return data.posts.filter(p => {
      if (categoryFilter && p.categoryName !== categoryFilter) return false;
      if (flagFilter && !p[flagFilter]) return false;
      return true;
    });
  }, [data, categoryFilter, flagFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredPosts.length / PAGE_SIZE));
  const pagePosts = filteredPosts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (loading) {
    return <div className="text-center py-20 text-gray-400">로딩 중...</div>;
  }
  if (!data) {
    return <div className="text-center py-20 text-gray-400">데이터를 불러오지 못했습니다.</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-gray-900">SEO 관리</h1>
        <Link href="/admin/dashboard" className="text-sm text-gray-500 hover:text-[#5f7052] transition-colors">← 대시보드로</Link>
      </div>
      <p className="text-[12px] text-gray-400 mb-8">생성 시각: {new Date(data.generatedAt).toLocaleString('ko-KR')} (빌드 시점 기준 정적 스냅샷)</p>

      {/* 전체 현황 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
        {Object.entries(SUMMARY_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => {
              const map: Record<string, FilterKey> = {
                titleFixNeeded: 'titleNeedsFix',
                metaFixNeeded: 'metaNeedsFix',
                orphanPages: 'isOrphan',
                mergeCandidates: 'isMergeCandidate',
                cannibalizationCandidates: 'isCannibalizationCandidate',
                factcheckNeeded: 'isFactcheckNeeded',
              };
              if (map[key]) {
                setFlagFilter(prev => (prev === map[key] ? '' : map[key]));
                setPage(1);
              }
            }}
            className="text-left bg-white border border-gray-200 rounded-xl p-4 hover:border-[#7c8f6e] transition-colors"
          >
            <p className="text-[11px] text-gray-500 mb-1">{label}</p>
            <p className="text-xl font-bold text-[#5f7052]">{data.summary[key]?.toLocaleString() ?? 0}</p>
          </button>
        ))}
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select
          value={categoryFilter}
          onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
          className="text-[13px] border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700"
        >
          <option value="">전체 카테고리</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {flagFilter && (
          <button
            onClick={() => { setFlagFilter(''); setPage(1); }}
            className="text-[12px] text-[#5f7052] bg-[#eef1e6] px-3 py-1.5 rounded-full hover:opacity-80"
          >
            필터 해제 ×
          </button>
        )}
        <span className="text-[12px] text-gray-400">{filteredPosts.length}개 글</span>
      </div>

      {/* 게시글별 테이블 */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
        <table className="w-full text-[12.5px] text-left whitespace-nowrap">
          <thead>
            <tr className="text-gray-400 border-b border-gray-100">
              <th className="px-3 py-2 font-medium">제목</th>
              <th className="px-3 py-2 font-medium">SEO 제목</th>
              <th className="px-3 py-2 font-medium">대표 키워드</th>
              <th className="px-3 py-2 font-medium">Cluster</th>
              <th className="px-3 py-2 font-medium">Pillar</th>
              <th className="px-3 py-2 font-medium text-right">In</th>
              <th className="px-3 py-2 font-medium text-right">Out</th>
              <th className="px-3 py-2 font-medium">상태</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {pagePosts.map(p => (
              <tr key={p.slug}>
                <td className="px-3 py-2 max-w-[220px] truncate">
                  <a href={`/blog/${p.slug}`} className="text-gray-800 hover:text-[#5f7052]">{p.title}</a>
                </td>
                <td className="px-3 py-2 max-w-[200px] truncate text-gray-500">{p.seoTitle}</td>
                <td className="px-3 py-2 text-gray-500">{p.primaryKeyword || '—'}</td>
                <td className="px-3 py-2 text-gray-500">{p.clusterName}</td>
                <td className="px-3 py-2 text-gray-500">{p.pillarName ?? '—'}</td>
                <td className="px-3 py-2 text-right text-gray-700">{p.incomingLinks}</td>
                <td className="px-3 py-2 text-right text-gray-700">{p.outgoingLinks}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {p.titleNeedsFix && <Badge label="제목" tone={p.titleConfidence} />}
                    {p.metaNeedsFix && <Badge label="설명" tone="MEDIUM" />}
                    {p.isOrphan && <Badge label="orphan" tone="LOW" />}
                    {p.isMergeCandidate && <Badge label="통합후보" tone="HIGH" />}
                    {p.isCannibalizationCandidate && <Badge label="역할분리" tone="MEDIUM" />}
                    {p.isFactcheckNeeded && <Badge label="fact-check" tone="LOW" />}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="text-[12px] px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-30"
          >
            ← 이전
          </button>
          <span className="text-[12px] text-gray-500">{page} / {pageCount}</span>
          <button
            onClick={() => setPage(p => Math.min(pageCount, p + 1))}
            disabled={page === pageCount}
            className="text-[12px] px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-30"
          >
            다음 →
          </button>
        </div>
      )}
    </div>
  );
}

function Badge({ label, tone }: { label: string; tone: 'HIGH' | 'MEDIUM' | 'LOW' }) {
  const colors: Record<string, string> = {
    HIGH: 'bg-red-50 text-red-600',
    MEDIUM: 'bg-amber-50 text-amber-600',
    LOW: 'bg-gray-100 text-gray-500',
  };
  return <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${colors[tone]}`}>{label}</span>;
}
