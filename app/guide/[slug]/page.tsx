import { getAllPosts } from '@/lib/mdx';
import { classifyClusterDetailed } from '@/lib/seoAudit';
import { PILLARS, getPillarBySlug, assignSubTopic } from '@/lib/pillars';
import Breadcrumb from '@/components/seo/Breadcrumb';
import JsonLd from '@/components/seo/JsonLd';
import AnalyticsMeta from '@/components/analytics/AnalyticsMeta';
import { SITE_NAME, DEFAULT_OG_IMAGE, DEFAULT_OG_IMAGE_DIMENSIONS, absoluteUrl, buildBreadcrumbJsonLd, breadcrumbNodesToJsonLd, type BreadcrumbNode } from '@/lib/seo';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return PILLARS.map(p => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const pillar = getPillarBySlug(slug);
  if (!pillar) return {};

  const canonicalPath = `/guide/${slug}/`;
  return {
    title: pillar.name,
    description: pillar.intro,
    alternates: { canonical: canonicalPath },
    robots: { index: true, follow: true },
    openGraph: {
      type: 'website',
      url: canonicalPath,
      siteName: SITE_NAME,
      title: pillar.name,
      description: pillar.intro,
      images: [{ url: DEFAULT_OG_IMAGE, ...DEFAULT_OG_IMAGE_DIMENSIONS, alt: pillar.name }],
    },
    twitter: { card: 'summary_large_image', title: pillar.name, description: pillar.intro, images: [DEFAULT_OG_IMAGE] },
  };
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const pillar = getPillarBySlug(slug);
  if (!pillar) notFound();

  const allPosts = await getAllPosts();
  const clusterPosts = allPosts.filter(p => classifyClusterDetailed({ ...p, content: '', keywords: p.keywords ?? [] }).clusterSlug === pillar.clusterId);

  const grouped = new Map<string, typeof clusterPosts>();
  for (const sub of pillar.subTopics) grouped.set(sub.name, []);
  grouped.set('기타', []);
  for (const post of clusterPosts) {
    const subName = assignSubTopic({ ...post, content: '', keywords: post.keywords ?? [] }, pillar);
    grouped.get(subName)!.push(post);
  }

  const category = clusterPosts[0]?.category;
  const categoryName = clusterPosts[0]?.categoryName;
  const breadcrumbNodes: BreadcrumbNode[] = [
    { name: SITE_NAME, href: '/' },
    ...(category && categoryName ? [{ name: categoryName, href: `/category/${category}/` }] : []),
    { name: pillar.name },
  ];
  const url = absoluteUrl(`/guide/${slug}/`);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(breadcrumbNodesToJsonLd(breadcrumbNodes, url));

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <AnalyticsMeta contentType="category" category={pillar.clusterId} title={pillar.name} />
      <JsonLd data={breadcrumbJsonLd} />
      <Breadcrumb items={breadcrumbNodes} />

      <p className="text-[12px] font-semibold tracking-widest uppercase text-[#b0a893] mb-2">가이드</p>
      <h1 className="text-2xl sm:text-3xl mb-5 text-[#2f2c26]" style={{ fontFamily: 'var(--font-serif)' }}>
        {pillar.name}
      </h1>
      <p className="text-[#6b6558] text-[15px] sm:text-[16px] leading-relaxed mb-4">{pillar.intro}</p>

      <div className="bg-[#f6f2e9] border border-[#ece4d6] rounded-2xl p-5 mb-10">
        <p className="text-[12px] font-semibold text-[#7c8f6e] mb-1">이 가이드로 해결할 수 있는 것</p>
        <p className="text-[14px] text-[#5c574c] leading-relaxed">{pillar.whatItSolves}</p>
      </div>

      {pillar.subTopics.map(sub => {
        const posts = grouped.get(sub.name) ?? [];
        if (posts.length === 0) return null;
        return (
          <section key={sub.name} className="mb-10">
            <h2 className="text-[17px] font-bold text-[#2f2c26] mb-4 pb-2 border-b border-[#ece4d6]">{sub.name}</h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {posts.map(post => (
                <li key={post.slug}>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="block bg-[#fffdf9] border border-[#ece4d6] rounded-xl p-4 hover:border-[#7c8f6e] transition-colors h-full"
                  >
                    <h3 className="text-[13.5px] font-bold text-[#2f2c26] leading-snug line-clamp-2">{post.title}</h3>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {(grouped.get('기타') ?? []).length > 0 && (
        <section className="mb-10">
          <h2 className="text-[17px] font-bold text-[#2f2c26] mb-4 pb-2 border-b border-[#ece4d6]">그 외 관련 글</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(grouped.get('기타') ?? []).map(post => (
              <li key={post.slug}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="block bg-[#fffdf9] border border-[#ece4d6] rounded-xl p-4 hover:border-[#7c8f6e] transition-colors h-full"
                >
                  <h3 className="text-[13.5px] font-bold text-[#2f2c26] leading-snug line-clamp-2">{post.title}</h3>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
