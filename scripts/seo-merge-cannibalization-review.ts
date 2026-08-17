// SEO 2단계 §16-18 — 통합 후보/역할분리 후보를 실행하지 않고 사람이 판단
//하기 쉽게 상세 정보를 담아 다시 정리한다. content/blog/는 읽기만 한다.
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { type AuditPost, findDuplicateCandidates, classifyClusterDetailed } from '../lib/seoAudit';
import { computeSeoMetadata } from '../lib/seoMetadata';
import { getPillarForCluster } from '../lib/pillars';

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');
const AUDIT_DIR = path.join(process.cwd(), 'seo-audit');
const SITE_URL = 'https://honsamnote.co.kr';

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

function csvEscape(value: unknown): string {
  const s = value === undefined || value === null ? '' : String(value);
  if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}
function toCsv(columns: string[], rows: Record<string, unknown>[]): string {
  const lines = [columns.join(',')];
  for (const row of rows) lines.push(columns.map(c => csvEscape(row[c])).join(','));
  return '﻿' + lines.join('\r\n') + '\r\n';
}

function main() {
  const posts = loadAllPosts();
  const postBySlug = new Map(posts.map(p => [p.slug, p]));
  const candidates = findDuplicateCandidates(posts);

  const mergeRows: Record<string, unknown>[] = [];
  const cannibalRows: Record<string, unknown>[] = [];

  for (const c of candidates) {
    const main = postBySlug.get(c.mainPost)!;
    const dup = postBySlug.get(c.duplicatePost)!;
    const mainMeta = computeSeoMetadata(main);
    const dupMeta = computeSeoMetadata(dup);

    // 차별점: 서로 겹치지 않는 keyword(=각 글만의 고유 관점)를 보여준다.
    const mainUnique = main.keywords.filter(k => !dup.keywords.includes(k));
    const dupUnique = dup.keywords.filter(k => !main.keywords.includes(k));
    const differentiator =
      mainMeta.searchIntent !== dupMeta.searchIntent
        ? `검색의도 다름: ${c.mainPost}=${mainMeta.searchIntent} / ${c.duplicatePost}=${dupMeta.searchIntent}`
        : `${c.mainPost} 고유 키워드: ${mainUnique.slice(0, 3).join(', ') || '(없음)'} / ${c.duplicatePost} 고유 키워드: ${dupUnique.slice(0, 3).join(', ') || '(없음)'}`;

    const whatToPreserve = dupUnique.length > 0
      ? `${c.duplicatePost}에만 있는 관점(${dupUnique.slice(0, 3).join(', ')})은 통합 시에도 본문에 반영 필요`
      : '두 글 내용이 거의 동일 — 통합 시 손실 우려 적음';

    if (c.recommendedAction === 'C. 통합 후보') {
      mergeRows.push({
        main_post: c.mainPost,
        main_url: `${SITE_URL}/blog/${c.mainPost}/`,
        duplicate_post: c.duplicatePost,
        duplicate_url: `${SITE_URL}/blog/${c.duplicatePost}/`,
        primary_keyword: c.expectedPrimaryKeyword,
        search_intent: mainMeta.searchIntent,
        similarity: c.similarity,
        differentiator,
        recommended_main: c.mainPost,
        what_to_preserve: whatToPreserve,
        split_alternative: '통합 권장 — 역할 분리보다는 병합이 더 적합(유사도 매우 높음)',
        redirect_required: c.redirectRequired,
      });
    } else {
      // 역할분리 등급: 유사도 + 같은 Pillar 소속 여부로 HIGH/MEDIUM/LOW를 정한다.
      const mainCluster = classifyClusterDetailed(main).clusterSlug;
      const dupCluster = classifyClusterDetailed(dup).clusterSlug;
      const samePillar = mainCluster === dupCluster && getPillarForCluster(mainCluster) !== undefined;
      let tier: 'HIGH' | 'MEDIUM' | 'LOW';
      if (c.similarity >= 0.65 || (samePillar && c.similarity >= 0.55)) tier = 'HIGH';
      else if (c.similarity >= 0.55) tier = 'MEDIUM';
      else tier = 'LOW';

      cannibalRows.push({
        main_post: c.mainPost,
        duplicate_post: c.duplicatePost,
        tier,
        similarity: c.similarity,
        same_pillar: samePillar ? '예' : '아니오',
        reason: c.similarityReason,
        differentiator,
        recommended_role_split: dupUnique.length > 0
          ? `${c.mainPost}=주요 관점 유지, ${c.duplicatePost}=${dupUnique[0]} 중심으로 검색의도 분리 검토`
          : '차별화 포인트가 뚜렷하지 않음 — 통합 후보로 재검토 권장',
      });
    }
  }

  fs.mkdirSync(AUDIT_DIR, { recursive: true });

  const mergeColumns = ['main_post', 'main_url', 'duplicate_post', 'duplicate_url', 'primary_keyword', 'search_intent', 'similarity', 'differentiator', 'recommended_main', 'what_to_preserve', 'split_alternative', 'redirect_required'];
  fs.writeFileSync(path.join(AUDIT_DIR, 'merge-candidates.csv'), toCsv(mergeColumns, mergeRows), 'utf-8');

  const cannibalColumns = ['main_post', 'duplicate_post', 'tier', 'similarity', 'same_pillar', 'reason', 'differentiator', 'recommended_role_split'];
  cannibalRows.sort((a, b) => {
    const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return order[a.tier as keyof typeof order] - order[b.tier as keyof typeof order];
  });
  fs.writeFileSync(path.join(AUDIT_DIR, 'cannibalization-review.csv'), toCsv(cannibalColumns, cannibalRows), 'utf-8');

  const tierCounts = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  for (const r of cannibalRows) tierCounts[r.tier as keyof typeof tierCounts]++;
  console.log(`통합 후보(merge-candidates.csv): ${mergeRows.length}쌍`);
  console.log(`역할분리 검토(cannibalization-review.csv): ${cannibalRows.length}쌍 — HIGH: ${tierCounts.HIGH}, MEDIUM: ${tierCounts.MEDIUM}, LOW: ${tierCounts.LOW}`);
}

main();
