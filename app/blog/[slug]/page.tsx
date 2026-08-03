import { getAllPosts, getPostBySlug } from '@/lib/mdx';
import { processArticleBody } from '@/lib/article';
import { shouldShowAffiliateAd } from '@/lib/affiliateAnalysis';
import { notFound } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import ArticleHeader from '@/components/article/ArticleHeader';
import TableOfContents from '@/components/article/TableOfContents';
import ArticleFooter from '@/components/article/ArticleFooter';
import CoupangPartnersCarousel from '@/components/CoupangPartnersCarousel';
import SummaryBox from '@/components/article/SummaryBox';
import ChecklistBox from '@/components/article/ChecklistBox';
import WarningBox from '@/components/article/WarningBox';
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
    return { title: post.title, description: post.description };
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

  // AI가 이 글을 분석해서 광고를 넣을지, 어떤 문맥으로 보여줄지 결정한 값
  // (scripts/generate-post.ts가 생성 시점에 front matter에 저장). 이 값이
  // 없는 글(기존 글 등)은 카테고리 기본값 + "항상 표시"로 자연스럽게 대체된다.
  const adEnabled = shouldShowAffiliateAd({
    shouldInsertAds: post.affiliateShouldInsert,
    confidence: post.affiliateConfidence,
  });

  const { mdx, toc, affiliateSlotPlaced } = processArticleBody(post.content, {
    affiliateSlotAfterHeading: adEnabled ? post.affiliateInsertAfterHeading : null,
    affiliateSlotProps: {
      category: post.category,
      categoryName: post.categoryName,
      aiTitle: post.affiliateAdTitle,
    },
  });

  return (
    <div className="max-w-[720px] mx-auto px-4 sm:px-6 py-10 sm:py-14">
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

        {/* 본문 중간에 이미 배치됐다면 끝에서 또 렌더링하지 않는다 (글당 최대 1개). */}
        {adEnabled && !affiliateSlotPlaced && (
          <CoupangPartnersCarousel
            category={post.category}
            categoryName={post.categoryName}
            aiTitle={post.affiliateAdTitle}
            aiKeywords={post.affiliateKeywords}
          />
        )}
      </article>

      <ArticleFooter category={post.category} categoryName={post.categoryName} currentSlug={post.slug} />
    </div>
  );
}
