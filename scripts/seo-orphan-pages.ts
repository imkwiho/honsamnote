// SEO 2단계 §10 — Orphan(들어오는 내부링크가 없는) 페이지 탐지.
// lib/linkGraph.ts가 ArticleFooter/Pillar 페이지가 실제로 렌더링하는 것과
// 동일한 로직으로 그래프를 만든다. content/blog/는 읽기만 한다.
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { type AuditPost } from '../lib/seoAudit';
import { buildLinkGraph, findOrphanPages } from '../lib/linkGraph';

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
  const graph = buildLinkGraph(posts);
  const orphans = findOrphanPages(posts, graph);

  const rows = orphans.map(p => ({
    post_id: p.slug,
    title: p.title,
    url: `${SITE_URL}/blog/${p.slug}/`,
    category: p.category ?? '',
    category_name: p.categoryName ?? '',
    outgoing_link_count: graph.outgoing.get(p.slug)?.size ?? 0,
  }));

  fs.mkdirSync(AUDIT_DIR, { recursive: true });
  const columns = ['post_id', 'title', 'url', 'category', 'category_name', 'outgoing_link_count'];
  fs.writeFileSync(path.join(AUDIT_DIR, 'orphan-pages.csv'), toCsv(columns, rows), 'utf-8');

  const withIncoming = posts.length - orphans.length;
  console.log(`전체 ${posts.length}개 글 중 orphan(들어오는 내부링크 없음): ${orphans.length}개, 링크 보유: ${withIncoming}개`);
  console.log('출력: seo-audit/orphan-pages.csv');
}

main();
