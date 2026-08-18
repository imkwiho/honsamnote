// SEO 4단계 §1 — 시작 시점 스냅샷 생성.
import fs from 'fs';
import path from 'path';
import { loadAllPosts, AUDIT_DIR, ensureAuditDir } from './lib/seoPhase4Shared';
import { classifyClusterDetailed, computeFactCheckFlag } from '../lib/seoAudit';
import { computeSeoMetadata } from '../lib/seoMetadata';
import { PILLARS } from '../lib/pillars';
import { buildLinkGraph } from '../lib/linkGraph';
import { computePrimaryPages } from '../lib/primaryPages';

function main() {
  const posts = loadAllPosts();
  const graph = buildLinkGraph(posts);
  const primaryPages = computePrimaryPages(posts, graph);

  // category별
  const byCategory: Record<string, number> = {};
  for (const p of posts) {
    const cat = p.category ?? '(없음)';
    byCategory[cat] = (byCategory[cat] ?? 0) + 1;
  }

  // cluster별
  const byCluster: Record<string, number> = {};
  for (const p of posts) {
    const { clusterSlug } = classifyClusterDetailed(p);
    byCluster[clusterSlug] = (byCluster[clusterSlug] ?? 0) + 1;
  }

  // title/description 개선 완료 수(HIGH 적용됨 = title이 짧고 구분자 포함 또는 키워드로 시작)
  let titleImprovedCount = 0;
  let descriptionImprovedCount = 0;
  for (const p of posts) {
    const meta = computeSeoMetadata(p);
    if (meta.titleConfidence === 'HIGH') titleImprovedCount++;
    if (p.description && p.description.length >= 50 && p.description.length <= 160) descriptionImprovedCount++;
  }

  // factcheck 대상
  const factcheckNeeded = posts.filter(p => computeFactCheckFlag(p).flagged).length;

  // orphan (들어오는 내부링크 없는 글)
  const orphanCount = posts.filter(p => (graph.incoming.get(p.slug)?.size ?? 0) === 0).length;

  // 내부링크 총수
  let totalInternalLinks = 0;
  for (const [, set] of graph.outgoing) totalInternalLinks += set.size;

  // redirect 수 (wrangler.toml 파싱)
  const wranglerPath = path.join(process.cwd(), 'wrangler.toml');
  const wranglerRaw = fs.readFileSync(wranglerPath, 'utf-8');
  const redirectMatches = wranglerRaw.match(/from = "\/blog\//g) ?? [];
  const redirectCount = redirectMatches.length;

  ensureAuditDir();
  const snapshot = {
    generatedAt: new Date().toISOString(),
    gitCommit: 'eced657',
    totalPosts: posts.length,
    byCategory,
    byCluster,
    pillarCount: PILLARS.length,
    pillarSlugs: PILLARS.map(p => p.slug),
    primaryPageCount: primaryPages.size,
    titleImprovedCount,
    descriptionImprovedCount,
    factcheckNeededCount: factcheckNeeded,
    orphanCount,
    totalInternalLinks,
    redirectCount,
    phase4StartNote: 'Phase 4 시작 스냅샷. 자동발행으로 이후 생성된 글은 date > 2026-08-18로 식별.',
  };

  fs.writeFileSync(
    path.join(AUDIT_DIR, 'phase4-baseline.json'),
    JSON.stringify(snapshot, null, 2),
    'utf-8',
  );
  console.log(`Phase 4 baseline 생성 완료 — 총 ${posts.length}개 글 / Primary Page ${primaryPages.size}개`);
  console.log(`출력: seo-audit/phase4-baseline.json`);
}

main();
