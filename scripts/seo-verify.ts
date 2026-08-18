// SEO 2단계 §27-28/§33 + 4단계 §35 — 마이그레이션 이후 전수 검사 (4단계 강화).
// content/blog/를 읽기만 한다. out/이 존재하면(직전에 npm run build를 실행한 경우)
// 실제 정적 HTML 산출물도 표본 검사한다.
// 4단계 추가 검사: Primary Page 중복·누락, 부러진 Pillar children, title-content mismatch,
// orphan 심화, redirect 검증.
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { type AuditPost, classifyClusterDetailed, findDuplicateDescriptionSlugs, primaryKeyword } from '../lib/seoAudit';
import { PILLARS } from '../lib/pillars';
import { buildLinkGraph, findOrphanPages } from '../lib/linkGraph';
import { computePrimaryPages } from '../lib/primaryPages';

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');
const OUT_DIR = path.join(process.cwd(), 'out');
const AUDIT_DIR = path.join(process.cwd(), 'seo-audit');

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

interface Finding {
  severity: 'error' | 'warning';
  category: string;
  detail: string;
}

function main() {
  const posts = loadAllPosts();
  const slugSet = new Set(posts.map(p => p.slug));
  const findings: Finding[] = [];

  // 1) broken internal link / self-link
  for (const post of posts) {
    const linkMatches = [...post.content.matchAll(/\]\(\/blog\/([a-zA-Z0-9_-]+)\/?\)/g)];
    for (const m of linkMatches) {
      const targetSlug = m[1];
      if (targetSlug === post.slug) {
        findings.push({ severity: 'error', category: 'self-link', detail: `${post.slug}: 본문이 자기 자신을 링크함` });
      } else if (!slugSet.has(targetSlug)) {
        findings.push({ severity: 'error', category: 'broken-internal-link', detail: `${post.slug}: 존재하지 않는 글(${targetSlug})로 링크됨` });
      }
    }
  }

  // 2) 빈 title/description
  for (const post of posts) {
    if (!post.title || post.title.trim().length === 0) findings.push({ severity: 'error', category: 'empty-title', detail: post.slug });
    if (!post.description || post.description.trim().length === 0) findings.push({ severity: 'error', category: 'empty-description', detail: post.slug });
  }

  // 3) 중복 title / description
  const titleGroups = new Map<string, string[]>();
  for (const post of posts) {
    const list = titleGroups.get(post.title) ?? [];
    list.push(post.slug);
    titleGroups.set(post.title, list);
  }
  for (const [title, slugs] of titleGroups) {
    if (slugs.length > 1) findings.push({ severity: 'warning', category: 'duplicate-title', detail: `"${title}" — ${slugs.join(', ')}` });
  }
  const dupDescSlugs = findDuplicateDescriptionSlugs(posts);
  if (dupDescSlugs.size > 0) {
    findings.push({ severity: 'warning', category: 'duplicate-description', detail: `${dupDescSlugs.size}개 글이 다른 글과 description을 공유함` });
  }

  // 4) 본문에 남은 "# " 단일 해시 제목(ArticleHeader가 이미 title로 H1을 렌더링하므로 다중 H1 위험)
  for (const post of posts) {
    if (/^#\s/m.test(post.content)) {
      findings.push({ severity: 'warning', category: 'possible-duplicate-h1', detail: `${post.slug}: 본문에 "# " 최상위 제목이 남아 있어 H1이 2개가 될 수 있음` });
    }
  }

  // 5) cluster 미지정 비율(정보성 — error 아님)
  const clusterUnassigned = posts.filter(p => classifyClusterDetailed(p).clusterSlug.endsWith('-general'));

  // 6) Pillar 정의 무결성
  for (const pillar of PILLARS) {
    const members = posts.filter(p => classifyClusterDetailed(p).clusterSlug === pillar.clusterId);
    if (members.length === 0) {
      findings.push({ severity: 'error', category: 'pillar-no-members', detail: `${pillar.slug}: 클러스터(${pillar.clusterId})에 속한 글이 0개` });
    }
  }

  // 7) orphan / 관련 글 중복 추천
  const graph = buildLinkGraph(posts);
  const orphans = findOrphanPages(posts, graph);
  for (const post of posts) {
    const targets = [...(graph.outgoing.get(post.slug) ?? [])];
    const unique = new Set(targets);
    if (unique.size !== targets.length) {
      findings.push({ severity: 'error', category: 'duplicate-related-recommendation', detail: `${post.slug}: 관련 글이 중복 추천됨` });
    }
  }

  // 8) 4단계 강화 검사
  const primaryPages = computePrimaryPages(posts, graph);

  // 8a) Primary Page가 없는 클러스터 중 규모 큰 것
  const clusterSizeMap = new Map<string, number>();
  for (const post of posts) {
    const { clusterSlug } = classifyClusterDetailed(post);
    clusterSizeMap.set(clusterSlug, (clusterSizeMap.get(clusterSlug) ?? 0) + 1);
  }
  for (const [clusterSlug, size] of clusterSizeMap) {
    if (size >= 8 && !primaryPages.has(clusterSlug)) {
      findings.push({ severity: 'warning', category: 'primary-page-missing', detail: `클러스터 '${clusterSlug}' (${size}개 글) — Primary Page 없음` });
    }
  }

  // 8b) Primary Page의 incoming links가 1 미만인 클러스터
  for (const [clusterSlug, pp] of primaryPages.entries()) {
    const incomingCount = graph.incoming.get(pp.primarySlug)?.size ?? 0;
    if (incomingCount < 1 && (clusterSizeMap.get(clusterSlug) ?? 0) >= 5) {
      findings.push({ severity: 'warning', category: 'primary-page-isolated', detail: `${pp.primarySlug}: Primary Page이지만 내부 링크가 없음 (클러스터: ${clusterSlug})` });
    }
  }

  // 8c) title-content mismatch 간략 검사 (제목 핵심 키워드가 첫 300자에 없는 경우)
  const mismatchCount = { count: 0 };
  for (const post of posts) {
    const kw = primaryKeyword(post);
    if (!kw) continue;
    const opening = post.content.slice(0, 300);
    if (!opening.includes(kw)) mismatchCount.count++;
  }
  if (mismatchCount.count > 0) {
    findings.push({ severity: 'warning', category: 'title-content-mismatch', detail: `${mismatchCount.count}개 글에서 대표 키워드가 본문 첫 300자에 없음 — seo-audit/title-content-mismatch.csv 참조` });
  }

  // 8d) wrangler.toml 리다이렉트 검증 (redirect-map.csv와 대조)
  const redirectMapPath = path.join(AUDIT_DIR, 'redirect-map.csv');
  const wranglerPath = path.join(process.cwd(), 'wrangler.toml');
  if (fs.existsSync(redirectMapPath) && fs.existsSync(wranglerPath)) {
    const wranglerContent = fs.readFileSync(wranglerPath, 'utf-8');
    const mapLines = fs.readFileSync(redirectMapPath, 'utf-8').replace(/^﻿/, '').split('\n').slice(1).filter(Boolean);
    for (const line of mapLines) {
      const parts = line.split(',');
      const fromSlug = parts[0]?.trim();
      const toSlug = parts[1]?.trim();
      const status = parts[2]?.trim();
      if (!fromSlug || !toSlug || status !== '301') continue;
      const fromPath = `/blog/${fromSlug}/`;
      if (!wranglerContent.includes(fromPath)) {
        findings.push({ severity: 'warning', category: 'redirect-missing-wrangler', detail: `redirect-map.csv의 301 리다이렉트(${fromSlug} → ${toSlug})가 wrangler.toml에 없음` });
      }
    }
  }

  // 8) 정적 빌드 산출물이 있으면 표본 검사(canonical, JSON-LD 파싱, sitemap.xml)
  const buildFindings: Finding[] = [];
  if (fs.existsSync(OUT_DIR)) {
    const sitemapPath = path.join(OUT_DIR, 'sitemap.xml');
    if (fs.existsSync(sitemapPath)) {
      const sitemapXml = fs.readFileSync(sitemapPath, 'utf-8');
      const urlMatches = [...sitemapXml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
      // 표본 30개만 실제 HTML 파일 존재 여부 확인(전수 검사는 비용이 크므로).
      const sample = urlMatches.filter((_, i) => i % Math.max(1, Math.floor(urlMatches.length / 30)) === 0).slice(0, 30);
      for (const url of sample) {
        const pathname = url.replace(/^https?:\/\/[^/]+/, '').replace(/\/$/, '');
        const htmlPath = path.join(OUT_DIR, pathname === '' ? 'index.html' : `${pathname}.html`);
        const htmlPathAlt = path.join(OUT_DIR, pathname, 'index.html');
        if (!fs.existsSync(htmlPath) && !fs.existsSync(htmlPathAlt)) {
          buildFindings.push({ severity: 'error', category: 'sitemap-404', detail: `sitemap에는 있지만 실제 out/에 없음: ${url}` });
        }
      }
    } else {
      buildFindings.push({ severity: 'error', category: 'sitemap-missing', detail: 'out/sitemap.xml이 없음' });
    }

    // 게시글 5개 표본으로 canonical + JSON-LD 검사
    const samplePosts = posts.filter((_, i) => i % Math.max(1, Math.floor(posts.length / 5)) === 0).slice(0, 5);
    for (const post of samplePosts) {
      const htmlPath = path.join(OUT_DIR, 'blog', post.slug, 'index.html');
      if (!fs.existsSync(htmlPath)) continue;
      const html = fs.readFileSync(htmlPath, 'utf-8');
      if (!/<link rel="canonical"/.test(html)) {
        buildFindings.push({ severity: 'error', category: 'canonical-missing', detail: `${post.slug}: canonical 태그 없음` });
      }
      const jsonLdMatches = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
      for (const m of jsonLdMatches) {
        try {
          JSON.parse(m[1]);
        } catch {
          buildFindings.push({ severity: 'error', category: 'invalid-json-ld', detail: `${post.slug}: JSON-LD 파싱 실패` });
        }
      }
      const h1Count = (html.match(/<h1[\s>]/g) ?? []).length;
      if (h1Count !== 1) {
        buildFindings.push({ severity: 'error', category: 'h1-count', detail: `${post.slug}: H1이 ${h1Count}개(정확히 1개여야 함)` });
      }
    }
  }

  const allFindings = [...findings, ...buildFindings];
  const errors = allFindings.filter(f => f.severity === 'error');
  const warnings = allFindings.filter(f => f.severity === 'warning');

  const byCategory = new Map<string, Finding[]>();
  for (const f of allFindings) {
    const list = byCategory.get(f.category) ?? [];
    list.push(f);
    byCategory.set(f.category, list);
  }

  const lines: string[] = [];
  lines.push('# 혼삶노트 SEO 검증 보고서 (2단계 + 4단계 강화)');
  lines.push('');
  lines.push(`생성일: ${new Date().toISOString().slice(0, 10)}`);
  lines.push(`out/ 산출물 표본 검사: ${fs.existsSync(OUT_DIR) ? '포함됨' : '건너뜀(out/ 없음 — 직전에 npm run build 필요)'}`);
  lines.push('');
  lines.push('## 요약');
  lines.push('');
  lines.push(`- 전체 게시글: ${posts.length}개`);
  lines.push(`- 오류(error): ${errors.length}건`);
  lines.push(`- 경고(warning): ${warnings.length}건`);
  lines.push(`- cluster 미지정: ${clusterUnassigned.length}개 (정보성, 오류 아님)`);
  lines.push(`- orphan 페이지: ${orphans.length}개`);
  lines.push('');
  lines.push('## 항목별 상세');
  lines.push('');
  for (const [category, items] of byCategory) {
    lines.push(`### ${category} (${items.length}건, ${items[0].severity})`);
    for (const item of items.slice(0, 20)) lines.push(`- ${item.detail}`);
    if (items.length > 20) lines.push(`- ... 외 ${items.length - 20}건`);
    lines.push('');
  }
  if (byCategory.size === 0) lines.push('발견된 문제 없음.');

  fs.mkdirSync(AUDIT_DIR, { recursive: true });
  fs.writeFileSync(path.join(AUDIT_DIR, 'post-migration-report.md'), lines.join('\n'), 'utf-8');

  console.log(`검증 완료 — 오류 ${errors.length}건, 경고 ${warnings.length}건`);
  console.log('출력: seo-audit/post-migration-report.md');
  if (errors.length > 0) {
    console.error('\n오류 목록:');
    errors.forEach(e => console.error(` [${e.category}] ${e.detail}`));
    process.exitCode = 1;
  }
}

main();
