// SEO 2단계 §19-20 + 5단계 §28-30 — /admin/seo 대시보드가 쓰는 데이터.
// force-static Route Handler로 빌드 타임에 미리 JSON을 구워낸다.
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { type AuditPost, classifyClusterDetailed, needsTitleFix, needsMetaFix, findDuplicateDescriptionSlugs, findDuplicateCandidates, computeFactCheckFlag } from '@/lib/seoAudit';
import { computeSeoMetadata } from '@/lib/seoMetadata';
import { getPillarForCluster } from '@/lib/pillars';
import { buildLinkGraph } from '@/lib/linkGraph';

const AUDIT_DIR = path.join(process.cwd(), 'seo-audit');

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

  // §28-30: Factcheck 현황 + GSC 상태 (seo-audit/ 파일에서 빌드 타임 읽기)
  let factcheckSummary = null;
  try {
    // P1 분류 결과
    const p1Path = path.join(AUDIT_DIR, 'factcheck-p1-classified.csv');
    let p1Total = 0, p1VerifiedCorrect = 0, p1ContextRequired = 0, p1NeedsExternal = 0;
    if (fs.existsSync(p1Path)) {
      const lines = fs.readFileSync(p1Path, 'utf-8').replace(/^﻿/, '').split('\n').slice(1).filter(Boolean);
      p1Total = lines.length;
      for (const l of lines) {
        // verification_status is col 8 (after CSV parsing) — use simple split for status field
        const status = l.split(',')[8]?.replace(/"/g, '').trim();
        if (status === 'VERIFIED_CORRECT') p1VerifiedCorrect++;
        else if (status === 'VERIFIED_CONTEXT_REQUIRED') p1ContextRequired++;
        else if (status === 'NEEDS_EXTERNAL_VERIFICATION') p1NeedsExternal++;
      }
    }

    // P2 재검토 현황
    let p2Total = 0, p2RecheckRequired = 0;
    const p2Path = path.join(AUDIT_DIR, 'p2-volatile-claims.json');
    if (fs.existsSync(p2Path)) {
      const p2Data = JSON.parse(fs.readFileSync(p2Path, 'utf-8'));
      p2Total = p2Data.totalP2Claims ?? 0;
      const today = new Date().toISOString().slice(0, 10);
      p2RecheckRequired = (p2Data.records ?? []).filter(
        (r: { next_review_date: string }) => r.next_review_date <= today
      ).length;
    }

    // HIGH 단정 표현 결정
    let highStrongClaims = 0, strongClaimKeep = 0, strongClaimSoften = 0, strongClaimReview = 0;
    const scDecPath = path.join(AUDIT_DIR, 'strong-claim-decisions.csv');
    if (fs.existsSync(scDecPath)) {
      const lines = fs.readFileSync(scDecPath, 'utf-8').replace(/^﻿/, '').split('\n').slice(1).filter(Boolean);
      highStrongClaims = lines.length;
      for (const l of lines) {
        const dec = l.split(',')[7]?.replace(/"/g, '').trim();
        if (dec === 'KEEP') strongClaimKeep++;
        else if (dec === 'SOFTEN') strongClaimSoften++;
        else strongClaimReview++;
      }
    }

    // GSC 연결 여부
    let gscConnected = false, gscLastImport: string | null = null;
    const gscPath = path.join(AUDIT_DIR, 'search-console-import.json');
    if (fs.existsSync(gscPath)) {
      const gscData = JSON.parse(fs.readFileSync(gscPath, 'utf-8'));
      gscConnected = (gscData.queryRows?.length ?? 0) > 0;
      if (gscConnected) gscLastImport = gscData.importedAt?.slice(0, 10) ?? null;
    }

    factcheckSummary = {
      p1Total, p1VerifiedCorrect, p1ContextRequired, p1NeedsExternal,
      p2Total, p2RecheckRequired,
      highStrongClaims, strongClaimKeep, strongClaimSoften, strongClaimReview,
      gscConnected, gscLastImport,
    };
  } catch {
    // seo-audit 파일 없으면 null 유지
  }

  return Response.json({ generatedAt: new Date().toISOString(), summary, posts: rows, factcheckSummary });
}
