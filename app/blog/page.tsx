import { getAllPosts } from '@/lib/mdx';
import PaginatedPostList from '@/components/PaginatedPostList';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '전체 글',
  description: '1인 가구 생활백서에 발행된 모든 글',
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
