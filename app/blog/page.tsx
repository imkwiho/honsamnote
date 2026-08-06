import { getAllPosts } from '@/lib/mdx';
import PaginatedPostList from '@/components/PaginatedPostList';
import { SITE_NAME, DEFAULT_OG_IMAGE, DEFAULT_OG_IMAGE_DIMENSIONS } from '@/lib/seo';
import type { Metadata } from 'next';

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

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <p className="text-[12px] font-semibold tracking-widest uppercase text-[#b0a893] mb-2">전체 글</p>
      <h1 className="text-2xl mb-8 text-[#2f2c26]" style={{ fontFamily: 'var(--font-serif)' }}>{posts.length}개의 글</h1>

      {posts.length === 0 ? (
        <p className="text-[#8a8377] text-sm">
          아직 발행된 글이 없습니다. GitHub Actions → &ldquo;블로그 글 수동 발행&rdquo; 워크플로를 실행해 보세요.
        </p>
      ) : (
        <PaginatedPostList posts={posts} />
      )}
    </div>
  );
}
