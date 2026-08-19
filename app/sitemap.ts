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

  // 가장 최근 게시글 날짜 — 홈/블로그 목록 lastmod로 사용.
  // 정적 구조 페이지에 매 빌드 타임을 쓰면 Google이 매일 갱신된 것으로 인식함.
  const newestPostDate = posts.length > 0 ? safeDate(posts[0].date) : new Date('2026-07-27');

  // 카테고리별 가장 최근 글 날짜
  function newestInCategory(slug: string): Date {
    const catPosts = posts.filter(p => p.category === slug);
    return catPosts.length > 0 ? safeDate(catPosts[0].date) : newestPostDate;
  }

  // Pillar 페이지 lastmod — 전체 사이트의 최신 글 날짜 사용
  // (클러스터별 분류는 빌드 시간 비용이 크므로 사이트 전체 최신으로 근사)
  function newestInCluster(): Date {
    return newestPostDate;
  }

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: newestPostDate, changeFrequency: 'daily', priority: 1.0 },
    { url: `${SITE_URL}/blog/`, lastModified: newestPostDate, changeFrequency: 'daily', priority: 0.8 },
  ];

  const categoryEntries: MetadataRoute.Sitemap = topicsData.categories.map(c => ({
    url: `${SITE_URL}/category/${c.slug}/`,
    lastModified: newestInCategory(c.slug),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  const postEntries: MetadataRoute.Sitemap = posts.map(p => ({
    url: `${SITE_URL}/blog/${p.slug}/`,
    lastModified: safeDate(p.updatedAt ?? p.date),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  // Pillar/Hub 페이지 — 카테고리보다는 아래, 개별 글보다는 위 우선순위.
  const guideEntries: MetadataRoute.Sitemap = PILLARS.map(pillar => ({
    url: `${SITE_URL}/guide/${pillar.slug}/`,
    lastModified: newestInCluster(),
    changeFrequency: 'weekly' as const,
    priority: 0.75,
  }));

  return [...staticEntries, ...categoryEntries, ...guideEntries, ...postEntries];
}
