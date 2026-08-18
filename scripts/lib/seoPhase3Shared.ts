// SEO 3단계 전용 공유 헬퍼. 1~2단계 스크립트(seo-audit.ts 등)는 각자 파일에
// loadAllPosts/csvEscape/toCsv를 복붙해서 갖고 있었다(알려진 사소한 중복) —
// 3단계에서 신규 스크립트가 10개 넘게 늘어나므로 이번엔 한 곳으로 모은다.
// 기존 스크립트는 건드리지 않는다(불필요한 회귀 위험 방지).
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { type AuditPost } from '../../lib/seoAudit';

export const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');
export const AUDIT_DIR = path.join(process.cwd(), 'seo-audit');
export const SITE_URL = 'https://honsamnote.co.kr';

export function loadAllPosts(): AuditPost[] {
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

/** slug -> 원본 raw front matter 문자열(파일 실제 수정 시에만 필요). */
export function loadRaw(slug: string, ext: 'mdx' | 'md' = 'mdx'): string {
  return fs.readFileSync(path.join(BLOG_DIR, `${slug}.${ext}`), 'utf-8');
}

/** slug의 실제 파일 경로(확장자 mdx/md 둘 다 확인). */
export function resolvePostFilePath(slug: string): string {
  const mdx = path.join(BLOG_DIR, `${slug}.mdx`);
  if (fs.existsSync(mdx)) return mdx;
  const md = path.join(BLOG_DIR, `${slug}.md`);
  if (fs.existsSync(md)) return md;
  throw new Error(`게시글 파일을 찾을 수 없음: ${slug}`);
}

export function csvEscape(value: unknown): string {
  const s = value === undefined || value === null ? '' : String(value);
  if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export function toCsv(columns: string[], rows: Record<string, unknown>[]): string {
  const lines = [columns.join(',')];
  for (const row of rows) lines.push(columns.map(c => csvEscape(row[c])).join(','));
  return '﻿' + lines.join('\r\n') + '\r\n';
}

export function ensureAuditDir(): void {
  fs.mkdirSync(AUDIT_DIR, { recursive: true });
}
