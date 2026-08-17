// SEO 2단계 §19-20 — /admin/seo 대시보드가 쓰는 데이터. app/api/posts/route.ts와
// 동일하게 force-static Route Handler로 빌드 타임에 미리 JSON을 구워
// 낸다(정적 export라 새 Cloudflare Function이나 D1 테이블 없이도 가능).
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { type AuditPost, classifyClusterDetailed, needsTitleFix, needsMetaFix, findDuplicateDescriptionSlugs, findDuplicateCandidates, computeFactCheckFlag } from '@/lib/seoAudit';
import { computeSeoMetadata } from '@/lib/seoMetadata';
import { getPillarForCluster } from '@/lib/pillars';
import { buildLinkGraph } from '@/lib/linkGraph';

export const dynamic = 'force-static';

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');

function loadAllPosts(): AuditPost[] {
  const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.mdx') || f.endsWith('.md'));
  return files.map(file => {
    const slug = file.replace(/\.(mdx|md)$/, '');
    const raw = fs.readFileSync(path.join(BLOG_DIR, file), 'utf-8');
    const { data, content } = matter(raw);
    return {
      slug,
      title: data.title ?? slug,
      description: data.description ?? '',
      date: data.date ?? '',
      updatedAt: data.updatedAt,
      tags: Array.isArray(data.tags) ? data.tags : [],
      keywords: Array.isArray(data.keywords) ? data.keywords : [],
      category: data.category,
      categoryName: data.categoryName,
      content,
    } as AuditPost;
  });
}

export async function GET() {
  const posts = loadAllPosts();
  const graph = buildLinkGraph(posts);
  const dupDescriptionSlugs = findDuplicateDescriptionSlugs(posts);
  const mergeCandidatePairs = findDuplicateCandidates(posts);

  const mergeSlugs = new Set<string>();
  const cannibalSlugs = new Set<string>();
  for (const c of mergeCandidatePairs) {
    const set = c.recommendedAction === 'C. 통합 후보' ? mergeSlugs : cannibalSlugs;
    set.add(c.mainPost);
    set.add(c.duplicatePost);
  }

  const rows = posts.map(post => {
    const { clusterSlug, clusterName } = classifyClusterDetailed(post);
    const pillar = getPillarForCluster(clusterSlug);
    const seoMeta = computeSeoMetadata(post);
    const factcheck = computeFactCheckFlag(post);
    const outgoing = graph.outgoing.get(post.slug)?.size ?? 0;
    const incoming = graph.incoming.get(post.slug)?.size ?? 0;

    return {
      slug: post.slug,
      title: post.title,
      seoTitle: seoMeta.seoTitleSuggestion,
      primaryKeyword: seoMeta.primaryKeyword,
      clusterId: clusterSlug,
      clusterName,
      pillarSlug: pillar?.slug ?? null,
      pillarName: pillar?.name ?? null,
      category: post.category ?? null,
      categoryName: post.categoryName ?? null,
      titleConfidence: seoMeta.titleConfidence,
      titleNeedsFix: needsTitleFix(post),
      metaNeedsFix: needsMetaFix(post, dupDescriptionSlugs),
      outgoingLinks: outgoing,
      incomingLinks: incoming,
      isOrphan: incoming === 0,
      isClusterUnassigned: clusterSlug.endsWith('-general'),
      isPillarUnlinked: pillar === undefined,
      isMergeCandidate: mergeSlugs.has(post.slug),
      isCannibalizationCandidate: cannibalSlugs.has(post.slug),
      isFactcheckNeeded: factcheck.flagged,
    };
  });

  const summary = {
    totalPosts: posts.length,
    titleFixNeeded: rows.filter(r => r.titleNeedsFix).length,
    metaFixNeeded: rows.filter(r => r.metaNeedsFix).length,
    noInternalLinks: rows.filter(r => r.outgoingLinks === 0).length,
    orphanPages: rows.filter(r => r.isOrphan).length,
    clusterUnassigned: rows.filter(r => r.isClusterUnassigned).length,
    pillarUnlinked: rows.filter(r => r.isPillarUnlinked).length,
    mergeCandidates: mergeSlugs.size > 0 ? mergeCandidatePairs.filter(c => c.recommendedAction === 'C. 통합 후보').length : 0,
    cannibalizationCandidates: mergeCandidatePairs.filter(c => c.recommendedAction === 'B. 역할 분리 검토').length,
    factcheckNeeded: rows.filter(r => r.isFactcheckNeeded).length,
    sitemapIncluded: posts.length, // 모든 공개 글이 sitemap.ts에 그대로 포함됨(별도 노출 제어 없음)
  };

  return Response.json({ generatedAt: new Date().toISOString(), summary, posts: rows });
}
