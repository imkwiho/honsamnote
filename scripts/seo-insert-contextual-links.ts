// SEO 2단계 §9 — 본문 문맥 내부링크 실제 적용. A등급 Pillar 클러스터(3개:
// oneroom-storage/laundry-clothing/loneliness-isolation, 총 약 98개 글)에
// 속한 글에만 적용한다. 전체 565개에 기계적으로 적용하지 않는다.
//
// 안전장치:
// - front matter는 절대 건드리지 않는다(raw 문자열에서 본문 위치만 찾아
//   교체 — 1단계에서 검증된 방식).
// - 이미 삽입된 글은 건너뛴다(hasContextualLinkAlready) — 재실행해도
//   중복 삽입되지 않는다.
// - 적절한 삽입 지점이나 관련 글을 못 찾으면 억지로 채우지 않고 건너뛴다.
// - 실행 전 반드시 백업이 있어야 한다(node -e 스니펫으로 이미 생성함:
//   backup/posts-before-seo-phase2-content-changes-YYYYMMDD.json).
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { type AuditPost, classifyClusterDetailed, computeCommonTermsByCategory, primaryKeyword } from '../lib/seoAudit';
import { getRelatedContent } from '../lib/relatedPosts';
import { getPillarForCluster } from '../lib/pillars';
import { buildContextualSentence, insertBeforeLastHeading, hasContextualLinkAlready } from '../lib/contextualLinks';

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');
const AUDIT_DIR = path.join(process.cwd(), 'seo-audit');
const ANCHOR_MAX_LENGTH = 30;

interface LoadedPost extends AuditPost {
  raw: string;
  filePath: string;
}

function loadAllPosts(): LoadedPost[] {
  const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.mdx') || f.endsWith('.md'));
  return files.map(file => {
    const slug = file.replace(/\.(mdx|md)$/, '');
    const filePath = path.join(BLOG_DIR, file);
    const raw = fs.readFileSync(filePath, 'utf-8');
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
      raw,
      filePath,
    };
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

// 문장 안에 자연스럽게 녹아드는 짧은 명사구가 필요하다. seoTitleSuggestion은
// "키워드 방법｜보조설명" 형태의 *제목용* 문자열이라 "｜" 그대로 문장에 넣으면
// 부자연스럽다(실제로 확인된 사례: "...겪는 [1인 가구 옷 정리 해결 방법｜원룸
// 옷 보관]도 살펴보세요."). 그래서 대표 키워드(primaryKeyword)를 우선 쓰고,
// 그것도 없을 때만 원제목 일부로 대체한다.
function pickAnchorText(target: AuditPost): string {
  const kw = primaryKeyword(target);
  if (kw && kw.length <= ANCHOR_MAX_LENGTH) return kw;
  if (kw) return kw.slice(0, ANCHOR_MAX_LENGTH);
  return target.title.slice(0, ANCHOR_MAX_LENGTH);
}

function main() {
  const posts = loadAllPosts();
  const commonTermsByCategory = computeCommonTermsByCategory(posts);

  // A등급 Pillar 클러스터에 속한 글만 대상으로 삼는다.
  const targetPosts = posts.filter(p => {
    const { clusterSlug } = classifyClusterDetailed(p);
    return getPillarForCluster(clusterSlug) !== undefined;
  });
  // 재실행해도 같은 순서로 template이 순환하도록 slug로 정렬(재현 가능성).
  targetPosts.sort((a, b) => a.slug.localeCompare(b.slug));

  const results: { post_id: string; applied: string; target_slug: string; anchor_text: string; reason: string }[] = [];
  let appliedCount = 0;
  let alreadyDoneCount = 0;

  targetPosts.forEach((post, i) => {
    if (hasContextualLinkAlready(post.content)) {
      alreadyDoneCount++;
      results.push({ post_id: post.slug, applied: '이미 적용됨', target_slug: '', anchor_text: '', reason: '재실행 — 이전에 이미 삽입됨' });
      return;
    }

    const commonTerms = commonTermsByCategory.get(post.category ?? '') ?? new Set<string>();
    const related = getRelatedContent(post, posts, commonTerms);
    const target = related.sideways[0];
    if (!target) {
      results.push({ post_id: post.slug, applied: '아니오', target_slug: '', anchor_text: '', reason: '관련도 높은 같은 클러스터 글을 찾지 못함' });
      return;
    }
    const targetPost = posts.find(p => p.slug === target.slug)!;
    const anchorText = pickAnchorText(targetPost);
    const sentence = buildContextualSentence(anchorText, target.slug, i);
    const insertion = insertBeforeLastHeading(post.content, sentence);

    if (!insertion.inserted) {
      results.push({ post_id: post.slug, applied: '아니오', target_slug: target.slug, anchor_text: anchorText, reason: insertion.reason ?? '삽입 지점 없음' });
      return;
    }

    // front matter는 절대 건드리지 않고 본문만 raw 문자열에서 교체(1단계 방식 재사용).
    const bodyStart = post.raw.indexOf(post.content);
    if (bodyStart === -1) {
      results.push({ post_id: post.slug, applied: '아니오', target_slug: target.slug, anchor_text: anchorText, reason: '본문 위치를 찾지 못해 안전하게 건너뜀' });
      return;
    }
    const newRaw = post.raw.slice(0, bodyStart) + insertion.content;
    fs.writeFileSync(post.filePath, newRaw, 'utf-8');
    appliedCount++;
    results.push({ post_id: post.slug, applied: '예', target_slug: target.slug, anchor_text: anchorText, reason: '' });
  });

  fs.mkdirSync(AUDIT_DIR, { recursive: true });
  const columns = ['post_id', 'applied', 'target_slug', 'anchor_text', 'reason'];
  fs.writeFileSync(path.join(AUDIT_DIR, 'contextual-links-report.csv'), toCsv(columns, results), 'utf-8');

  console.log(`대상 글(A등급 Pillar 클러스터): ${targetPosts.length}개`);
  console.log(`새로 적용: ${appliedCount}개, 이미 적용됨(재실행): ${alreadyDoneCount}개, 건너뜀: ${targetPosts.length - appliedCount - alreadyDoneCount}개`);
  console.log(`출력: seo-audit/contextual-links-report.csv`);
}

main();
