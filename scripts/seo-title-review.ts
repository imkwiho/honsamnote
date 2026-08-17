// SEO 2단계 §11-13 — 563개 제목 / 211개 meta description 개선안을 생성한다.
// 절대 자동 일괄변환(문자열 치환)이 아니다 — 각 글의 title/keywords/
// content/cluster/searchIntent를 lib/seoMetadata.ts가 실제로 계산해서
// 대표 검색어를 판단한 뒤 제안한다. 이 스크립트는 content/blog/를 읽기만
// 하고 절대 쓰지 않는다 — 실제 적용은 scripts/seo-apply-titles.ts가
// title-changes.csv를 다시 읽어서 HIGH만 골라 처리한다.
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { type AuditPost } from '../lib/seoAudit';
import { computeSeoMetadata } from '../lib/seoMetadata';

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

  const rows = posts.map(post => {
    const meta = computeSeoMetadata(post);
    const titleChanged = meta.seoTitleSuggestion !== post.title;
    const descChanged = meta.seoDescriptionSuggestion !== post.description;
    return {
      post_id: post.slug,
      url: `${SITE_URL}/blog/${post.slug}/`,
      old_title: post.title,
      new_title: meta.seoTitleSuggestion,
      old_description: post.description,
      new_description: meta.seoDescriptionSuggestion,
      primary_keyword: meta.primaryKeyword,
      search_intent: meta.searchIntent,
      reason: meta.titleConfidenceReason,
      confidence: titleChanged || descChanged ? meta.titleConfidence : '변경없음',
    };
  });

  fs.mkdirSync(AUDIT_DIR, { recursive: true });
  const columns = ['post_id', 'url', 'old_title', 'new_title', 'old_description', 'new_description', 'primary_keyword', 'search_intent', 'reason', 'confidence'];
  fs.writeFileSync(path.join(AUDIT_DIR, 'title-changes.csv'), toCsv(columns, rows), 'utf-8');

  const counts = { HIGH: 0, MEDIUM: 0, LOW: 0, 변경없음: 0 };
  for (const r of rows) counts[r.confidence as keyof typeof counts]++;
  console.log(`전체 ${rows.length}개 글 분석 완료`);
  console.log(`HIGH(자동 적용 대상): ${counts.HIGH}개`);
  console.log(`MEDIUM(추가 검토 필요): ${counts.MEDIUM}개`);
  console.log(`LOW(자동 변경 금지): ${counts.LOW}개`);
  console.log(`변경 없음(이미 적절함): ${counts.변경없음}개`);
  console.log('출력: seo-audit/title-changes.csv');
}

main();
