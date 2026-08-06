import { getPostsByCategory } from '@/lib/mdx';
import { loadTopics } from '@/lib/topics';
import PaginatedPostList from '@/components/PaginatedPostList';
import AnalyticsMeta from '@/components/analytics/AnalyticsMeta';
import CategoryJsonLd from '@/components/seo/CategoryJsonLd';
import { SITE_NAME, DEFAULT_OG_IMAGE, DEFAULT_OG_IMAGE_DIMENSIONS } from '@/lib/seo';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ slug: string }>;
}

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
  const description = `1인 가구를 위한 ${category.name} 관련 글을 한곳에 모았습니다 — 실제로 도움이 되는 순서와 판단 기준으로 정리했습니다.`;
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

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <AnalyticsMeta contentType="category" category={slug} title={category.name} />
      <CategoryJsonLd slug={slug} name={category.name} />
      <p className="text-[12px] font-semibold tracking-widest uppercase text-[#b0a893] mb-2">카테고리</p>
      <h1 className="text-2xl mb-8 text-[#2f2c26]" style={{ fontFamily: 'var(--font-serif)' }}>{category.name}</h1>

      {posts.length === 0 ? (
        <p className="text-[#8a8377] text-sm">아직 이 카테고리에 발행된 글이 없습니다.</p>
      ) : (
        <PaginatedPostList posts={posts} showCategory={false} />
      )}
    </div>
  );
}
