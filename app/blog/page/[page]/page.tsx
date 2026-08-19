// Google이 /blog/page/2/ ~ /blog/page/N/ 형태로 모든 게시글에 접근할 수 있도록
// 정적 HTML 파일을 생성한다. 클라이언트 JS 없이도 <a href> 링크가 HTML에 존재.
import { getAllPosts } from '@/lib/mdx';
import { SITE_NAME, DEFAULT_OG_IMAGE, DEFAULT_OG_IMAGE_DIMENSIONS } from '@/lib/seo';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

const PAGE_SIZE = 10;

interface Props {
  params: Promise<{ page: string }>;
}

export async function generateStaticParams() {
  const posts = await getAllPosts();
  const totalPages = Math.ceil(posts.length / PAGE_SIZE);
  // 페이지 2부터 마지막 페이지까지 정적 경로 생성 (1페이지는 /blog/ 가 담당)
  return Array.from({ length: Math.max(0, totalPages - 1) }, (_, i) => ({
    page: String(i + 2),
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { page } = await params;
  const pageNum = Number(page);
  const posts = await getAllPosts();
  const totalPages = Math.ceil(posts.length / PAGE_SIZE);

  if (isNaN(pageNum) || pageNum < 2 || pageNum > totalPages) return {};

  const title = `전체 글 — ${pageNum}페이지`;
  const description = `혼자 사는 삶에 실제로 도움이 되는 글 — ${SITE_NAME} ${pageNum}페이지`;
  const canonicalPath = `/blog/page/${pageNum}/`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
      // 이전/다음 페이지 rel 링크 (Google 표준)
      ...(pageNum > 1 && { prev: pageNum === 2 ? '/blog/' : `/blog/page/${pageNum - 1}/` }),
      ...(pageNum < totalPages && { next: `/blog/page/${pageNum + 1}/` }),
    },
    robots: { index: true, follow: true },
    openGraph: {
      type: 'website',
      url: canonicalPath,
      siteName: SITE_NAME,
      title,
      description,
      images: [{ url: DEFAULT_OG_IMAGE, ...DEFAULT_OG_IMAGE_DIMENSIONS, alt: title }],
    },
  };
}

export default async function BlogPageN({ params }: Props) {
  const { page } = await params;
  const pageNum = Number(page);
  const posts = await getAllPosts();
  const totalPages = Math.ceil(posts.length / PAGE_SIZE);

  if (isNaN(pageNum) || pageNum < 2 || pageNum > totalPages) notFound();

  const start = (pageNum - 1) * PAGE_SIZE;
  const pagePosts = posts.slice(start, start + PAGE_SIZE);

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <p className="text-[12px] font-semibold tracking-widest uppercase text-[#b0a893] mb-2">전체 글</p>
      <h1 className="text-2xl mb-2 text-[#2f2c26]" style={{ fontFamily: 'var(--font-serif)' }}>
        {posts.length}개의 글
      </h1>
      <p className="text-[13px] text-[#b0a893] mb-8">{pageNum} / {totalPages} 페이지</p>

      <div className="space-y-4 mb-10">
        {pagePosts.map(post => (
          <Link key={post.slug} href={`/blog/${post.slug}/`}
            className="block bg-[#fffdf9] border border-[#ece4d6] rounded-2xl p-6 hover:border-[#7c8f6e] transition-colors">
            {(post.categoryName || post.tags.length > 0) && (
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {post.categoryName && (
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#eef1e6] text-[#5f7052]">
                    {post.categoryName}
                  </span>
                )}
                {post.tags.slice(0, 2).map(tag => (
                  <span key={tag} className="text-[10px] text-[#b0a893]">#{tag}</span>
                ))}
              </div>
            )}
            <h2 className="text-[16px] font-bold text-[#2f2c26] mb-1.5">{post.title}</h2>
            <p className="text-[13px] text-[#8a8377] mb-3 line-clamp-2">{post.description}</p>
            <time className="text-xs text-[#b0a893]">{post.date}</time>
          </Link>
        ))}
      </div>

      {/* 페이지 이동 — 실제 <a href> 링크로 Google이 크롤 가능 */}
      <nav aria-label="페이지 이동" className="flex items-center justify-center gap-2 flex-wrap">
        {pageNum > 1 && (
          <Link href={pageNum === 2 ? '/blog/' : `/blog/page/${pageNum - 1}/`}
            className="px-4 py-2 rounded-full border border-[#ece4d6] text-[13px] text-[#5c5749] hover:border-[#7c8f6e] transition-colors">
            ← 이전
          </Link>
        )}
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
          <Link key={p}
            href={p === 1 ? '/blog/' : `/blog/page/${p}/`}
            className={`w-9 h-9 flex items-center justify-center rounded-full text-[13px] font-medium transition-colors ${
              p === pageNum ? 'text-white' : 'text-[#8a8377] hover:bg-[#33302b]/[0.05]'
            }`}
            style={p === pageNum ? { background: '#7c8f6e' } : undefined}
            aria-current={p === pageNum ? 'page' : undefined}
          >
            {p}
          </Link>
        ))}
        {pageNum < totalPages && (
          <Link href={`/blog/page/${pageNum + 1}/`}
            className="px-4 py-2 rounded-full border border-[#ece4d6] text-[13px] text-[#5c5749] hover:border-[#7c8f6e] transition-colors">
            다음 →
          </Link>
        )}
      </nav>
    </div>
  );
}
