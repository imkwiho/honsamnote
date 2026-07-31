import { getPostsByCategory } from '@/lib/mdx';
import { loadTopics } from '@/lib/topics';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const data = loadTopics();
  return data.categories.map(c => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = loadTopics();
  const category = data.categories.find(c => c.slug === slug);
  if (!category) return {};
  return { title: category.name, description: `${category.name} 관련 글 모음` };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const data = loadTopics();
  const category = data.categories.find(c => c.slug === slug);
  if (!category) notFound();

  const posts = await getPostsByCategory(slug);

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <p className="text-[12px] font-semibold tracking-widest uppercase text-[#b0a893] mb-2">카테고리</p>
      <h1 className="text-2xl mb-8 text-[#2f2c26]" style={{ fontFamily: 'var(--font-serif)' }}>{category.name}</h1>

      {posts.length === 0 ? (
        <p className="text-[#8a8377] text-sm">아직 이 카테고리에 발행된 글이 없습니다.</p>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <Link key={post.slug} href={`/blog/${post.slug}`}
              className="block bg-[#fffdf9] border border-[#ece4d6] rounded-2xl p-6 hover:border-[#7c8f6e] transition-colors">
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
