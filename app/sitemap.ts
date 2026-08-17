import type { MetadataRoute } from 'next';
import { getAllPosts } from '@/lib/mdx';
import { loadTopics } from '@/lib/topics';
import { SITE_URL } from '@/lib/seo';
import { PILLARS } from '@/lib/pillars';

export const dynamic = 'force-static';

function safeDate(value: string | undefined): Date {
  if (!value) return new Date();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

// 관리자/로그인/API/미리보기 경로는 여기 애초에 넣지 않는다(공개 콘텐츠만 포함).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, topicsData] = await Promise.all([getAllPosts(), Promise.resolve(loadTopics())]);
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${SITE_URL}/blog/`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
  ];

  const categoryEntries: MetadataRoute.Sitemap = topicsData.categories.map(c => ({
    url: `${SITE_URL}/category/${c.slug}/`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.7,
  }));

  const postEntries: MetadataRoute.Sitemap = posts.map(p => ({
    url: `${SITE_URL}/blog/${p.slug}/`,
    lastModified: safeDate(p.updatedAt ?? p.date),
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  // Pillar/Hub 페이지 — 카테고리보다는 아래, 개별 글보다는 위 우선순위.
  const guideEntries: MetadataRoute.Sitemap = PILLARS.map(pillar => ({
    url: `${SITE_URL}/guide/${pillar.slug}/`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.75,
  }));

  return [...staticEntries, ...categoryEntries, ...guideEntries, ...postEntries];
}
