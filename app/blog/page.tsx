import { getAllPosts } from '@/lib/mdx';
import PaginatedPostList from '@/components/PaginatedPostList';
import { SITE_NAME, DEFAULT_OG_IMAGE, DEFAULT_OG_IMAGE_DIMENSIONS } from '@/lib/seo';
import Link from 'next/link';
import type { Metadata } from 'next';

const PAGE_SIZE = 10;
const TITLE = '전체 글';
const DESCRIPTION = `혼자 사는 삶에 실제로 도움이 되는 글을 한곳에 모았습니다 — ${SITE_NAME}에 발행된 모든 글.`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/blog/' },
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    url: '/blog/',
    siteName: SITE_NAME,
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: DEFAULT_OG_IMAGE, ...DEFAULT_OG_IMAGE_DIMENSIONS, alt: TITLE }],
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: [DEFAULT_OG_IMAGE] },
};

export default async function BlogIndexPage() {
  const posts = await getAllPosts();
  const totalPages = Math.ceil(posts.length / PAGE_SIZE);

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <p className="text-[12px] font-semibold tracking-widest uppercase text-[#b0a893] mb-2">전체 글</p>
      <h1 className="text-2xl mb-8 text-[#2f2c26]" style={{ fontFamily: 'var(--font-serif)' }}>{posts.length}개의 글</h1>

      {posts.length === 0 ? (
        <p className="text-[#8a8377] text-sm">
          아직 발행된 글이 없습니다. GitHub Actions → &ldquo;블로그 글 수동 발행&rdquo; 워크플로를 실행해 보세요.
        </p>
      ) : (
        <>
          {/* 클라이언트 페이지네이션 UI (사용자 경험용) */}
          <PaginatedPostList posts={posts} />

          {/* URL 기반 페이지 링크 — Googlebot이 정적 HTML에서 바로 따라갈 수 있도록.
              사용자에게는 작게 표시하되 숨기지 않아 cloaking이 아님. */}
          {totalPages > 1 && (
            <nav aria-label="전체 글 페이지 이동" className="mt-10 pt-6 border-t border-[#ece4d6]">
              <p className="text-[12px] text-[#b0a893] mb-3">페이지별 보기</p>
              <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <Link
                    key={p}
                    href={p === 1 ? '/blog/' : `/blog/page/${p}/`}
                    className="w-9 h-9 flex items-center justify-center rounded-full text-[13px] font-medium text-[#8a8377] hover:bg-[#33302b]/[0.05] transition-colors border border-[#ece4d6] hover:border-[#7c8f6e]"
                    aria-current={p === 1 ? 'page' : undefined}
                  >
                    {p}
                  </Link>
                ))}
              </div>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
