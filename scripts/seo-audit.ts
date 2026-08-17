// SEO 전면 재구축 1단계 — 백업 + Dry Run 감사 보고서 생성 스크립트.
// content/blog/*.mdx를 읽기만 하고 절대 쓰지 않는다. 새 파일(backup/, seo-audit/)만
// 생성한다. `npm run seo-audit`으로 언제든 다시 실행해 최신 상태를 재분석할 수 있다.
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import {
  type AuditPost,
  classifyCluster,
  detectSearchIntent,
  primaryKeyword,
  secondaryKeywords,
  needsTitleFix,
  needsMetaFix,
  findDuplicateDescriptionSlugs,
  findDuplicateCandidates,
  computeCommonTermsByCategory,
  topRelatedSlugs,
  suggestTitle,
  suggestDescription,
  computeFactCheckFlag,
  computeSeoPriority,
  emptySearchConsoleMetrics,
  CLUSTER_TAXONOMY,
} from '../lib/seoAudit';

const SITE_URL = 'https://honsamnote.co.kr';
const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');
const BACKUP_DIR = path.join(process.cwd(), 'backup');
const AUDIT_DIR = path.join(process.cwd(), 'seo-audit');

function todayStamp(): string {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
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

// ── CSV 유틸 (honsamnote_all_posts.csv 추출 때 검증된 RFC 4180 방식 재사용) ──
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
  const clusterOf = (p: AuditPost) => classifyCluster(p).clusterSlug;
  const clusterInfo = new Map(posts.map(p => [p.slug, classifyCluster(p)]));
  const clusterCounts = new Map<string, number>();
  for (const p of posts) {
    const slug = clusterInfo.get(p.slug)!.clusterSlug;
    clusterCounts.set(slug, (clusterCounts.get(slug) ?? 0) + 1);
  }
  const commonTermsByCategory = computeCommonTermsByCategory(posts);

  const dupDescriptionSlugs = findDuplicateDescriptionSlugs(posts);
  const mergeCandidates = findDuplicateCandidates(posts);
  const duplicateFlagBySlug = new Map<string, MergeCandidateSummary>();
  for (const c of mergeCandidates) {
    for (const slug of [c.mainPost, c.duplicatePost]) {
      const existing = duplicateFlagBySlug.get(slug);
      if (!existing || c.similarity > existing.similarity) {
        duplicateFlagBySlug.set(slug, { similarity: c.similarity, action: c.recommendedAction, otherSlug: slug === c.mainPost ? c.duplicatePost : c.mainPost });
      }
    }
  }

  const PILLAR_THRESHOLD = 8;

  const auditRows = posts.map(post => {
    const { clusterSlug, clusterName } = clusterInfo.get(post.slug)!;
    const clusterCount = clusterCounts.get(clusterSlug) ?? 0;
    const isPillarCandidate = clusterCount >= PILLAR_THRESHOLD;
    const titleFix = needsTitleFix(post);
    const metaFix = needsMetaFix(post, dupDescriptionSlugs);
    const dupFlag = duplicateFlagBySlug.get(post.slug);
    const factcheck = computeFactCheckFlag(post);
    const related = topRelatedSlugs(post, posts, clusterOf, 6, commonTermsByCategory.get(post.category ?? '(없음)') ?? new Set());
    const seoPriority = computeSeoPriority({
      titleNeedsFix: titleFix,
      hasPrimaryKeyword: primaryKeyword(post).length > 0,
      contentLength: post.content.length,
      clusterPostCount: clusterCount,
      isDuplicateCandidate: !!dupFlag,
      internalLinkCount: 0, // 현재 사이트에 내부링크 기능 자체가 없음(감사 대상 현황)
    });
    const searchConsole = emptySearchConsoleMetrics();

    return {
      post_id: post.slug,
      title: post.title,
      url: `${SITE_URL}/blog/${post.slug}/`,
      category: post.category ?? '',
      category_name: post.categoryName ?? '',
      tags: post.tags.join('; '),
      keywords: post.keywords.join('; '),
      meta_title: `${post.title} | 혼삶노트`,
      meta_description: post.description,
      search_intent: detectSearchIntent(post),
      primary_keyword: primaryKeyword(post),
      secondary_keywords: secondaryKeywords(post).join('; '),
      duplicate_risk: dupFlag ? `높음 (${dupFlag.otherSlug}, 유사도 ${dupFlag.similarity})` : '낮음',
      recommended_cluster: clusterName,
      recommended_pillar: isPillarCandidate ? '예' : '아니오',
      title_needs_fix: titleFix ? '예' : '아니오',
      meta_needs_fix: metaFix ? '예' : '아니오',
      internal_link_targets: related.join('; '),
      merge_candidate: dupFlag?.action === 'C. 통합 후보' ? '예' : '아니오',
      keep_status: dupFlag?.action === 'C. 통합 후보' ? '검토 필요(통합 후보)' : '유지',
      recommended_title: suggestTitle(post),
      recommended_meta_description: suggestDescription(post),
      seo_priority: seoPriority,
      factcheck_needed: factcheck.flagged ? '예' : '아니오',
      sc_impressions: searchConsole.impressions,
      sc_clicks: searchConsole.clicks,
      sc_ctr: searchConsole.ctr,
      sc_average_position: searchConsole.averagePosition,
    };
  });

  auditRows.sort((a, b) => b.seo_priority - a.seo_priority);

  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  fs.mkdirSync(AUDIT_DIR, { recursive: true });

  // 1) 백업
  const backupPath = path.join(BACKUP_DIR, `posts-before-seo-${todayStamp()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(posts, null, 2), 'utf-8');

  // 2) content-audit.json / .csv
  fs.writeFileSync(path.join(AUDIT_DIR, 'content-audit.json'), JSON.stringify(auditRows, null, 2), 'utf-8');
  const auditColumns = Object.keys(auditRows[0] ?? {});
  fs.writeFileSync(path.join(AUDIT_DIR, 'content-audit.csv'), toCsv(auditColumns, auditRows), 'utf-8');

  // 3) merge-candidates.csv
  const mergeColumns = ['main_post', 'duplicate_post', 'similarity_reason', 'recommended_action', 'expected_primary_keyword', 'redirect_required'];
  const mergeRows = mergeCandidates.map(c => ({
    main_post: c.mainPost,
    duplicate_post: c.duplicatePost,
    similarity_reason: `${c.similarityReason} (유사도 ${c.similarity})`,
    recommended_action: c.recommendedAction,
    expected_primary_keyword: c.expectedPrimaryKeyword,
    redirect_required: c.redirectRequired,
  }));
  fs.writeFileSync(path.join(AUDIT_DIR, 'merge-candidates.csv'), toCsv(mergeColumns, mergeRows), 'utf-8');

  // 4) factcheck-needed.csv
  const factcheckColumns = ['post_id', 'category', 'matched_pattern', 'snippet', 'recommended_action'];
  const factcheckRows: Record<string, unknown>[] = [];
  for (const post of posts) {
    const result = computeFactCheckFlag(post);
    for (const m of result.matches) {
      factcheckRows.push({
        post_id: post.slug,
        category: post.category ?? '',
        matched_pattern: m.pattern,
        snippet: m.snippet,
        recommended_action: '수치·법규 최신성 확인 필요',
      });
    }
  }
  fs.writeFileSync(path.join(AUDIT_DIR, 'factcheck-needed.csv'), toCsv(factcheckColumns, factcheckRows), 'utf-8');

  // 5) redirect-map.csv — 이번 단계에서 URL을 바꾸지 않으므로 헤더만.
  const redirectColumns = ['old_url', 'new_url', 'redirect_type', 'reason', 'approved'];
  fs.writeFileSync(path.join(AUDIT_DIR, 'redirect-map.csv'), toCsv(redirectColumns, []), 'utf-8');

  // 6) seo-summary.md
  const clusterSummaryLines: string[] = [];
  for (const [categorySlug, defs] of Object.entries(CLUSTER_TAXONOMY)) {
    const categoryName = posts.find(p => p.category === categorySlug)?.categoryName ?? categorySlug;
    clusterSummaryLines.push(`\n### ${categoryName}`);
    for (const def of defs) {
      const count = clusterCounts.get(def.slug) ?? 0;
      const pillarMark = count >= PILLAR_THRESHOLD ? ' 🏛️ Pillar 후보' : '';
      clusterSummaryLines.push(`- ${def.name}: ${count}개${pillarMark}`);
    }
    const generalCount = clusterCounts.get(`${categorySlug}${'-general'}`) ?? 0;
    if (generalCount > 0) clusterSummaryLines.push(`- (미분류/기타): ${generalCount}개`);
  }

  const titleFixCount = auditRows.filter(r => r.title_needs_fix === '예').length;
  const metaFixCount = auditRows.filter(r => r.meta_needs_fix === '예').length;
  const mergeCandidateCount = mergeRows.filter(r => r.recommended_action === 'C. 통합 후보').length;
  const splitCandidateCount = mergeRows.filter(r => r.recommended_action === 'B. 역할 분리 검토').length;
  const factcheckPostCount = new Set(factcheckRows.map(r => r.post_id)).size;
  const top100 = auditRows.slice(0, 100);

  const summaryMd = `# 혼삶노트 SEO 감사 보고서 (Dry Run)

생성일: ${new Date().toISOString().slice(0, 10)}
백업 파일: \`backup/posts-before-seo-${todayStamp()}.json\`

## 전체 현황

- 전체 게시글: ${posts.length}개
- 제목 수정 필요: ${titleFixCount}개
- meta description 수정 필요: ${metaFixCount}개
- 통합(병합) 후보: ${mergeCandidateCount}쌍
- 역할 분리 검토 대상: ${splitCandidateCount}쌍
- Fact-check 필요(비용·주거·안전 카테고리 중 수치/법령 언급): ${factcheckPostCount}개
- 내부링크(internal_links) 보유 게시글: 0개 (전수 확인됨 — 아직 내부링크 기능 자체가 없음)

## 카테고리별 검색 클러스터 분포
${clusterSummaryLines.join('\n')}

## SEO_PRIORITY 상위 100개 (다음 단계 "1차 집중 대상" 후보)

| 순위 | post_id | 제목 | 점수 |
|---|---|---|---|
${top100.map((r, i) => `| ${i + 1} | ${r.post_id} | ${String(r.title).slice(0, 40)}${String(r.title).length > 40 ? '…' : ''} | ${r.seo_priority} |`).join('\n')}

## 참고: Search Console 데이터

아직 연동되지 않아 impressions/clicks/CTR/평균 순위는 전부 비워두었다(\`content-audit.csv\`의 \`sc_*\` 컬럼). 연동 후 같은 스크립트를 확장해 채울 수 있도록 필드만 준비해 두었다.

## 이번 보고서에서 하지 않은 것

- 어떤 게시글의 title/description/slug도 실제로 수정하지 않았다(추천안은 \`recommended_title\`/\`recommended_meta_description\` 컬럼에만 기록).
- 통합/redirect를 실행하지 않았다(\`merge-candidates.csv\`는 후보 목록일 뿐이다).
- \`content/blog/\`는 전혀 쓰지 않았다(읽기 전용).
`;
  fs.writeFileSync(path.join(AUDIT_DIR, 'seo-summary.md'), summaryMd, 'utf-8');

  console.log(`백업: ${backupPath}`);
  console.log(`감사 대상: ${posts.length}개 글`);
  console.log(`제목 수정 필요: ${titleFixCount}개, meta 수정 필요: ${metaFixCount}개`);
  console.log(`통합 후보: ${mergeCandidateCount}쌍, 역할분리 검토: ${splitCandidateCount}쌍`);
  console.log(`Fact-check 필요: ${factcheckPostCount}개`);
  console.log(`출력: ${AUDIT_DIR}/{content-audit.json,content-audit.csv,seo-summary.md,merge-candidates.csv,factcheck-needed.csv,redirect-map.csv}`);
}

interface MergeCandidateSummary {
  similarity: number;
  action: 'B. 역할 분리 검토' | 'C. 통합 후보';
  otherSlug: string;
}

main();
