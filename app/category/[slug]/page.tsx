import { getPostsByCategory } from '@/lib/mdx';
import { loadTopics } from '@/lib/topics';
import { classifyClusterDetailed, CLUSTER_TAXONOMY } from '@/lib/seoAudit';
import { PILLARS } from '@/lib/pillars';
import PaginatedPostList from '@/components/PaginatedPostList';
import AnalyticsMeta from '@/components/analytics/AnalyticsMeta';
import CategoryJsonLd from '@/components/seo/CategoryJsonLd';
import Breadcrumb from '@/components/seo/Breadcrumb';
import Link from 'next/link';
import { SITE_NAME, DEFAULT_OG_IMAGE, DEFAULT_OG_IMAGE_DIMENSIONS, type BreadcrumbNode } from '@/lib/seo';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ slug: string }>;
}

// 각 카테고리가 실제로 다루는 내용을 근거로 직접 작성한 소개문(허위/과장 없음).
const CATEGORY_INTRO: Record<string, string> = {
  cost: '전기세, 가스비, 통신비부터 생활비 전반까지 — 혼자 살 때 매달 나가는 고정비를 줄이는 방법을 다룹니다.',
  food: '식재료를 사고 보관하고 낭비 없이 다 먹는 것까지 — 혼자 먹는 식사에서 반복되는 고민을 다룹니다.',
  storage: '원룸처럼 좁은 공간에서 물건을 정리하고 보관하는 실질적인 수납 방법을 다룹니다.',
  cleaning: '욕실, 주방, 세탁까지 — 혼자 살면서 반복되는 청소와 집안일을 효율적으로 해결하는 방법을 다룹니다.',
  safety: '해충, 화재, 전기·가스 안전부터 응급상황 대처까지 — 혼자 살 때 스스로 챙겨야 하는 안전 문제를 다룹니다.',
  housing: '원룸 구하기부터 전월세 계약, 보증금, 이사까지 — 혼자 사는 주거 생활에서 꼭 알아야 할 절차를 다룹니다.',
  products: '1인 가구에 맞는 가전과 생활용품을 실제로 필요한지부터 따져보고 고르는 기준을 다룹니다.',
  lifestyle: '혼자 사는 삶에서 자연스럽게 찾아오는 관계, 생활 리듬, 외로움을 다루는 방법을 다룹니다.',
};

export async function generateStaticParams() {
  const data = loadTopics();
  return data.categories.map(c => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = loadTopics();
  const category = data.categories.find(c => c.slug === slug);
  if (!category) return {};

  const title = category.name;
  const description = CATEGORY_INTRO[slug] ?? `1인 가구를 위한 ${category.name} 관련 글을 한곳에 모았습니다.`;
  const canonicalPath = `/category/${slug}/`;

  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    robots: { index: true, follow: true },
    openGraph: {
      type: 'website',
      url: canonicalPath,
      siteName: SITE_NAME,
      title,
      description,
      images: [{ url: DEFAULT_OG_IMAGE, ...DEFAULT_OG_IMAGE_DIMENSIONS, alt: title }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [DEFAULT_OG_IMAGE] },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const data = loadTopics();
  const category = data.categories.find(c => c.slug === slug);
  if (!category) notFound();

  const posts = await getPostsByCategory(slug);
  const breadcrumbNodes: BreadcrumbNode[] = [{ name: SITE_NAME, href: '/' }, { name: category.name }];

  // 주요 하위 주제(클러스터)별 글 수 — 실제 데이터 기준으로 집계.
  const clusterDefs = CLUSTER_TAXONOMY[slug] ?? [];
  const clusterCounts = new Map<string, number>();
  for (const post of posts) {
    const { clusterSlug } = classifyClusterDetailed({ ...post, keywords: post.keywords ?? [], content: '' });
    clusterCounts.set(clusterSlug, (clusterCounts.get(clusterSlug) ?? 0) + 1);
  }
  const topClusters = clusterDefs
    .map(def => ({ name: def.name, count: clusterCounts.get(def.slug) ?? 0 }))
    .filter(c => c.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const categoryPillars = PILLARS.filter(p => (CLUSTER_TAXONOMY[slug] ?? []).some(def => def.slug === p.clusterId));

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <AnalyticsMeta contentType="category" category={slug} title={category.name} />
      <CategoryJsonLd slug={slug} breadcrumbNodes={breadcrumbNodes} />
      <Breadcrumb items={breadcrumbNodes} />
      <p className="text-[12px] font-semibold tracking-widest uppercase text-[#b0a893] mb-2">카테고리</p>
      <h1 className="text-2xl mb-3 text-[#2f2c26]" style={{ fontFamily: 'var(--font-serif)' }}>{category.name}</h1>
      {CATEGORY_INTRO[slug] && (
        <p className="text-[#8a8377] text-[14px] leading-relaxed mb-6 max-w-2xl">{CATEGORY_INTRO[slug]}</p>
      )}

      {(topClusters.length > 0 || categoryPillars.length > 0) && (
        <div className="bg-[#f6f2e9] border border-[#ece4d6] rounded-2xl p-5 mb-8">
          {categoryPillars.length > 0 && (
            <div className="mb-4">
              <p className="text-[12px] font-semibold text-[#7c8f6e] mb-2">대표 가이드</p>
              <div className="flex flex-wrap gap-2">
                {categoryPillars.map(pillar => (
                  <Link
                    key={pillar.slug}
                    href={`/guide/${pillar.slug}`}
                    className="text-[12.5px] font-semibold text-[#4f5f45] bg-white border border-[#ece4d6] px-3 py-1.5 rounded-full hover:border-[#7c8f6e] transition-colors"
                  >
                    📚 {pillar.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
          {topClusters.length > 0 && (
            <div>
              <p className="text-[12px] font-semibold text-[#7c8f6e] mb-2">주요 하위 주제</p>
              <div className="flex flex-wrap gap-1.5">
                {topClusters.map(c => (
                  <span key={c.name} className="text-[12px] text-[#5c574c] bg-white border border-[#ece4d6] px-2.5 py-1 rounded-full">
                    {c.name} <span className="text-[#b0a893]">{c.count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {posts.length === 0 ? (
        <p className="text-[#8a8377] text-sm">아직 이 카테고리에 발행된 글이 없습니다.</p>
      ) : (
        <PaginatedPostList posts={posts} showCategory={false} />
      )}
    </div>
  );
}
