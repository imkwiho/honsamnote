import Link from 'next/link';
import { getAllPosts } from '@/lib/mdx';
import { computeCommonTermsByCategory } from '@/lib/seoAudit';
import { getRelatedContent, type RelatedLink } from '@/lib/relatedPosts';
import SubscribeForm from '@/components/SubscribeForm';

interface ArticleFooterProps {
  slug: string;
  title: string;
  category?: string;
  categoryName?: string;
  tags: string[];
  keywords?: string[];
}

function RelatedCard({ post }: { post: RelatedLink }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="block bg-[#fffdf9] border border-[#ece4d6] rounded-xl p-4 hover:border-[#7c8f6e] transition-colors"
    >
      {post.categoryName && (
        <p className="text-[10px] font-semibold text-[#8a8377] uppercase tracking-wide mb-1">{post.categoryName}</p>
      )}
      <h3 className="text-[13.5px] font-bold text-[#2f2c26] leading-snug line-clamp-2">{post.title}</h3>
    </Link>
  );
}

export default async function ArticleFooter({ slug, title, category, categoryName, tags, keywords }: ArticleFooterProps) {
  const allPosts = await getAllPosts();
  const currentPost = { slug, title, description: '', date: '', tags, keywords: keywords ?? [], category, categoryName, content: '' };
  const commonTermsByCategory = computeCommonTermsByCategory(allPosts.map(p => ({ ...p, keywords: p.keywords ?? [], content: '' })));
  const commonTerms = commonTermsByCategory.get(category ?? '') ?? new Set<string>();
  const related = getRelatedContent(
    currentPost,
    allPosts.map(p => ({ ...p, keywords: p.keywords ?? [], content: '' })),
    commonTerms
  );

  const hasRelatedContent = related.sideways.length > 0 || related.next.length > 0;

  return (
    <div className="not-prose">
      {related.up && (
        <Link
          href={related.up.href}
          className="mt-14 flex items-center justify-between gap-3 bg-[#f6f2e9] border border-[#ece4d6] rounded-2xl px-5 py-4 hover:border-[#7c8f6e] transition-colors"
        >
          <span className="text-[13.5px] font-bold text-[#2f2c26]">📚 {related.up.name} 전체 가이드 보기</span>
          <span className="text-[13px] text-[#7c8f6e] whitespace-nowrap">전체 보기 →</span>
        </Link>
      )}

      {hasRelatedContent && (
        <section className={related.up ? 'mt-8 pt-8 border-t border-[#ece4d6]' : 'mt-14 pt-10 border-t border-[#ece4d6]'}>
          {related.sideways.length > 0 && (
            <div className="mb-6">
              <h2 className="text-[15px] font-bold text-[#2f2c26] mb-4">이어서 보면 좋은 글</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {related.sideways.map(post => (
                  <RelatedCard key={post.slug} post={post} />
                ))}
              </div>
            </div>
          )}
          {related.next.length > 0 && (
            <div>
              <h2 className="text-[15px] font-bold text-[#2f2c26] mb-4">이런 문제도 함께 확인해보세요</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {related.next.map(post => (
                  <RelatedCard key={post.slug} post={post} />
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <section
        className="mt-10 rounded-3xl p-8 sm:p-10"
        style={{ background: 'linear-gradient(135deg, #7c8f6e 0%, #49573f 100%)' }}
      >
        <p className="text-[11px] font-semibold tracking-widest uppercase text-white/60 mb-2">뉴스레터</p>
        <h2 className="text-xl sm:text-2xl font-bold text-white leading-snug mb-5">
          이런 문제 해결법, 매주 받아보세요.
        </h2>
        <SubscribeForm dark />
      </section>

      <div className="mt-8 flex flex-wrap gap-2">
        <Link href="/blog" className="text-[13px] font-semibold text-[#5f7052] bg-[#eef1e6] px-4 py-2 rounded-full hover:opacity-80 transition-opacity">
          ← 전체 글 보기
        </Link>
        {category && (
          <Link href={`/category/${category}`} className="text-[13px] font-semibold text-[#5f7052] bg-[#eef1e6] px-4 py-2 rounded-full hover:opacity-80 transition-opacity">
            {categoryName} 카테고리 더보기
          </Link>
        )}
      </div>
    </div>
  );
}
