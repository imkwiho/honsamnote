// SEO 2단계 §2 — 18개 Pillar 후보 클러스터를 A(즉시 가능)/B(보강 필요)/
// C(부적합)로 분류해 seo-audit/pillar-plan.csv를 생성한다. content/blog/를
// 읽기만 하고 쓰지 않는다.
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { type AuditPost, classifyClusterDetailed, CLUSTER_TAXONOMY } from '../lib/seoAudit';

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');
const AUDIT_DIR = path.join(process.cwd(), 'seo-audit');
const PILLAR_CANDIDATE_THRESHOLD = 8; // 1단계와 동일 기준

// A등급 판정 기준: 하위 글이 충분히 많고(15개 이상) 평균 매치 점수가 높아
// (1.3 이상) 클러스터 정의가 실제로 잘 들어맞는 경우만. "전반"/"기타"처럼
// 이름 자체가 카테고리 전체를 뭉뚱그리는 클러스터는 글이 많아도 C로 내린다
// (실측: general-living-cost는 카테고리 내 53개 글이 걸리지만, 정의하는
// keyword 자체가 카테고리 이름과 거의 같아 "검색의도가 너무 넓은" 사례).
const GENERIC_CATCHALL_CLUSTERS = new Set(['general-living-cost']);
const A_MIN_COUNT = 15;
const A_MIN_AVG_SCORE = 1.3;
const C_MAX_AVG_SCORE = 1.2;

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

  const stats = new Map<string, { name: string; count: number; totalScore: number; category: string; childSlugs: string[] }>();
  for (const post of posts) {
    const { clusterSlug, clusterName, matchScore } = classifyClusterDetailed(post);
    if (clusterSlug.endsWith('-general')) continue;
    const s = stats.get(clusterSlug) ?? { name: clusterName, count: 0, totalScore: 0, category: post.category ?? '', childSlugs: [] };
    s.count++;
    s.totalScore += matchScore;
    s.childSlugs.push(post.slug);
    stats.set(clusterSlug, s);
  }

  const candidates = [...stats.entries()].filter(([, s]) => s.count >= PILLAR_CANDIDATE_THRESHOLD);
  candidates.sort((a, b) => b[1].count - a[1].count);

  const rows = candidates.map(([clusterId, s]) => {
    const avgScore = s.totalScore / s.count;
    const isCatchAll = GENERIC_CATCHALL_CLUSTERS.has(clusterId);
    let status: 'A' | 'B' | 'C';
    let reason: string;
    if (isCatchAll) {
      status = 'C';
      reason = `클러스터 이름/정의 keyword가 카테고리 전체와 거의 동일한 "전반" 성격 — 검색의도가 너무 넓음(평균 매치점수 ${avgScore.toFixed(2)})`;
    } else if (avgScore < C_MAX_AVG_SCORE) {
      status = 'C';
      reason = `평균 매치점수(${avgScore.toFixed(2)})가 낮아 클러스터 정의와 실제 글 내용의 연관성이 약함`;
    } else if (s.count >= A_MIN_COUNT && avgScore >= A_MIN_AVG_SCORE) {
      status = 'A';
      reason = `하위 글 ${s.count}개, 평균 매치점수 ${avgScore.toFixed(2)}로 충분히 많고 일관됨`;
    } else {
      status = 'B';
      reason = s.count < A_MIN_COUNT
        ? `평균 매치점수(${avgScore.toFixed(2)})는 양호하나 하위 글 수(${s.count})가 아직 적어 대표 콘텐츠가 얇을 위험`
        : `하위 글 수는 충분하나 평균 매치점수(${avgScore.toFixed(2)})가 A등급 기준(${A_MIN_AVG_SCORE})에 못 미침`;
    }

    const def = Object.values(CLUSTER_TAXONOMY).flat().find(d => d.slug === clusterId);
    const primaryKeyword = def?.matchTerms[0] ?? s.name;

    return {
      pillar_name: s.name,
      cluster_id: clusterId,
      primary_keyword: primaryKeyword,
      article_count: s.count,
      status,
      reason,
      recommended_url: status === 'A' ? `/guide/${clusterId}/` : '(해당 없음)',
      child_posts: s.childSlugs.join('; '),
    };
  });

  fs.mkdirSync(AUDIT_DIR, { recursive: true });
  const columns = ['pillar_name', 'cluster_id', 'primary_keyword', 'article_count', 'status', 'reason', 'recommended_url', 'child_posts'];
  fs.writeFileSync(path.join(AUDIT_DIR, 'pillar-plan.csv'), toCsv(columns, rows), 'utf-8');

  const counts = { A: 0, B: 0, C: 0 };
  for (const r of rows) counts[r.status as 'A' | 'B' | 'C']++;
  console.log(`Pillar 후보 ${rows.length}개 분류 완료: A=${counts.A}, B=${counts.B}, C=${counts.C}`);
  rows.forEach(r => console.log(` [${r.status}] ${r.cluster_id} (${r.article_count}개) — ${r.reason}`));
}

main();
