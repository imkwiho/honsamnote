import { getAllPosts, getPostBySlug } from '@/lib/mdx';
import { processArticleBody } from '@/lib/article';
import { shouldShowAffiliateAd } from '@/lib/affiliateAnalysis';
import { notFound } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import ArticleHeader from '@/components/article/ArticleHeader';
import TableOfContents from '@/components/article/TableOfContents';
import ArticleFooter from '@/components/article/ArticleFooter';
import CoupangPartnersCarousel from '@/components/CoupangPartnersCarousel';
import AnalyticsMeta from '@/components/analytics/AnalyticsMeta';
import SummaryBox from '@/components/article/SummaryBox';
import ChecklistBox from '@/components/article/ChecklistBox';
import WarningBox from '@/components/article/WarningBox';
import ArticleJsonLd from '@/components/seo/ArticleJsonLd';
import { SITE_NAME, SITE_LOCALE, DEFAULT_OG_IMAGE, DEFAULT_OG_IMAGE_DIMENSIONS } from '@/lib/seo';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ slug: string }>;
}

// MDX가 <CoupangPartnersCarousel /> 태그를 만나면 이 컴포넌트로 치환한다.
// 본문 중간 삽입 시 필요한 props(category 등)는 lib/article.ts가 태그
// 속성으로 직접 실어 보낸다 (아래 mdxComponents는 렌더마다 새로 만들지 않는
// 안정적인 모듈 참조라 컴포넌트를 렌더 중에 새로 정의하는 문제가 없다).
const mdxComponents = { SummaryBox, ChecklistBox, WarningBox, CoupangPartnersCarousel };

export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map(p => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const post = await getPostBySlug(slug);
    const canonicalPath = `/blog/${slug}/`;
    const publishedTime = post.date ? new Date(post.date).toISOString() : undefined;
    const modifiedTime = post.updatedAt ? new Date(post.updatedAt).toISOString() : publishedTime;

    return {
      title: post.title,
      description: post.description,
      keywords: post.keywords,
      alternates: { canonical: canonicalPath },
      robots: { index: true, follow: true },
      openGraph: {
        type: 'article',
        url: canonicalPath,
        siteName: SITE_NAME,
        locale: SITE_LOCALE,
        title: post.title,
        description: post.description,
        publishedTime,
        modifiedTime,
        authors: [SITE_NAME],
        section: post.categoryName,
        tags: post.tags,
        images: [{ url: DEFAULT_OG_IMAGE, ...DEFAULT_OG_IMAGE_DIMENSIONS, alt: post.title }],
      },
      twitter: {
        card: 'summary_large_image',
        title: post.title,
        description: post.description,
        images: [DEFAULT_OG_IMAGE],
      },
    };
  } catch {
    return {};
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  let post;
  try {
    post = await getPostBySlug(slug);
  } catch {
    notFound();
  }

  // AI가 이 글을 분석해서 광고를 넣을지, 몇 개를 어떤 문맥·위치로 보여줄지
  // 결정한 값 (scripts/generate-post.ts가 생성 시점에 front matter에 저장).
  // 이 값이 없는 글(기존 글 등)은 카테고리 기본값 + "항상 표시 1개"로 대체된다.
  const adEnabled = shouldShowAffiliateAd({
    shouldInsertAds: post.affiliateShouldInsert,
    confidence: post.affiliateConfidence,
  });

  const { mdx, toc, affiliateSlotsPlaced } = processArticleBody(post.content, {
    affiliateAdsEnabled: adEnabled,
    affiliateSlotAfterHeadings: post.affiliateInsertAfterHeadings,
    affiliateSlotTitles: post.affiliateAdTitles,
    affiliateSlotProps: {
      category: post.category,
      categoryName: post.categoryName,
    },
  });

  return (
    <div className="max-w-[720px] mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <AnalyticsMeta contentType="post" category={post.category} postSlug={post.slug} postId={post.slug} title={post.title} />
      <ArticleJsonLd
        title={post.title}
        description={post.description}
        slug={post.slug}
        date={post.date}
        updatedAt={post.updatedAt}
        category={post.category}
        categoryName={post.categoryName}
        tags={post.tags}
      />
      <article>
        <ArticleHeader
          title={post.title}
          description={post.description}
          date={post.date}
          slug={post.slug}
          category={post.category}
          categoryName={post.categoryName}
          tags={post.tags}
        />

        <TableOfContents items={toc} />

        <div className="prose article-prose max-w-none">
          <MDXRemote source={mdx} components={mdxComponents} />
        </div>

        {/* 본문 중간에 하나도 못 넣었을 때만 끝에 기본 1개를 배치한다 (글당 최대 개수는 config에서 관리). */}
        {adEnabled && affiliateSlotsPlaced === 0 && (
          <CoupangPartnersCarousel
            category={post.category}
            categoryName={post.categoryName}
            aiTitle={post.affiliateAdTitles?.[0]}
            aiKeywords={post.affiliateKeywords}
          />
        )}
      </article>

      <ArticleFooter category={post.category} categoryName={post.categoryName} currentSlug={post.slug} />
    </div>
  );
}
