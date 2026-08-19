// SEO 5단계 §0 — 시작 스냅샷.
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { execSync } from 'child_process';
import { type AuditPost } from '../lib/seoAudit';
import { buildLinkGraph, findOrphanPages } from '../lib/linkGraph';
import { PILLARS } from '../lib/pillars';
import { computePrimaryPages } from '../lib/primaryPages';

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');
const AUDIT_DIR = path.join(process.cwd(), 'seo-audit');

/** 따옴표 처리하는 최소 CSV 행 파서 */
function parseCsvRow(line: string): string[] {
  const cells: string[] = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      let j = i + 1;
      while (j < line.length) {
        if (line[j] === '"' && line[j + 1] === '"') j += 2;
        else if (line[j] === '"') { j++; break; }
        else j++;
      }
      cells.push(line.slice(i + 1, j - 1).replace(/""/g, '"'));
      i = j + 1; // skip comma
    } else {
      const j = line.indexOf(',', i);
      if (j === -1) { cells.push(line.slice(i)); break; }
      cells.push(line.slice(i, j));
      i = j + 1;
    }
  }
  return cells;
}

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

function getGitCommit(): string {
  try { return execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim(); }
  catch { return 'unknown'; }
}

function main() {
  const posts = loadAllPosts();
  const graph = buildLinkGraph(posts);
  const orphans = findOrphanPages(posts, graph);
  const primaryPages = computePrimaryPages(posts, graph);

  // P1/P2 counts from existing factcheck-details.csv
  let p1Count = 0, p2Count = 0, p3Count = 0;
  const fcPath = path.join(AUDIT_DIR, 'factcheck-details.csv');
  if (fs.existsSync(fcPath)) {
    const lines = fs.readFileSync(fcPath, 'utf-8').replace(/^﻿/, '').split('\n').slice(1).filter(Boolean);
    for (const l of lines) {
      // CSV header: id,post_id,url,title,risk_level,claim,...
      const cols = parseCsvRow(l);
      const rl = cols[4]?.trim(); // risk_level
      if (rl === 'P1') p1Count++;
      else if (rl === 'P2') p2Count++;
      else if (rl === 'P3') p3Count++;
    }
  }

  // HIGH strong claims
  let highClaimsCount = 0;
  const scPath = path.join(AUDIT_DIR, 'strong-claim-review.csv');
  if (fs.existsSync(scPath)) {
    const lines = fs.readFileSync(scPath, 'utf-8').replace(/^﻿/, '').split('\n').slice(1).filter(Boolean);
    for (const l of lines) {
      // CSV header: post_id,url,category,title,phrases_found,total_occurrences,priority,...
      const cols = parseCsvRow(l);
      if (cols[6]?.trim() === 'HIGH') highClaimsCount++;
    }
  }

  // Answer-first safe candidates
  let answerFirstSafe = 0;
  const afPath = path.join(AUDIT_DIR, 'answer-first-candidates.csv');
  if (fs.existsSync(afPath)) {
    const lines = fs.readFileSync(afPath, 'utf-8').replace(/^﻿/, '').split('\n').slice(1).filter(Boolean);
    for (const l of lines) {
      // CSV header: post_id,url,title,primary_keyword,search_intent,has_answer_signal,emotional_intro,answer_delayed,kw_position,safe_to_improve,...
      const cols = parseCsvRow(l);
      if (cols[9]?.trim() === 'yes') answerFirstSafe++;
    }
  }

  // Total internal links
  let totalLinks = 0;
  for (const [, targets] of graph.outgoing) totalLinks += targets.size;

  // Search Console connected?
  const gscPath = path.join(AUDIT_DIR, 'search-console-import.json');
  let gscConnected = false;
  if (fs.existsSync(gscPath)) {
    const gsc = JSON.parse(fs.readFileSync(gscPath, 'utf-8'));
    gscConnected = (gsc.queryRows?.length ?? 0) > 0;
  }

  const baseline = {
    generatedAt: new Date().toISOString(),
    gitCommit: getGitCommit(),
    phase: 5,
    totalPosts: posts.length,
    phase4StartDate: '2026-08-18',
    newPostsSincePhase4: posts.filter(p => p.date > '2026-08-18').length,
    p1ClaimCount: p1Count,
    p2ClaimCount: p2Count,
    p3ClaimCount: p3Count,
    highStrongClaimsCount: highClaimsCount,
    answerFirstSafeCandidates: answerFirstSafe,
    primaryPageCount: primaryPages.size,
    pillarCount: PILLARS.length,
    orphanCount: orphans.length,
    totalInternalLinks: totalLinks,
    gscDataConnected: gscConnected,
    gscStatus: gscConnected ? 'CONNECTED' : 'GSC_DATA_REQUIRED',
    phase5StartNote: 'Phase 5 시작 스냅샷. 정확성 확보 + GSC 연결 + 실제 데이터 기반 개선 단계.',
  };

  fs.mkdirSync(AUDIT_DIR, { recursive: true });
  fs.writeFileSync(path.join(AUDIT_DIR, 'phase5-baseline.json'), JSON.stringify(baseline, null, 2), 'utf-8');

  console.log('Phase 5 baseline 생성 완료');
  console.log(`  전체 게시글: ${baseline.totalPosts}개 (Phase4 이후 신규: ${baseline.newPostsSincePhase4}개)`);
  console.log(`  P1 claim: ${p1Count}건 / P2: ${p2Count}건 / P3: ${p3Count}건`);
  console.log(`  HIGH 단정 표현: ${highClaimsCount}개`);
  console.log(`  Answer-first 안전 후보: ${answerFirstSafe}개`);
  console.log(`  Primary Page: ${primaryPages.size}개 / Pillar: ${PILLARS.length}개`);
  console.log(`  Orphan: ${orphans.length}개 / 내부링크 총: ${totalLinks}개`);
  console.log(`  GSC 데이터: ${gscConnected ? 'CONNECTED' : 'GSC_DATA_REQUIRED'}`);
  console.log('출력: seo-audit/phase5-baseline.json');
}

main();
