'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { PostMeta } from '@/lib/mdx';

const PAGE_SIZE = 10;

export default function PaginatedPostList({ posts, showCategory = true }: { posts: PostMeta[]; showCategory?: boolean }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(posts.length / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const pagePosts = posts.slice(start, start + PAGE_SIZE);

  function goTo(p: number) {
    if (p < 1 || p > totalPages) return;
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div>
      <div className="space-y-4">
        {pagePosts.map(post => (
          <Link key={post.slug} href={`/blog/${post.slug}`}
            className="block bg-[#fffdf9] border border-[#ece4d6] rounded-2xl p-6 hover:border-[#7c8f6e] transition-colors">
            {showCategory && (post.categoryName || post.tags.length > 0) ? (
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
            ) : null}
            <h2 className="text-[16px] font-bold text-[#2f2c26] mb-1.5">{post.title}</h2>
            <p className="text-[13px] text-[#8a8377] mb-3 line-clamp-2">{post.description}</p>
            <time className="text-xs text-[#b0a893]">{post.date}</time>
          </Link>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-1.5">
          <button
            onClick={() => goTo(page - 1)}
            disabled={page === 1}
            aria-label="이전 페이지"
            className="w-9 h-9 flex items-center justify-center rounded-full border border-[#ece4d6] text-[#5c5749] hover:border-[#7c8f6e] hover:text-[#4f5f45] transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            ←
          </button>

          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-[60vw] sm:max-w-none px-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => goTo(p)}
                className={`shrink-0 w-9 h-9 rounded-full text-[13px] font-medium tabular-nums transition-colors ${
                  p === page
                    ? 'text-white'
                    : 'text-[#8a8377] hover:bg-[#33302b]/[0.05]'
                }`}
                style={p === page ? { background: '#7c8f6e' } : undefined}
                aria-current={p === page ? 'page' : undefined}
              >
                {p}
              </button>
            ))}
          </div>

          <button
            onClick={() => goTo(page + 1)}
            disabled={page === totalPages}
            aria-label="다음 페이지"
            className="w-9 h-9 flex items-center justify-center rounded-full border border-[#ece4d6] text-[#5c5749] hover:border-[#7c8f6e] hover:text-[#4f5f45] transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            →
          </button>
        </div>
      )}

      {totalPages > 1 && (
        <p className="mt-3 text-center text-[12px] text-[#b0a893] tabular-nums">
          {page} / {totalPages} 페이지 · 총 {posts.length}개
        </p>
      )}
    </div>
  );
}
