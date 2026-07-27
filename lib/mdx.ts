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
    content,
  };
}

export async function getPostsByCategory(categorySlug: string): Promise<PostMeta[]> {
  const posts = await getAllPosts();
  return posts.filter(p => p.category === categorySlug);
}
