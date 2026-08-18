// SEO 4단계 §13-14 — Primary Page 품질 감사 + PRIMARY_AUTHORITY_SCORE 계산.
// 각 클러스터의 Primary Page가 실제로 대표성을 갖추는지 평가한다.
import fs from 'fs';
import path from 'path';
import {
  loadAllPosts, AUDIT_DIR, SITE_URL, ensureAuditDir, toCsv, extractPlainText,
} from './lib/seoPhase4Shared';
import { classifyClusterDetailed, computeFactCheckFlag, primaryKeyword } from '../lib/seoAudit';
import { computeSeoMetadata } from '../lib/seoMetadata';
import { buildLinkGraph } from '../lib/linkGraph';
import { computePrimaryPages } from '../lib/primaryPages';
import { getPillarForCluster } from '../lib/pillars';

function wordCount(content: string): number {
  return extractPlainText(content).replace(/\s+/g, ' ').trim().split(' ').filter(Boolean).length;
}

function main() {
  const posts = loadAllPosts();
  const graph = buildLinkGraph(posts);
  const primaryPages = computePrimaryPages(posts, graph);
  const postMap = new Map(posts.map(p => [p.slug, p]));

  // 클러스터별 포스트 수
  const clusterMemberMap = new Map<string, string[]>();
  for (const post of posts) {
    const { clusterSlug } = classifyClusterDetailed(post);
    if (!clusterMemberMap.has(clusterSlug)) clusterMemberMap.set(clusterSlug, []);
    clusterMemberMap.get(clusterSlug)!.push(post.slug);
  }

  const rows: Record<string, unknown>[] = [];

  for (const [clusterSlug, pp] of primaryPages.entries()) {
    const primary = postMap.get(pp.primarySlug);
    if (!primary) continue;

    const clusterMembers = clusterMemberMap.get(clusterSlug) ?? [];
    const clusterSize = clusterMembers.length;
    const meta = computeSeoMetadata(primary);
    const kw = primaryKeyword(primary);
    const pillar = getPillarForCluster(clusterSlug);
    const incomingLinks = graph.incoming.get(primary.slug)?.size ?? 0;
    const outgoingLinks = graph.outgoing.get(primary.slug)?.size ?? 0;
    const wc = wordCount(primary.content);
    const hasFactcheckRisk = computeFactCheckFlag(primary).flagged;
    const titleConfidence = meta.titleConfidence;

    // PRIMARY_AUTHORITY_SCORE (0-100)
    // 각 요소별 점수
    const linkScore = Math.min(30, incomingLinks * 5 + outgoingLinks * 2);       // max 30
    const contentScore = wc >= 600 ? 20 : wc >= 300 ? 10 : 5;                   // max 20
    const titleScore = titleConfidence === 'HIGH' ? 15 : titleConfidence === 'MEDIUM' ? 8 : 3; // max 15
    const clusterCoverageScore = Math.min(15, clusterSize * 1.5);                // max 15
    const pillarBonus = pillar ? 10 : 0;                                         // max 10
    const kwScore = kw ? 10 : 0;                                                 // max 10
    const penalty = hasFactcheckRisk ? -10 : 0;

    const authorityScore = Math.max(0, Math.min(100,
      linkScore + contentScore + titleScore + clusterCoverageScore + pillarBonus + kwScore + penalty
    ));

    // 상태 판정
    const status = authorityScore >= 70 ? 'STRONG'
      : authorityScore >= 45 ? 'MODERATE'
      : 'WEAK';

    // 개선 권고
    const recommendations: string[] = [];
    if (incomingLinks < 2) recommendations.push('내부 링크 부족 — 이 클러스터 글들에서 Primary Page로 링크 추가');
    if (wc < 300) recommendations.push('본문 짧음 — 클러스터 대표 글답게 내용 보강 검토');
    if (titleConfidence !== 'HIGH') recommendations.push('제목 신뢰도 낮음 — 제목 개선 대상');
    if (!kw) recommendations.push('대표 키워드 미설정 — 클러스터 핵심 키워드 적용 필요');
    if (hasFactcheckRisk) recommendations.push('사실 확인 위험 있음 — 내용 검증 후 권한 부여');

    rows.push({
      cluster: clusterSlug,
      primary_slug: primary.slug,
      url: `${SITE_URL}/blog/${primary.slug}/`,
      title: primary.title,
      primary_keyword: kw ?? '',
      has_pillar: pillar ? 'yes' : 'no',
      cluster_size: clusterSize,
      incoming_links: incomingLinks,
      outgoing_links: outgoingLinks,
      word_count: wc,
      title_confidence: titleConfidence,
      factcheck_risk: hasFactcheckRisk ? 'yes' : 'no',
      authority_score: authorityScore,
      status,
      recommendations: recommendations.join(' | ') || '이상 없음',
    });
  }

  // authority_score 오름차순 (약한 것 먼저)
  rows.sort((a, b) => (a.authority_score as number) - (b.authority_score as number));

  ensureAuditDir();
  const columns = [
    'cluster', 'primary_slug', 'url', 'title', 'primary_keyword',
    'has_pillar', 'cluster_size', 'incoming_links', 'outgoing_links',
    'word_count', 'title_confidence', 'factcheck_risk',
    'authority_score', 'status', 'recommendations',
  ];
  fs.writeFileSync(path.join(AUDIT_DIR, 'primary-page-audit.csv'), toCsv(columns, rows), 'utf-8');

  const strong = rows.filter(r => r.status === 'STRONG').length;
  const moderate = rows.filter(r => r.status === 'MODERATE').length;
  const weak = rows.filter(r => r.status === 'WEAK').length;
  console.log(`Primary Page 감사 완료 — ${primaryPages.size}개 클러스터`);
  console.log(`  STRONG: ${strong} / MODERATE: ${moderate} / WEAK: ${weak}`);
  console.log('출력: seo-audit/primary-page-audit.csv');
}

main();
