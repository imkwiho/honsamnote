// SEO 3단계 §1 — 작업 시작 전 현재 상태 스냅샷. 자동 발행이 다시 켜져
// 있으므로(2단계 마지막에 재개) 이 스크립트가 "이후 모든 3단계 스크립트의
// before 숫자"를 확정한다. content/blog/는 읽기만 한다.
import fs from 'fs';
import path from 'path';
import { classifyClusterDetailed, findDuplicateCandidates, computeFactCheckFlag } from '../lib/seoAudit';
import { PILLARS } from '../lib/pillars';
import { buildLinkGraph, findOrphanPages } from '../lib/linkGraph';
import { loadAllPosts, AUDIT_DIR, ensureAuditDir } from './lib/seoPhase3Shared';

function main() {
  const posts = loadAllPosts();

  // 2단계 완료 시점(content-audit.json)의 565개 slug와 비교해, 3단계 작업
  // 도중 새로 자동 발행된 글을 구분한다.
  const contentAuditPath = path.join(AUDIT_DIR, 'content-audit.json');
  let baselineSlugs = new Set<string>();
  if (fs.existsSync(contentAuditPath)) {
    const prev = JSON.parse(fs.readFileSync(contentAuditPath, 'utf-8')) as { post_id: string }[];
    baselineSlugs = new Set(prev.map(p => p.post_id));
  }
  const newlyPublished = posts.filter(p => !baselineSlugs.has(p.slug)).map(p => p.slug);

  const byCategory = new Map<string, number>();
  for (const p of posts) {
    const cat = p.category ?? '(없음)';
    byCategory.set(cat, (byCategory.get(cat) ?? 0) + 1);
  }

  const clusterAssigned = posts.filter(p => !classifyClusterDetailed(p).clusterSlug.endsWith('-general'));
  const graph = buildLinkGraph(posts);
  const orphans = findOrphanPages(posts, graph);
  const candidates = findDuplicateCandidates(posts);
  const mergeCandidates = candidates.filter(c => c.recommendedAction === 'C. 통합 후보');
  const cannibalCandidates = candidates.filter(c => c.recommendedAction === 'B. 역할 분리 검토');
  const factcheckNeeded = posts.filter(p => computeFactCheckFlag(p).flagged);

  const totalOutgoing = [...graph.outgoing.values()].reduce((sum, s) => sum + s.size, 0);

  const snapshot = {
    generatedAt: new Date().toISOString(),
    totalPosts: posts.length,
    baselinePostCount: baselineSlugs.size || posts.length,
    newlyPublishedSincePhase2: newlyPublished,
    byCategory: Object.fromEntries(byCategory),
    clusterAssignedCount: clusterAssigned.length,
    clusterUnassignedCount: posts.length - clusterAssigned.length,
    orphanCount: orphans.length,
    avgOutgoingLinks: Math.round((totalOutgoing / posts.length) * 100) / 100,
    pillarCount: PILLARS.length,
    pillarSlugs: PILLARS.map(p => p.slug),
    mergeCandidateCount: mergeCandidates.length,
    cannibalizationCandidateCount: cannibalCandidates.length,
    factcheckNeededCount: factcheckNeeded.length,
  };

  ensureAuditDir();
  fs.writeFileSync(path.join(AUDIT_DIR, 'phase3-baseline.json'), JSON.stringify(snapshot, null, 2), 'utf-8');

  console.log('=== SEO 3단계 baseline snapshot ===');
  console.log(`전체 글: ${snapshot.totalPosts}개 (2단계 종료 시점 대비 신규: ${newlyPublished.length}개)`);
  if (newlyPublished.length > 0) console.log(`  신규 발행: ${newlyPublished.join(', ')}`);
  console.log(`클러스터 적용: ${snapshot.clusterAssignedCount}개 / 미지정: ${snapshot.clusterUnassignedCount}개`);
  console.log(`orphan: ${snapshot.orphanCount}개, 평균 outgoing 링크: ${snapshot.avgOutgoingLinks}`);
  console.log(`Pillar: ${snapshot.pillarCount}개`);
  console.log(`통합 후보: ${snapshot.mergeCandidateCount}쌍, 역할분리 검토: ${snapshot.cannibalizationCandidateCount}쌍`);
  console.log(`fact-check 필요: ${snapshot.factcheckNeededCount}개`);
  console.log('출력: seo-audit/phase3-baseline.json');
}

main();
