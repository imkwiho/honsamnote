import { getAllPosts, getPostBySlug } from '@/lib/mdx';
import { notFound } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import ViewCounter from '@/components/ViewCounter';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map(p => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const post = await getPostBySlug(slug);
    return { title: post.title, description: post.description };
  } catch {
    return {};
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  let post;
  try {
    post = await getPostBySlug(slug);
  } catch {
    notFound();
  }

  return (
    <article>
      <header className="mb-10">
        <div className="flex flex-wrap gap-2 mb-3">
          {post.categoryName && (
            <a href={`/category/${post.category}`} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-semibold">
              {post.categoryName}
            </a>
          )}
          {post.tags.map(tag => (
            <span key={tag} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{tag}</span>
          ))}
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3 leading-tight">{post.title}</h1>
        <p className="text-gray-500 text-base mb-4">{post.description}</p>
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <time>{post.date}</time>
          <ViewCounter slug={post.slug} />
        </div>
      </header>

      <div className="prose prose-gray max-w-none">
        <MDXRemote source={post.content} />
      </div>
    </article>
  );
}
