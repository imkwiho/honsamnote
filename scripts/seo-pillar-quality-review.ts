// SEO 3단계 §5-6 — 2단계에서 B등급(보강 필요)으로 남았던 Pillar 후보
// 클러스터를 Pillar Quality Score로 재평가한다. 점수만 보고 기계적으로
// 상위 N개를 뽑지 않는다 — 실질적 가치(허브로서 답할 수 있는 5가지 질문:
// 뭘 먼저 알아야 하는지/뭘 먼저 해결해야 하는지/상황별로 어느 글을 봐야
// 하는지/초보가 흔히 하는 실수/다음에 뭘 봐야 하는지)가 있는지 최종적으로
// 사람이 직접 검토해 채택 여부를 정한다. 이 스크립트는 그 검토를 위한
// 정량 근거만 산출한다.
import fs from 'fs';
import path from 'path';
import { type AuditPost, CLUSTER_TAXONOMY, classifyClusterDetailed, detectSearchIntent, GENERIC_PHRASES } from '../lib/seoAudit';
import { getPillarForCluster } from '../lib/pillars';
import { buildLinkGraph } from '../lib/linkGraph';
import { loadAllPosts, AUDIT_DIR, ensureAuditDir, toCsv } from './lib/seoPhase3Shared';

const PILLAR_CANDIDATE_THRESHOLD = 8; // 2단계(pillar-plan.ts)와 동일
const GENERIC_CATCHALL_CLUSTERS = new Set(['general-living-cost']);
const A_MIN_COUNT = 15;
const A_MIN_AVG_SCORE = 1.3;
const C_MAX_AVG_SCORE = 1.2;

function main() {
  const posts = loadAllPosts();
  const graph = buildLinkGraph(posts);

  const membersByCluster = new Map<string, AuditPost[]>();
  const matchScoreBySlug = new Map<string, number>();
  for (const post of posts) {
    const { clusterSlug, matchScore } = classifyClusterDetailed(post);
    matchScoreBySlug.set(post.slug, matchScore);
    if (clusterSlug.endsWith('-general')) continue;
    const list = membersByCluster.get(clusterSlug) ?? [];
    list.push(post);
    membersByCluster.set(clusterSlug, list);
  }

  const allDefs = Object.values(CLUSTER_TAXONOMY).flat();
  const rows: Record<string, unknown>[] = [];

  for (const def of allDefs) {
    const members = membersByCluster.get(def.slug) ?? [];
    const count = members.length;
    if (count < PILLAR_CANDIDATE_THRESHOLD) continue; // Pillar 후보 자격 자체가 없음
    if (getPillarForCluster(def.slug)) continue; // 이미 A등급으로 3단계 이전에 구현됨

    const scores = members.map(m => matchScoreBySlug.get(m.slug) ?? 0);
    const avgScore = scores.reduce((a, b) => a + b, 0) / count;
    const isCatchAll = GENERIC_CATCHALL_CLUSTERS.has(def.slug);
    const isAGrade = !isCatchAll && count >= A_MIN_COUNT && avgScore >= A_MIN_AVG_SCORE;
    const isCGrade = isCatchAll || avgScore < C_MAX_AVG_SCORE;
    if (isAGrade || isCGrade) continue; // A는 이미 구현됨(위에서 스킵), C는 애초에 부적합 — 여긴 B등급만.

    const intents = members.map(detectSearchIntent);
    const intentCounts = new Map<string, number>();
    for (const i of intents) intentCounts.set(i, (intentCounts.get(i) ?? 0) + 1);
    const dominantCount = Math.max(...intentCounts.values());
    const intentConsistency = dominantCount / count; // 0~1

    const distinctKeywords = new Set<string>();
    for (const m of members) for (const k of [...m.keywords, ...m.tags]) if (!GENERIC_PHRASES.has(k)) distinctKeywords.add(k);
    // keyword clarity: 글당 고유 keyword 비율이 낮을수록(핵심 어휘가 반복될수록) 주제가 명확함.
    const keywordClarity = Math.max(0, 1 - Math.min(1, distinctKeywords.size / (count * 2.2)));

    const linkCounts = members.map(m => (graph.outgoing.get(m.slug)?.size ?? 0) + (graph.incoming.get(m.slug)?.size ?? 0));
    const avgLinks = linkCounts.reduce((a, b) => a + b, 0) / count;
    // link expansion potential: 지금 내부링크 밀도가 낮을수록(=Pillar 페이지로
    // 아직 연결을 못 받은 상태일수록) Pillar를 만들었을 때 얻는 효과가 크다.
    const linkExpansionPotential = Math.max(0, 1 - Math.min(1, avgLinks / 8));

    const articleCountNorm = Math.min(1, count / 30);
    const avgScoreNorm = Math.min(1, avgScore / 2);

    // 가중치: 글 수(3) + 주제 명확도(matchScore, 3) + 검색의도 일관성(2) +
    // keyword 명확도(1) + 내부링크 확장 잠재력(1) = 최대 10 → 0~100로 정규화.
    const rawScore = articleCountNorm * 3 + avgScoreNorm * 3 + intentConsistency * 2 + keywordClarity * 1 + linkExpansionPotential * 1;
    const qualityScore = Math.round((rawScore / 10) * 1000) / 10;

    rows.push({
      cluster_id: def.slug,
      cluster_name: def.name,
      article_count: count,
      avg_match_score: Math.round(avgScore * 100) / 100,
      intent_consistency_pct: Math.round(intentConsistency * 1000) / 10,
      keyword_clarity_pct: Math.round(keywordClarity * 1000) / 10,
      avg_internal_links: Math.round(avgLinks * 100) / 100,
      quality_score: qualityScore,
      breakdown: `글수 ${Math.round(articleCountNorm * 3 * 10) / 10}/3 + 주제명확도 ${Math.round(avgScoreNorm * 3 * 10) / 10}/3 + 의도일관성 ${Math.round(intentConsistency * 2 * 10) / 10}/2 + keyword명확도 ${Math.round(keywordClarity * 10) / 10}/1 + 링크확장여력 ${Math.round(linkExpansionPotential * 10) / 10}/1`,
    });
  }

  rows.sort((a, b) => (b.quality_score as number) - (a.quality_score as number));

  ensureAuditDir();
  const columns = ['cluster_id', 'cluster_name', 'article_count', 'avg_match_score', 'intent_consistency_pct', 'keyword_clarity_pct', 'avg_internal_links', 'quality_score', 'breakdown'];
  fs.writeFileSync(path.join(AUDIT_DIR, 'pillar-quality-review.csv'), toCsv(columns, rows), 'utf-8');

  console.log(`B등급 Pillar 후보 ${rows.length}개 재평가 완료 (점수 높은 순):`);
  rows.forEach(r => console.log(`  ${String(r.quality_score).padStart(5)}점  ${r.cluster_id} (${r.article_count}개, matchScore ${r.avg_match_score})`));
  console.log('출력: seo-audit/pillar-quality-review.csv — 실제 채택 여부는 사람이 5가지 질문 기준으로 최종 검토');
}

main();
