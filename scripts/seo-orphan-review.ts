// SEO 3단계 §2 — orphan(들어오는 내부링크 0) 페이지를 기계적으로 링크만
// 채우는 게 아니라, 왜 orphan인지 유형별로 분석한다. "orphan 수를 0으로
// 만드는 것이 목표가 아니다" — 이 스크립트는 후보 제시(incoming_link_candidates)
// 까지만 하고 실제로 링크를 추가하지 않는다.
import fs from 'fs';
import path from 'path';
import {
  type AuditPost,
  classifyClusterDetailed,
  findDuplicateCandidates,
  primaryKeyword,
  detectSearchIntent,
  topRelatedSlugs,
  computeCommonTermsByCategory,
} from '../lib/seoAudit';
import { buildLinkGraph, findOrphanPages } from '../lib/linkGraph';
import { loadAllPosts, AUDIT_DIR, SITE_URL, ensureAuditDir, toCsv } from './lib/seoPhase3Shared';

// 본문 길이 분포 실측(2026-08-17 기준: min 768, p10 4440, median 5414자) —
// 사이트 전체가 AI로 생성되어 길이가 대체로 일정하다. 실제로 짧은 글은
// 극소수(3000자 미만 1개뿐)라서, 이 임계값 미만인 경우만 "저가치 후보"로
// 본다(억지로 다수를 저가치로 몰지 않기 위함).
const THIN_CONTENT_THRESHOLD = 3000;

type OrphanType = 'A' | 'B' | 'C' | 'D' | 'E';

function main() {
  const posts = loadAllPosts();
  const postBySlug = new Map(posts.map(p => [p.slug, p]));
  const graph = buildLinkGraph(posts);
  const orphans = findOrphanPages(posts, graph);

  const dupCandidates = findDuplicateCandidates(posts);
  const duplicateInvolvedSlugs = new Set<string>();
  for (const c of dupCandidates) {
    duplicateInvolvedSlugs.add(c.mainPost);
    duplicateInvolvedSlugs.add(c.duplicatePost);
  }

  const commonTermsByCategory = computeCommonTermsByCategory(posts);
  const clusterOf = (p: AuditPost) => classifyClusterDetailed(p).clusterSlug;

  const rows = orphans.map(post => {
    const { clusterSlug, clusterName, matchScore } = classifyClusterDetailed(post);
    const isUnclustered = clusterSlug.endsWith('-general');
    const isDuplicateInvolved = duplicateInvolvedSlugs.has(post.slug);
    const isThin = post.content.length < THIN_CONTENT_THRESHOLD;
    const pk = primaryKeyword(post);

    let type: OrphanType;
    let reason: string;
    if (isDuplicateInvolved) {
      type = 'D';
      reason = '이미 유사한 다른 글이 있음(통합/역할분리 후보) — 이 글에 개별 링크를 만들기보다 그 검토 결과를 따라야 함';
    } else if (isUnclustered) {
      type = 'B';
      reason = '세부 클러스터에 매치되는 keyword/tag가 없어 미분류 상태 — §3 unclustered-review 결과를 먼저 확인';
    } else if (isThin) {
      type = 'E';
      reason = `본문 길이가 짧음(${post.content.length}자, 사이트 평균 대비 낮음) — 삭제가 아니라 내용 보강 검토 대상`;
    } else if (matchScore >= 2) {
      type = 'A';
      reason = `클러스터(${clusterName})와의 주제 적합도가 높음(matchScore ${matchScore}) — 단순히 아직 연결이 안 됐을 뿐, 양질 콘텐츠로 판단`;
    } else {
      type = 'C';
      reason = `클러스터(${clusterName})에는 속하지만 대표성이 약함(matchScore ${matchScore}) — 의도적으로 독립적인 글로 취급 가능`;
    }

    const candidates = topRelatedSlugs(post, posts, clusterOf, 3, commonTermsByCategory.get(post.category ?? '') ?? new Set());
    const candidateTitles = candidates.map(slug => postBySlug.get(slug)?.title ?? slug);

    return {
      post_id: post.slug,
      title: post.title,
      url: `${SITE_URL}/blog/${post.slug}/`,
      current_category: post.categoryName ?? post.category ?? '',
      proposed_cluster: isUnclustered ? '(미분류)' : clusterName,
      orphan_reason: reason,
      content_value: type === 'A' ? '높음' : type === 'E' ? '낮음(보강 필요)' : '보통',
      search_intent: detectSearchIntent(post),
      recommended_action:
        type === 'A' ? '관련 글에서 링크 추가 검토' :
        type === 'B' ? 'unclustered-review 결과에 따라 클러스터 배정 후 재검토' :
        type === 'C' ? '독립 콘텐츠로 유지 — 무리하게 링크 만들지 않음' :
        type === 'D' ? '통합/역할분리 검토 결과에 따름' :
        '콘텐츠 보강 후 재검토',
      incoming_link_candidates: candidates.length > 0 ? candidates.map((s, i) => `${s}(${candidateTitles[i]})`).join('; ') : '(관련성 있는 후보 없음)',
      confidence: pk ? 'MEDIUM' : 'LOW',
      orphan_type: type,
    };
  });

  ensureAuditDir();
  const columns = [
    'post_id', 'title', 'url', 'current_category', 'proposed_cluster', 'orphan_reason',
    'content_value', 'search_intent', 'recommended_action', 'incoming_link_candidates', 'confidence', 'orphan_type',
  ];
  fs.writeFileSync(path.join(AUDIT_DIR, 'orphan-review.csv'), toCsv(columns, rows), 'utf-8');

  const counts: Record<OrphanType, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
  for (const r of rows) counts[r.orphan_type as OrphanType]++;
  console.log(`orphan ${orphans.length}개 분석 완료 — A(양질/링크만 없음): ${counts.A}, B(미분류): ${counts.B}, C(의도적 독립): ${counts.C}, D(중복 후보): ${counts.D}, E(저가치): ${counts.E}`);
  console.log('출력: seo-audit/orphan-review.csv (orphan 0을 목표로 삼지 않음 — 후보 제시만)');
}

main();
