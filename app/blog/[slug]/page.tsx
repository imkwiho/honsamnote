import { getAllPosts, getPostBySlug } from '@/lib/mdx';
import { processArticleBody } from '@/lib/article';
import { notFound } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import ArticleHeader from '@/components/article/ArticleHeader';
import TableOfContents from '@/components/article/TableOfContents';
import ArticleFooter from '@/components/article/ArticleFooter';
import SummaryBox from '@/components/article/SummaryBox';
import ChecklistBox from '@/components/article/ChecklistBox';
import WarningBox from '@/components/article/WarningBox';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ slug: string }>;
}

const mdxComponents = { SummaryBox, ChecklistBox, WarningBox };

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

  const { mdx, toc } = processArticleBody(post.content);

  return (
    <div className="max-w-[720px] mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <article>
        <ArticleHeader
          title={post.title}
          description={post.description}
          date={post.date}
          slug={post.slug}
          category={post.category}
          categoryName={post.categoryName}
          tags={post.tags}
        />

        <TableOfContents items={toc} />

        <div className="prose article-prose max-w-none">
          <MDXRemote source={mdx} components={mdxComponents} />
        </div>
      </article>

      <ArticleFooter category={post.category} categoryName={post.categoryName} currentSlug={post.slug} />
    </div>
  );
}
