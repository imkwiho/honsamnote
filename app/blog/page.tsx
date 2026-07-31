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
      <p className="text-[12px] font-semibold tracking-widest uppercase text-[#b0a893] mb-2">전체 글</p>
      <h1 className="text-2xl mb-8 text-[#2f2c26]" style={{ fontFamily: 'var(--font-serif)' }}>{posts.length}개의 글</h1>

      {posts.length === 0 ? (
        <p className="text-[#8a8377] text-sm">
          아직 발행된 글이 없습니다. GitHub Actions → &ldquo;블로그 글 수동 발행&rdquo; 워크플로를 실행해 보세요.
        </p>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <Link key={post.slug} href={`/blog/${post.slug}`}
              className="block bg-[#fffdf9] border border-[#ece4d6] rounded-2xl p-6 hover:border-[#7c8f6e] transition-colors">
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
              <h2 className="text-[16px] font-bold text-[#2f2c26] mb-1.5">{post.title}</h2>
              <p className="text-[13px] text-[#8a8377] mb-3 line-clamp-2">{post.description}</p>
              <time className="text-xs text-[#b0a893]">{post.date}</time>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
