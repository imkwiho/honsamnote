import Link from 'next/link';
import { getPostsByCategory } from '@/lib/mdx';
import SubscribeForm from '@/components/SubscribeForm';

interface ArticleFooterProps {
  category?: string;
  categoryName?: string;
  currentSlug: string;
}

export default async function ArticleFooter({ category, categoryName, currentSlug }: ArticleFooterProps) {
  const relatedPosts = category ? (await getPostsByCategory(category)).filter(p => p.slug !== currentSlug).slice(0, 3) : [];

  return (
    <div className="not-prose">
      {relatedPosts.length > 0 && category && (
        <section className="mt-14 pt-10 border-t border-[#e5e5ea]">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[15px] font-bold text-[#1d1d1f]">{categoryName} 관련 글</h2>
            <Link href={`/category/${category}`} className="text-[13px] font-semibold text-[#0071e3] hover:underline whitespace-nowrap">
              전체 보기 →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {relatedPosts.map(post => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="block bg-white border border-[#e5e5ea] rounded-2xl p-5 hover:border-[#0071e3] transition-colors"
              >
                <h3 className="text-[14px] font-bold text-[#1d1d1f] leading-snug line-clamp-2 mb-2">{post.title}</h3>
                <p className="text-[12px] text-[#6e6e73] line-clamp-2">{post.description}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section
        className="mt-10 rounded-3xl p-8 sm:p-10"
        style={{ background: 'linear-gradient(135deg, #2f6fed 0%, #0a3d91 100%)' }}
      >
        <p className="text-[11px] font-semibold tracking-widest uppercase text-white/50 mb-2">뉴스레터</p>
        <h2 className="text-xl sm:text-2xl font-bold text-white leading-snug mb-5">
          이런 문제 해결법, 매주 받아보세요.
        </h2>
        <SubscribeForm dark />
      </section>

      <div className="mt-8 flex flex-wrap gap-2">
        <Link href="/blog" className="text-[13px] font-semibold text-[#3a6fc4] bg-[#eaf3ff] px-4 py-2 rounded-full hover:opacity-80 transition-opacity">
          ← 전체 글 보기
        </Link>
        {category && (
          <Link href={`/category/${category}`} className="text-[13px] font-semibold text-[#3a6fc4] bg-[#eaf3ff] px-4 py-2 rounded-full hover:opacity-80 transition-opacity">
            {categoryName} 카테고리 더보기
          </Link>
        )}
      </div>
    </div>
  );
}
