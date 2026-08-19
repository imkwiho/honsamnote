// 카테고리 페이지 URL 기반 페이지네이션.
// /category/[slug]/page/2/ ~ /page/N/ 을 정적 HTML로 생성해
// Googlebot이 <a href> 링크를 직접 따라갈 수 있도록 한다.
import { getPostsByCategory } from '@/lib/mdx';
import { loadTopics } from '@/lib/topics';
import { SITE_NAME, DEFAULT_OG_IMAGE, DEFAULT_OG_IMAGE_DIMENSIONS } from '@/lib/seo';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

const PAGE_SIZE = 10;

interface Props {
  params: Promise<{ slug: string; page: string }>;
}

export async function generateStaticParams() {
  const data = loadTopics();
  const result: { slug: string; page: string }[] = [];
  for (const cat of data.categories) {
    const posts = await getPostsByCategory(cat.slug);
    const totalPages = Math.ceil(posts.length / PAGE_SIZE);
    for (let p = 2; p <= totalPages; p++) {
      result.push({ slug: cat.slug, page: String(p) });
    }
  }
  return result;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, page } = await params;
  const pageNum = Number(page);
  const data = loadTopics();
  const category = data.categories.find(c => c.slug === slug);
  if (!category) return {};

  const posts = await getPostsByCategory(slug);
  const totalPages = Math.ceil(posts.length / PAGE_SIZE);
  if (isNaN(pageNum) || pageNum < 2 || pageNum > totalPages) return {};

  const title = `${category.name} — ${pageNum}페이지`;
  const description = `${category.name} 관련 글 ${pageNum}페이지 — ${SITE_NAME}`;
  const canonicalPath = `/category/${slug}/page/${pageNum}/`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
      ...(pageNum > 1 && { prev: pageNum === 2 ? `/category/${slug}/` : `/category/${slug}/page/${pageNum - 1}/` }),
      ...(pageNum < totalPages && { next: `/category/${slug}/page/${pageNum + 1}/` }),
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

export default async function CategoryPageN({ params }: Props) {
  const { slug, page } = await params;
  const pageNum = Number(page);
  const data = loadTopics();
  const category = data.categories.find(c => c.slug === slug);
  if (!category) notFound();

  const posts = await getPostsByCategory(slug);
  const totalPages = Math.ceil(posts.length / PAGE_SIZE);
  if (isNaN(pageNum) || pageNum < 2 || pageNum > totalPages) notFound();

  const start = (pageNum - 1) * PAGE_SIZE;
  const pagePosts = posts.slice(start, start + PAGE_SIZE);

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <p className="text-[12px] font-semibold tracking-widest uppercase text-[#b0a893] mb-2">카테고리</p>
      <h1 className="text-2xl mb-2 text-[#2f2c26]" style={{ fontFamily: 'var(--font-serif)' }}>{category.name}</h1>
      <p className="text-[13px] text-[#b0a893] mb-8">{pageNum} / {totalPages} 페이지 · {posts.length}개의 글</p>

      <div className="space-y-4 mb-10">
        {pagePosts.map(post => (
          <Link key={post.slug} href={`/blog/${post.slug}/`}
            className="block bg-[#fffdf9] border border-[#ece4d6] rounded-2xl p-6 hover:border-[#7c8f6e] transition-colors">
            {post.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-2">
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

      <nav aria-label="페이지 이동" className="flex items-center justify-center gap-2 flex-wrap">
        {pageNum > 1 && (
          <Link href={pageNum === 2 ? `/category/${slug}/` : `/category/${slug}/page/${pageNum - 1}/`}
            className="px-4 py-2 rounded-full border border-[#ece4d6] text-[13px] text-[#5c5749] hover:border-[#7c8f6e] transition-colors">
            ← 이전
          </Link>
        )}
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
          <Link key={p}
            href={p === 1 ? `/category/${slug}/` : `/category/${slug}/page/${p}/`}
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
          <Link href={`/category/${slug}/page/${pageNum + 1}/`}
            className="px-4 py-2 rounded-full border border-[#ece4d6] text-[13px] text-[#5c5749] hover:border-[#7c8f6e] transition-colors">
            다음 →
          </Link>
        )}
      </nav>
    </div>
  );
}
