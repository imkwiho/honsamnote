import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');

export interface PostMeta {
  slug: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
  keywords?: string[];
  category?: string;
  categoryName?: string;
}

export interface Post extends PostMeta {
  content: string;
  // AI 제휴 상품 분석 결과 (scripts/generate-post.ts가 생성 시점에 채워 넣음).
  // 이 필드들이 없는 글(기존 글 등)은 카테고리 기본값으로 자연스럽게 대체된다.
  affiliateKeywords?: string[];
  affiliateProductGroup?: string;
  affiliateConfidence?: number;
  affiliateShouldInsert?: boolean;
  affiliateInsertAfterHeadings?: string[];
  affiliateAdTitles?: string[];
}

export async function getAllPosts(): Promise<PostMeta[]> {
  if (!fs.existsSync(BLOG_DIR)) return [];
  const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.mdx') || f.endsWith('.md'));
  const posts = files.map(file => {
    const slug = file.replace(/\.(mdx|md)$/, '');
    const raw = fs.readFileSync(path.join(BLOG_DIR, file), 'utf-8');
    const { data } = matter(raw);
    return {
      slug,
      title: data.title ?? slug,
      description: data.description ?? '',
      date: data.date ?? '',
      tags: data.tags ?? [],
      keywords: data.keywords ?? [],
      category: data.category,
      categoryName: data.categoryName,
    } as PostMeta;
  });
  return posts.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function getPostBySlug(slug: string): Promise<Post> {
  const mdxPath = path.join(BLOG_DIR, `${slug}.mdx`);
  const mdPath = path.join(BLOG_DIR, `${slug}.md`);
  const filePath = fs.existsSync(mdxPath) ? mdxPath : mdPath;
  const raw = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(raw);
  return {
    slug,
    title: data.title ?? slug,
    description: data.description ?? '',
    date: data.date ?? '',
    tags: data.tags ?? [],
    keywords: data.keywords ?? [],
    category: data.category,
    categoryName: data.categoryName,
    affiliateKeywords: data.affiliateKeywords,
    affiliateProductGroup: data.affiliateProductGroup,
    affiliateConfidence: data.affiliateConfidence,
    affiliateShouldInsert: data.affiliateShouldInsert,
    affiliateInsertAfterHeadings: data.affiliateInsertAfterHeadings,
    affiliateAdTitles: data.affiliateAdTitles,
    content,
  };
}

export async function getPostsByCategory(categorySlug: string): Promise<PostMeta[]> {
  const posts = await getAllPosts();
  return posts.filter(p => p.category === categorySlug);
}

export async function getCategoryCounts(): Promise<Record<string, number>> {
  const posts = await getAllPosts();
  const counts: Record<string, number> = {};
  for (const post of posts) {
    if (post.category) counts[post.category] = (counts[post.category] ?? 0) + 1;
  }
  return counts;
}
