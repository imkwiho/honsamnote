'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// 신뢰 상태 레이블 (4단계 §23)
type TrustStatus =
  | 'VERIFIED'
  | 'REVIEW_REQUIRED'
  | 'HIGH_RISK_HOLD'
  | 'FACTCHECK_REQUIRED'
  | 'OUTDATED_RISK'
  | 'CONTENT_ALIGNMENT'
  | 'STRONG'
  | 'DUPLICATE_RISK';

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
  // 4단계 추가
  trustStatus?: TrustStatus | null;
  factcheckStatus?: string | null;
  isPrimaryPage?: boolean;
  authorityScore?: number | null;
}

// 5단계 추가: Fact-check 현황 데이터 타입
interface FactcheckSummary {
  p1Total: number;
  p1VerifiedCorrect: number;
  p1ContextRequired: number;
  p1NeedsExternal: number;
  p2Total: number;
  p2RecheckRequired: number;
  highStrongClaims: number;
  strongClaimKeep: number;
  strongClaimSoften: number;
  strongClaimReview: number;
  gscConnected: boolean;
  gscLastImport: string | null;
}

interface SeoData {
  generatedAt: string;
  summary: Record<string, number>;
  posts: SeoPostRow[];
  factcheckSummary?: FactcheckSummary | null;
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
      <p className="text-[12px] text-gray-400 mb-4">생성 시각: {new Date(data.generatedAt).toLocaleString('ko-KR')} (빌드 시점 기준 정적 스냅샷)</p>

      {/* 검색 데이터 연결 상태 (4단계 §20) */}
      <div className="mb-6 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-[12px] text-amber-700 flex items-center gap-2">
        <span>📡</span>
        <span>검색 데이터 미연결 — Google Search Console 데이터를 연결하면 실제 클릭·노출·순위 데이터를 확인할 수 있습니다.</span>
        <code className="ml-auto text-[11px] bg-amber-100 px-2 py-0.5 rounded">npx tsx scripts/import-search-console.ts &lt;gsc-export.csv&gt;</code>
      </div>

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

      {/* §28 Fact-check 현황 패널 */}
      {data.factcheckSummary && (
        <div className="mb-6 bg-white border border-gray-200 rounded-xl p-4">
          <h2 className="text-[13px] font-semibold text-gray-700 mb-3">🔍 Fact-check 현황</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="text-center">
              <p className="text-[10px] text-gray-400 mb-0.5">P1 전체</p>
              <p className="text-lg font-bold text-red-600">{data.factcheckSummary.p1Total}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-gray-400 mb-0.5">P1 검증완료</p>
              <p className="text-lg font-bold text-green-600">{data.factcheckSummary.p1VerifiedCorrect}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-gray-400 mb-0.5">P1 맥락확인</p>
              <p className="text-lg font-bold text-amber-600">{data.factcheckSummary.p1ContextRequired}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-gray-400 mb-0.5">P1 외부확인필요</p>
              <p className="text-lg font-bold text-red-500">{data.factcheckSummary.p1NeedsExternal}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-gray-400 mb-0.5">P2 전체</p>
              <p className="text-lg font-bold text-orange-500">{data.factcheckSummary.p2Total}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-gray-400 mb-0.5">P2 재검토필요</p>
              <p className="text-lg font-bold text-orange-400">{data.factcheckSummary.p2RecheckRequired}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-gray-400 mb-0.5">HIGH단정(KEEP)</p>
              <p className="text-lg font-bold text-green-500">{data.factcheckSummary.strongClaimKeep}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-gray-400 mb-0.5">HIGH단정(완화권고)</p>
              <p className="text-lg font-bold text-amber-500">{data.factcheckSummary.strongClaimSoften}</p>
            </div>
          </div>
        </div>
      )}

      {/* §29 GSC 연결 상태 */}
      <div className="mb-6 bg-white border border-gray-200 rounded-xl p-4">
        <h2 className="text-[13px] font-semibold text-gray-700 mb-2">📡 Google Search Console</h2>
        {data.factcheckSummary?.gscConnected ? (
          <div className="text-[12px] text-green-700">
            ✅ 데이터 연결됨 (마지막 임포트: {data.factcheckSummary.gscLastImport ?? '알 수 없음'})
          </div>
        ) : (
          <div className="text-[12px] text-amber-700 flex items-center gap-2">
            <span>⚠️ 검색 데이터 미연결 — 실제 클릭·노출·순위 데이터 없음</span>
            <code className="text-[10px] bg-amber-50 border border-amber-200 px-2 py-0.5 rounded ml-auto">
              npx tsx scripts/import-search-console.ts &lt;gsc.csv&gt;
            </code>
          </div>
        )}
      </div>

      {/* §30 SEO Action Queue */}
      <div className="mb-6 bg-white border border-gray-200 rounded-xl p-4">
        <h2 className="text-[13px] font-semibold text-gray-700 mb-3">⚡ 우선 작업 큐</h2>
        <div className="space-y-2 text-[12px]">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-[10px] font-bold shrink-0">1</span>
            <span className="text-gray-700">P1 Fact-check — 법률·안전·보증금 표현 공식 출처 확인</span>
            {data.factcheckSummary && <span className="ml-auto text-red-600 font-semibold">{data.factcheckSummary.p1NeedsExternal}건 대기</span>}
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-[10px] font-bold shrink-0">2</span>
            <span className="text-gray-700">GSC 연결 후 고노출·저클릭 페이지 개선</span>
            <span className="ml-auto text-gray-400">{data.factcheckSummary?.gscConnected ? '대기 중' : 'GSC 연결 필요'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] font-bold shrink-0">3</span>
            <span className="text-gray-700">Position 5~20 페이지 본문 답변 강화</span>
            <span className="ml-auto text-gray-400">GSC 연결 후</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center text-[10px] font-bold shrink-0">4</span>
            <span className="text-gray-700">Answer-first 후보 개선</span>
            <span className="ml-auto text-amber-600 font-semibold">62건 대기</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-[10px] font-bold shrink-0">5</span>
            <span className="text-gray-700">P2 재검토 (가격·비용·요금 정보 현행화)</span>
            {data.factcheckSummary && <span className="ml-auto text-gray-500">{data.factcheckSummary.p2Total}건</span>}
          </div>
        </div>
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
                    {p.factcheckStatus === 'HIGH_RISK_HOLD' && <Badge label="HIGH-RISK" tone="HIGH" />}
                    {p.factcheckStatus === 'FACTCHECK_REQUIRED' && <Badge label="검증필요" tone="MEDIUM" />}
                    {p.isPrimaryPage && <Badge label="대표글" tone="HIGH" />}
                    {p.authorityScore != null && p.authorityScore < 30 && <Badge label="권위낮음" tone="LOW" />}
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
