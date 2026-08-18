// SEO 4단계 §8-10 — 남은 MEDIUM/LOW 제목(357개 내외)을 A/B/C 등급으로 나누고
// A등급 HIGH confidence만 실제 적용한다.
// 3단계 seo-title-phase3-top100.ts와 다른 점:
//  - 3단계: 상위 100개 우선 적용
//  - 4단계: 남은 전체를 다시 등급화(A/B/C), A-HIGH만 적용. 숫자 목표 없음.
import fs from 'fs';
import path from 'path';
import {
  loadAllPosts, AUDIT_DIR, BLOG_DIR, SITE_URL, ensureAuditDir, toCsv,
} from './lib/seoPhase4Shared';
import {
  type AuditPost,
  classifyClusterDetailed,
  computeFactCheckFlag,
  primaryKeyword,
  suggestTitle,
  suggestDescription,
  findDuplicateCandidates,
} from '../lib/seoAudit';
import { computeSeoMetadata, type TitleConfidence } from '../lib/seoMetadata';
import { getPillarForCluster } from '../lib/pillars';
import { buildLinkGraph } from '../lib/linkGraph';
import { computePrimaryPages } from '../lib/primaryPages';
import { replaceYamlStringField } from '../lib/yamlFieldReplace';

function main() {
  const posts = loadAllPosts();
  const graph = buildLinkGraph(posts);
  const primaryPages = computePrimaryPages(posts, graph);
  const dupCandidates = findDuplicateCandidates(posts);
  const riskySlugs = new Set<string>();
  for (const c of dupCandidates) { riskySlugs.add(c.mainPost); riskySlugs.add(c.duplicatePost); }

  // 기존 3단계 top100 CSV 슬러그 목록 (이미 적용된 것은 다시 대상에 넣지 않음)
  const top100CsvPath = path.join(AUDIT_DIR, 'title-phase3-top100.csv');
  const phase3Applied = new Set<string>();
  if (fs.existsSync(top100CsvPath)) {
    const lines = fs.readFileSync(top100CsvPath, 'utf-8').replace(/^﻿/, '').split('\n').slice(1);
    for (const l of lines) {
      const slug = l.split(',')[1]?.trim();
      if (slug) phase3Applied.add(slug);
    }
  }

  const membersByCluster = new Map<string, number>();
  for (const p of posts) {
    const { clusterSlug } = classifyClusterDetailed(p);
    membersByCluster.set(clusterSlug, (membersByCluster.get(clusterSlug) ?? 0) + 1);
  }

  // MEDIUM/LOW 중 3단계 미적용된 글만
  const remaining = posts.filter(p => {
    const meta = computeSeoMetadata(p);
    return (meta.titleConfidence === 'MEDIUM' || meta.titleConfidence === 'LOW')
      && !phase3Applied.has(p.slug);
  });

  const allTitlesLower = new Set(posts.map(p => p.title.trim().toLowerCase()));
  const proposedTitlesThisBatch = new Set<string>();

  const rows: Record<string, unknown>[] = [];
  const backupPosts: AuditPost[] = [];
  let appliedCount = 0;

  for (const post of remaining) {
    const meta = computeSeoMetadata(post);
    const { clusterSlug } = classifyClusterDetailed(post);
    const kw = primaryKeyword(post);
    const isPrimary = [...primaryPages.values()].some(pp => pp.primarySlug === post.slug);
    const hasPillar = !!getPillarForCluster(clusterSlug);
    const clusterSize = membersByCluster.get(clusterSlug) ?? 0;
    const incomingLinks = graph.incoming.get(post.slug)?.size ?? 0;
    const outgoingLinks = graph.outgoing.get(post.slug)?.size ?? 0;
    const hasFactcheckRisk = computeFactCheckFlag(post).flagged;
    const hasCannibRisk = riskySlugs.has(post.slug);

    // TITLE VALUE SCORE
    const intentClarity = /[?]|까요|될까|vs|비교|기준|방법|하는\s법|고르는\s법/.test(post.title) ? 1 : 0;
    const kwSpecificity = kw ? (kw.length >= 4 ? 1 : 0.5) : 0;
    const clusterCentrality = Math.min(1, clusterSize / 20);
    const linkCentrality = Math.min(1, (incomingLinks + outgoingLinks) / 12);
    const titleLength = post.title.length;
    const isTooLong = titleLength > 40 ? 1 : 0;
    const missingKwInTitle = kw && !post.title.includes(kw) ? 1 : 0;

    const score =
      intentClarity * 2 +
      kwSpecificity * 2 +
      clusterCentrality * 1.5 +
      linkCentrality * 1.5 +
      (isPrimary ? 2 : 0) +
      (hasPillar ? 1 : 0) +
      isTooLong * 1 +
      missingKwInTitle * 1.5 -
      (hasFactcheckRisk ? 2 : 0) -
      (hasCannibRisk ? 1.5 : 0);

    // 등급 결정
    const grade: 'A' | 'B' | 'C' =
      meta.titleConfidence === 'LOW' ? 'C'
      : score >= 6 ? 'A'
      : score >= 3 ? 'B'
      : 'C';

    // 제안 제목
    const proposedTitle = kw ? suggestTitle(post) : post.title;
    const proposedDescription = suggestDescription(post);

    // confidence 재판정 (A등급만)
    let finalConfidence: TitleConfidence = meta.titleConfidence;
    let reason = meta.titleConfidenceReason;

    if (grade === 'A' && kw) {
      const identical = proposedTitle.trim() === post.title.trim();
      const collides = !identical && (
        allTitlesLower.has(proposedTitle.trim().toLowerCase()) ||
        proposedTitlesThisBatch.has(proposedTitle.trim().toLowerCase())
      );
      const isRoleSplit = meta.titleConfidenceReason.startsWith('role-split');

      if (identical) {
        reason = '제안 제목이 원제목과 동일 — 변경 없음';
      } else if (collides) {
        reason = '충돌 위험: 다른 글 제목과 동일해질 수 있음';
        finalConfidence = 'MEDIUM';
      } else if (isRoleSplit) {
        reason = `role-split 위험: ${meta.titleConfidenceReason}`;
        finalConfidence = 'LOW';
      } else if (hasFactcheckRisk) {
        reason = 'fact-check 위험 있는 글 — 제목 변경 보류(내용 검증 우선)';
        finalConfidence = 'MEDIUM';
      } else {
        finalConfidence = 'HIGH';
        reason = `A등급 재판정: score ${score.toFixed(1)}, 대표 키워드+의도 포함, 충돌 없음`;
        proposedTitlesThisBatch.add(proposedTitle.trim().toLowerCase());
      }
    }

    // HIGH만 실제 적용
    if (grade === 'A' && finalConfidence === 'HIGH') {
      backupPosts.push(post);
      const filePath = path.join(BLOG_DIR, `${post.slug}.mdx`);
      if (fs.existsSync(filePath)) {
        let raw = fs.readFileSync(filePath, 'utf-8');
        let changed = false;
        if (proposedTitle !== post.title) {
          const r = replaceYamlStringField(raw, 'title', proposedTitle);
          if (r.changed) { raw = r.raw; changed = true; }
        }
        if (proposedDescription && proposedDescription !== post.description) {
          const r = replaceYamlStringField(raw, 'description', proposedDescription);
          if (r.changed) { raw = r.raw; changed = true; }
        }
        if (changed) { fs.writeFileSync(filePath, raw, 'utf-8'); appliedCount++; }
      }
    }

    rows.push({
      rank: 0, // 정렬 후 재배정
      post_id: post.slug,
      url: `${SITE_URL}/blog/${post.slug}/`,
      current_title: post.title,
      proposed_title: proposedTitle,
      primary_keyword: kw ?? '',
      search_intent: meta.searchIntent,
      cluster: clusterSlug,
      primary_page: isPrimary ? 'yes' : 'no',
      score: Math.round(score * 10) / 10,
      grade,
      confidence: finalConfidence,
      action: grade === 'A' && finalConfidence === 'HIGH' ? 'APPLIED' : grade === 'A' ? `HOLD(${finalConfidence})` : `HOLD(${grade})`,
      reason: reason.slice(0, 200),
    });
  }

  // score 내림차순 정렬 + rank 부여
  rows.sort((a, b) => (b.score as number) - (a.score as number));
  rows.forEach((r, i) => { r.rank = i + 1; });

  // 백업
  const backupDir = path.join(process.cwd(), 'backup');
  fs.mkdirSync(backupDir, { recursive: true });
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  if (backupPosts.length > 0) {
    fs.writeFileSync(
      path.join(backupDir, `posts-before-title-phase4-${dateStr}.json`),
      JSON.stringify(backupPosts, null, 2),
      'utf-8',
    );
  }

  ensureAuditDir();
  const columns = [
    'rank', 'post_id', 'url', 'current_title', 'proposed_title',
    'primary_keyword', 'search_intent', 'cluster', 'primary_page',
    'score', 'grade', 'confidence', 'action', 'reason',
  ];
  fs.writeFileSync(path.join(AUDIT_DIR, 'remaining-title-priority.csv'), toCsv(columns, rows), 'utf-8');

  const aCount = rows.filter(r => r.grade === 'A').length;
  const bCount = rows.filter(r => r.grade === 'B').length;
  const cCount = rows.filter(r => r.grade === 'C').length;
  console.log(`남은 제목 재우선순위화 완료 — 대상 ${remaining.length}개`);
  console.log(`  A등급: ${aCount}개 / B등급: ${bCount}개 / C등급: ${cCount}개`);
  console.log(`  실제 적용(A-HIGH): ${appliedCount}개`);
  if (backupPosts.length > 0) console.log(`  백업: backup/posts-before-title-phase4-${dateStr}.json`);
  console.log('출력: seo-audit/remaining-title-priority.csv');
}

main();
