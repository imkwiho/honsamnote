// SEO 3단계 §3 — 클러스터 미지정(123개, "-general") 글을 개별 분석한다.
// A(기존 클러스터에 사실 맞음) / B(신규 클러스터 후보 — 반드시 여러 글이
// 같은 표현을 공유할 때만, 단일 글로는 절대 안 만듦) / C(독립적, 검색가치
// 낮음)로 분류한다.
import fs from 'fs';
import path from 'path';
import {
  type AuditPost,
  CLUSTER_TAXONOMY,
  GENERIC_PHRASES,
  classifyClusterDetailed,
  computeCommonTermsByCategory,
} from '../lib/seoAudit';
import { loadAllPosts, AUDIT_DIR, SITE_URL, ensureAuditDir, toCsv } from './lib/seoPhase3Shared';

// §3 지시서 원칙: 단일 글로는 절대 신규 클러스터 후보(B)를 만들지 않는다.
// "여러 개의 관련 글"의 최소선을 5개로 둔다(기존 CLUSTER_TAXONOMY 정의
// 클러스터들의 최소 규모(관계 관리 8개)보다는 낮게 잡아 후보 단계에서는
// 놓치지 않되, 2~3개 수준의 우연한 겹침은 걸러낸다).
const MIN_NEW_CLUSTER_GROUP_SIZE = 5;

function tokenize(term: string): string[] {
  return term.split(/\s+/).filter(Boolean);
}

function nonGenericTerms(post: AuditPost): string[] {
  return [...post.keywords, ...post.tags].filter(t => !GENERIC_PHRASES.has(t));
}

function main() {
  const posts = loadAllPosts();
  const unclustered = posts.filter(p => classifyClusterDetailed(p).clusterSlug.endsWith('-general'));
  const commonTermsByCategory = computeCommonTermsByCategory(posts);

  const byCategory = new Map<string, AuditPost[]>();
  for (const p of unclustered) {
    const cat = p.category ?? '(없음)';
    const list = byCategory.get(cat) ?? [];
    list.push(p);
    byCategory.set(cat, list);
  }

  type Row = Record<string, unknown>;
  const rows: Row[] = [];
  const classified = new Set<string>();

  // 1) B: 같은 카테고리 unclustered 글들이 공유하는 non-generic 표현이
  // MIN_NEW_CLUSTER_GROUP_SIZE개 이상의 서로 다른 글에 등장하면 신규
  // 클러스터 후보로 묶는다.
  for (const [cat, group] of byCategory) {
    const commonTerms = commonTermsByCategory.get(cat) ?? new Set<string>();
    const termToSlugs = new Map<string, Set<string>>();
    for (const post of group) {
      const terms = new Set(nonGenericTerms(post).filter(t => !commonTerms.has(t)));
      for (const term of terms) {
        if (!termToSlugs.has(term)) termToSlugs.set(term, new Set());
        termToSlugs.get(term)!.add(post.slug);
      }
    }
    // 겹치는 글 수가 가장 많은 표현부터 그리디하게 그룹을 만든다(한 글이
    // 여러 후보 그룹에 동시에 들어가지 않도록).
    const sortedTerms = [...termToSlugs.entries()].sort((a, b) => b[1].size - a[1].size);
    for (const [term, slugSet] of sortedTerms) {
      const remaining = [...slugSet].filter(s => !classified.has(s));
      if (remaining.length < MIN_NEW_CLUSTER_GROUP_SIZE) continue;
      for (const slug of remaining) classified.add(slug);
      const groupPosts = remaining.map(s => group.find(p => p.slug === s)!);
      for (const post of groupPosts) {
        rows.push({
          post_id: post.slug,
          title: post.title,
          url: `${SITE_URL}/blog/${post.slug}/`,
          category: post.categoryName ?? cat,
          classification: 'B',
          proposed_cluster_or_candidate: `신규 클러스터 후보: "${term}"`,
          reasoning: `같은 카테고리의 미분류 글 ${remaining.length}개가 공통으로 "${term}"을(를) keyword/tag로 가짐 — 우연한 겹침이 아니라 실제 반복되는 검색 주제일 가능성`,
          sibling_count: remaining.length,
          confidence: remaining.length >= 8 ? 'HIGH' : 'MEDIUM',
        });
      }
    }
  }

  // 2) 남은 글: 기존 47개 클러스터 matchTerms와 토큰 단위 느슨한 매치 시도.
  // "청소"처럼 한 카테고리 안에서 여러 클러스터 정의에 공통으로 등장하는
  // 토큰은 그 카테고리 안에서는 클러스터를 구분하는 신호가 못 된다(실측:
  // "청소"가 주방청소/청소도구시간절약 등 여러 클러스터 matchTerms에 함께
  // 등장 — 필터링 없이는 "매트리스 청소"가 엉뚱하게 "주방 청소"로 매치됨).
  // 카테고리별로 2개 이상의 클러스터 정의에 걸치는 토큰은 매치에서 제외한다.
  for (const [cat, group] of byCategory) {
    const defs = CLUSTER_TAXONOMY[cat] ?? [];
    const defTokenDocFreq = new Map<string, number>();
    for (const def of defs) {
      const seen = new Set(def.matchTerms.flatMap(tokenize));
      for (const t of seen) defTokenDocFreq.set(t, (defTokenDocFreq.get(t) ?? 0) + 1);
    }
    const ambiguousTokens = new Set([...defTokenDocFreq.entries()].filter(([, c]) => c >= 2).map(([t]) => t));

    for (const post of group) {
      if (classified.has(post.slug)) continue;
      const postTokens = new Set(nonGenericTerms(post).flatMap(tokenize).filter(t => !ambiguousTokens.has(t)));

      let best: { name: string; score: number } | undefined;
      for (const def of defs) {
        const defTokens = new Set(def.matchTerms.flatMap(tokenize).filter(t => !ambiguousTokens.has(t)));
        let overlap = 0;
        for (const t of postTokens) if (defTokens.has(t)) overlap++;
        if (overlap > 0 && (!best || overlap > best.score)) best = { name: def.name, score: overlap };
      }

      if (best) {
        rows.push({
          post_id: post.slug,
          title: post.title,
          url: `${SITE_URL}/blog/${post.slug}/`,
          category: post.categoryName ?? cat,
          classification: 'A',
          proposed_cluster_or_candidate: best.name,
          reasoning: `정확한 matchTerm 문자열은 없지만 "${best.name}" 클러스터 정의와 토큰 ${best.score}개 겹침 — 사람이 matchTerms 보강 여부 검토 필요`,
          sibling_count: '',
          confidence: 'MEDIUM',
        });
      } else {
        rows.push({
          post_id: post.slug,
          title: post.title,
          url: `${SITE_URL}/blog/${post.slug}/`,
          category: post.categoryName ?? cat,
          classification: 'C',
          proposed_cluster_or_candidate: '(해당 없음)',
          reasoning: '기존 클러스터와도, 다른 미분류 글과도 뚜렷한 공통 표현이 없음 — 독립 콘텐츠로 판단(검색 가치가 낮다는 뜻은 아니며, 단지 시리즈화할 근거가 약함)',
          sibling_count: '',
          confidence: 'LOW',
        });
      }
    }
  }

  ensureAuditDir();
  const columns = ['post_id', 'title', 'url', 'category', 'classification', 'proposed_cluster_or_candidate', 'reasoning', 'sibling_count', 'confidence'];
  rows.sort((a, b) => String(a.classification).localeCompare(String(b.classification)));
  fs.writeFileSync(path.join(AUDIT_DIR, 'unclustered-review.csv'), toCsv(columns, rows), 'utf-8');

  const counts = { A: 0, B: 0, C: 0 };
  for (const r of rows) counts[r.classification as 'A' | 'B' | 'C']++;
  console.log(`미분류 ${unclustered.length}개 분석 완료 — A(기존 클러스터 근접): ${counts.A}, B(신규 클러스터 후보): ${counts.B}, C(독립): ${counts.C}`);
  console.log('출력: seo-audit/unclustered-review.csv');
}

main();
