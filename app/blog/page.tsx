import { getAllPosts } from '@/lib/mdx';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '전체 글',
  description: '1인 가구 생활백서에 발행된 모든 글',
};

export default async function BlogIndexPage() {
  const posts = await getAllPosts();

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <p className="text-[12px] font-semibold tracking-widest uppercase text-[#aeaeb2] mb-2">전체 글</p>
      <h1 className="text-2xl font-bold text-[#1d1d1f] mb-8">{posts.length}개의 글</h1>

      {posts.length === 0 ? (
        <p className="text-[#6e6e73] text-sm">
          아직 발행된 글이 없습니다. GitHub Actions → &ldquo;블로그 글 수동 발행&rdquo; 워크플로를 실행해 보세요.
        </p>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <Link key={post.slug} href={`/blog/${post.slug}`}
              className="block bg-white border border-[#e5e5ea] rounded-2xl p-6 hover:border-[#0071e3] transition-colors">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {post.categoryName && (
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#f2f2f7] text-[#6e6e73]">
                    {post.categoryName}
                  </span>
                )}
                {post.tags.slice(0, 2).map(tag => (
                  <span key={tag} className="text-[10px] text-[#aeaeb2]">#{tag}</span>
                ))}
              </div>
              <h2 className="text-[16px] font-bold text-[#1d1d1f] mb-1.5">{post.title}</h2>
              <p className="text-[13px] text-[#6e6e73] mb-3 line-clamp-2">{post.description}</p>
              <time className="text-xs text-[#aeaeb2]">{post.date}</time>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
