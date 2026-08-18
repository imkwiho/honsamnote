// SEO 4단계 §16-17 — B등급 Pillar 재평가.
// 3단계에서 추가된 B등급 3개(emergency-response, kitchen-cleaning, bathroom-cleaning)와
// 기존에 승격 후보로 올라온 클러스터들을 재평가: PROMOTE / HOLD / REJECT
import fs from 'fs';
import path from 'path';
import {
  loadAllPosts, AUDIT_DIR, BLOG_DIR, ensureAuditDir,
} from './lib/seoPhase4Shared';
import { classifyClusterDetailed, primaryKeyword } from '../lib/seoAudit';
import { computeSeoMetadata } from '../lib/seoMetadata';
import { buildLinkGraph } from '../lib/linkGraph';
import { computePrimaryPages } from '../lib/primaryPages';
import { PILLARS, getPillarForCluster } from '../lib/pillars';

const PILLAR_PAGE_TEMPLATE = (slug: string, title: string, description: string, children: string[]) => `---
title: "${title}"
description: "${description}"
date: "2026-08-18"
category: "guide"
tags: []
pillar: true
pillarSlug: "${slug}"
---

# ${title}

${description}

## 이 가이드에서 다루는 내용

${children.map(c => `- [${c}](/blog/${c}/)`).join('\n')}
`;

interface ClusterStats {
  slug: string;
  memberCount: number;
  avgIncoming: number;
  primarySlug: string | null;
  primaryTitleConfidence: string;
  hasPillar: boolean;
  topKw: string;
  memberSlugs: string[];
}

function main() {
  const posts = loadAllPosts();
  const graph = buildLinkGraph(posts);
  const primaryPages = computePrimaryPages(posts, graph);
  const postMap = new Map(posts.map(p => [p.slug, p]));

  // 클러스터별 통계 집계
  const clusterMap = new Map<string, string[]>();
  for (const post of posts) {
    const { clusterSlug } = classifyClusterDetailed(post);
    if (!clusterMap.has(clusterSlug)) clusterMap.set(clusterSlug, []);
    clusterMap.get(clusterSlug)!.push(post.slug);
  }

  const clusterStats: ClusterStats[] = [];
  for (const [slug, memberSlugs] of clusterMap.entries()) {
    const pp = primaryPages.get(slug);
    const primaryPost = pp ? postMap.get(pp.primarySlug) : undefined;
    const avgIncoming = memberSlugs.reduce((acc, s) => acc + (graph.incoming.get(s)?.size ?? 0), 0) / memberSlugs.length;

    // 대표 키워드: Primary Page 또는 최多 인링크 포스트에서 추출
    const repPost = primaryPost ?? postMap.get(memberSlugs[0]);
    const topKw = repPost ? (primaryKeyword(repPost) ?? '') : '';

    clusterStats.push({
      slug,
      memberCount: memberSlugs.length,
      avgIncoming: Math.round(avgIncoming * 10) / 10,
      primarySlug: pp?.primarySlug ?? null,
      primaryTitleConfidence: primaryPost ? computeSeoMetadata(primaryPost).titleConfidence : 'UNKNOWN',
      hasPillar: !!getPillarForCluster(slug),
      topKw,
      memberSlugs,
    });
  }

  // 현재 B등급 Pillar 클러스터 (3단계에서 추가된 것: emergency-response, kitchen-cleaning, bathroom-cleaning)
  // lib/pillars.ts에 grade 필드가 없으므로 3단계 추가 클러스터 ID로 직접 식별
  const B_GRADE_CLUSTER_IDS = new Set(['emergency-response', 'kitchen-cleaning', 'bathroom-cleaning']);
  const bGradePillars = PILLARS.filter(p => B_GRADE_CLUSTER_IDS.has(p.clusterId));

  // 평가 대상: B등급 Pillar + Pillar 없는 클러스터 중 상위 후보
  const noGradeCandidates = clusterStats
    .filter(cs => !cs.hasPillar && cs.memberCount >= 8 && cs.avgIncoming >= 1.5)
    .sort((a, b) => b.memberCount - a.memberCount)
    .slice(0, 10);

  const lines: string[] = [
    '# SEO 4단계 §16-17 — B등급 Pillar 재평가 보고서',
    '',
    `생성일: ${new Date().toISOString().slice(0, 10)}`,
    '',
    '## 1. 현재 B등급 Pillar 재평가',
    '',
  ];

  const decisionRows: Record<string, unknown>[] = [];

  for (const pillar of bGradePillars) {
    const stats = clusterStats.find(cs => cs.slug === pillar.clusterId);
    if (!stats) continue;

    const memberCount = stats.memberCount;
    const avgIncoming = stats.avgIncoming;
    const primaryConf = stats.primaryTitleConfidence;

    // PROMOTE 조건: 멤버 12개 이상 + 평균 인링크 2.0 이상 + Primary HIGH
    // REJECT 조건: 멤버 5개 미만 또는 평균 인링크 0.5 미만
    // 나머지: HOLD
    const decision = memberCount >= 12 && avgIncoming >= 2.0 && primaryConf === 'HIGH' ? 'PROMOTE'
      : memberCount < 5 || avgIncoming < 0.5 ? 'REJECT'
      : 'HOLD';

    const reason = decision === 'PROMOTE'
      ? `멤버 ${memberCount}개, 평균 인링크 ${avgIncoming}, Primary=HIGH — A등급 승격 조건 충족`
      : decision === 'REJECT'
      ? `멤버 ${memberCount}개, 평균 인링크 ${avgIncoming} — 클러스터 규모 부족`
      : `멤버 ${memberCount}개, 평균 인링크 ${avgIncoming}, Primary=${primaryConf} — 조건 미충족, 유지`;

    decisionRows.push({
      pillar_id: pillar.id,
      cluster: pillar.clusterId,
      grade: 'B',
      member_count: memberCount,
      avg_incoming: avgIncoming,
      primary_title_confidence: primaryConf,
      decision,
      reason,
    });

    lines.push(`### ${pillar.id} (클러스터: ${pillar.clusterId})`);
    lines.push(`- 멤버 수: ${memberCount}개`);
    lines.push(`- 평균 인바운드 링크: ${avgIncoming}`);
    lines.push(`- Primary Page 제목 신뢰도: ${primaryConf}`);
    lines.push(`- **결정: ${decision}**`);
    lines.push(`- 이유: ${reason}`);
    lines.push('');
  }

  lines.push('## 2. 신규 Pillar 후보 (현재 Pillar 없는 상위 클러스터)');
  lines.push('');
  lines.push('> 최대 2-3개만 신규 생성 (4단계 원칙)');
  lines.push('');

  const promoteNew: typeof noGradeCandidates = [];
  for (const cs of noGradeCandidates) {
    const decision = cs.memberCount >= 15 && cs.avgIncoming >= 2.5 ? 'PROMOTE_NEW'
      : cs.memberCount >= 10 ? 'CANDIDATE'
      : 'SKIP';

    if (decision === 'PROMOTE_NEW') promoteNew.push(cs);

    decisionRows.push({
      pillar_id: `new-${cs.slug}-guide`,
      cluster: cs.slug,
      grade: 'NEW',
      member_count: cs.memberCount,
      avg_incoming: cs.avgIncoming,
      primary_title_confidence: cs.primaryTitleConfidence,
      decision,
      reason: decision === 'PROMOTE_NEW'
        ? `멤버 ${cs.memberCount}개, 평균 인링크 ${cs.avgIncoming} — 신규 B등급 Pillar 생성 권장`
        : `멤버 ${cs.memberCount}개 — 후보이나 기준 미충족, 추가 성장 후 재검토`,
    });

    lines.push(`### 클러스터: ${cs.slug}`);
    lines.push(`- 멤버 수: ${cs.memberCount}개`);
    lines.push(`- 평균 인바운드: ${cs.avgIncoming}`);
    lines.push(`- **결정: ${decision}**`);
    lines.push('');
  }

  // PROMOTE_NEW 클러스터가 있으면 Pillar 페이지 생성 (최대 3개)
  const created: string[] = [];
  for (const cs of promoteNew.slice(0, 3)) {
    const pillarSlug = cs.slug;
    const title = `${cs.topKw || cs.slug} 완전 가이드`;
    const description = `${cs.topKw || cs.slug}에 대해 혼자 사는 분들이 꼭 알아야 할 내용을 정리한 가이드입니다.`;
    const filePath = path.join(BLOG_DIR, `guide-${pillarSlug}.mdx`);

    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(
        filePath,
        PILLAR_PAGE_TEMPLATE(pillarSlug, title, description, cs.memberSlugs.slice(0, 10)),
        'utf-8',
      );
      created.push(filePath);
    }
  }

  lines.push('## 3. 결과 요약');
  lines.push('');
  const promotes = decisionRows.filter(r => r.decision === 'PROMOTE');
  const rejects = decisionRows.filter(r => r.decision === 'REJECT');
  const promoteNews = decisionRows.filter(r => r.decision === 'PROMOTE_NEW');
  lines.push(`- B등급 Pillar 재평가: PROMOTE ${promotes.length}개 / HOLD ${decisionRows.filter(r => r.decision === 'HOLD').length}개 / REJECT ${rejects.length}개`);
  lines.push(`- 신규 Pillar 생성: ${promoteNews.length}개 (최대 3개 제한 적용)`);
  if (created.length > 0) lines.push(`- 생성된 파일: ${created.join(', ')}`);
  lines.push('');
  lines.push('> NOTE: PROMOTE 결정된 B등급 Pillar를 A등급으로 수동 업그레이드하려면 `lib/pillars.ts`에서 grade 필드를 변경하라.');

  ensureAuditDir();
  fs.writeFileSync(path.join(AUDIT_DIR, 'pillar-b-review4.md'), lines.join('\n'), 'utf-8');

  const csvColumns = ['pillar_id', 'cluster', 'grade', 'member_count', 'avg_incoming', 'primary_title_confidence', 'decision', 'reason'];
  fs.writeFileSync(
    path.join(AUDIT_DIR, 'pillar-b-review4.csv'),
    toCsv(csvColumns, decisionRows),
    'utf-8',
  );

  console.log('Pillar B등급 재평가 완료');
  console.log(`  B등급 Pillar 평가: ${bGradePillars.length}개`);
  console.log(`  신규 후보 검토: ${noGradeCandidates.length}개`);
  console.log(`  신규 Pillar 페이지 생성: ${created.length}개`);
  console.log('출력: seo-audit/pillar-b-review4.md, seo-audit/pillar-b-review4.csv');

  function toCsv(columns: string[], rows: Record<string, unknown>[]): string {
    const header = columns.join(',');
    const body = rows.map(r =>
      columns.map(c => {
        const v = String(r[c] ?? '');
        return v.includes(',') || v.includes('"') || v.includes('\n')
          ? `"${v.replace(/"/g, '""')}"`
          : v;
      }).join(',')
    ).join('\n');
    return header + '\n' + body + '\n';
  }
}

main();
