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
      <p className="text-[12px] font-semibold tracking-widest uppercase text-[#aeaeb2] mb-2">카테고리</p>
      <h1 className="text-2xl font-bold text-[#1d1d1f] mb-8">{category.name}</h1>

      {posts.length === 0 ? (
        <p className="text-[#6e6e73] text-sm">아직 이 카테고리에 발행된 글이 없습니다.</p>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <Link key={post.slug} href={`/blog/${post.slug}`}
              className="block bg-white border border-[#e5e5ea] rounded-2xl p-6 hover:border-[#0071e3] transition-colors">
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
