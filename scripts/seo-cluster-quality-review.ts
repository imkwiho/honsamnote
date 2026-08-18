// SEO 3단계 §4 — 47개 클러스터 전체 품질 재감사. 클러스터는 front matter에
// 저장되지 않고 CLUSTER_TAXONOMY로 매번 계산되므로, 여기서 나온 rename/merge
// 추천을 나중에 실제로 반영해도 게시글 URL은 전혀 바뀌지 않는다(안전).
import fs from 'fs';
import path from 'path';
import {
  type AuditPost,
  CLUSTER_TAXONOMY,
  GENERIC_PHRASES,
  classifyClusterDetailed,
  detectSearchIntent,
  computeCommonTermsByCategory,
} from '../lib/seoAudit';
import { getPillarForCluster } from '../lib/pillars';
import { buildLinkGraph } from '../lib/linkGraph';
import { loadAllPosts, AUDIT_DIR, ensureAuditDir, toCsv } from './lib/seoPhase3Shared';

// 대표 글이 있다고 볼 수 있는 최소 matchScore(클러스터 정의 matchTerms 중
// 3개 이상을 실제로 맞춘 글이 하나라도 있으면, 그 클러스터를 "제대로 대표하는"
// 글이 존재한다고 본다).
const REPRESENTATIVE_MATCH_SCORE_THRESHOLD = 3;
const SIMILAR_CLUSTER_JACCARD_THRESHOLD = 0.35;
const SPLIT_TOO_BROAD_INTENT_CONSISTENCY = 0.4;
// pillar-plan.ts(2단계)와 동일한 판정 — "전반"류 카테고리-포괄 클러스터는
// 글 수/점수가 좋아도 Pillar 후보에서 제외한다(검색의도가 너무 넓음).
const GENERIC_CATCHALL_CLUSTERS = new Set(['general-living-cost']);

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

function main() {
  const posts = loadAllPosts();
  const graph = buildLinkGraph(posts);
  const commonTermsByCategory = computeCommonTermsByCategory(posts);

  const membersByCluster = new Map<string, AuditPost[]>();
  const matchScoreByPostSlug = new Map<string, number>();
  for (const post of posts) {
    const { clusterSlug, matchScore } = classifyClusterDetailed(post);
    matchScoreByPostSlug.set(post.slug, matchScore);
    if (clusterSlug.endsWith('-general')) continue;
    const list = membersByCluster.get(clusterSlug) ?? [];
    list.push(post);
    membersByCluster.set(clusterSlug, list);
  }

  // 클러스터별 대표 keyword 집합(노이즈 제외) — 유사 클러스터 탐지용.
  function clusterKeywordSet(clusterSlug: string, category: string): Set<string> {
    const members = membersByCluster.get(clusterSlug) ?? [];
    const common = commonTermsByCategory.get(category) ?? new Set<string>();
    const set = new Set<string>();
    for (const m of members) {
      for (const k of [...m.keywords, ...m.tags]) {
        if (!GENERIC_PHRASES.has(k) && !common.has(k)) set.add(k);
      }
    }
    return set;
  }

  const rows: Record<string, unknown>[] = [];

  for (const [category, defs] of Object.entries(CLUSTER_TAXONOMY)) {
    const categoryKeywordSets = new Map(defs.map(d => [d.slug, clusterKeywordSet(d.slug, category)]));

    for (const def of defs) {
      const members = membersByCluster.get(def.slug) ?? [];
      const articleCount = members.length;
      const pillar = getPillarForCluster(def.slug);

      if (articleCount === 0) {
        rows.push({
          cluster_id: def.slug, cluster_name: def.name, category,
          article_count: 0, avg_match_score: 0, dominant_intent: '', intent_consistency_pct: 0,
          has_representative_article: '아니오', avg_internal_links: 0, has_pillar: pillar ? '예' : '아니오',
          most_similar_cluster: '', similar_cluster_overlap: 0,
          proposed_action: 'no-members', reason: '현재 이 클러스터에 속하는 글이 0개(matchTerms를 실제로 맞추는 글이 없음) — matchTerms 재검토 필요',
        });
        continue;
      }

      const scores = members.map(m => matchScoreByPostSlug.get(m.slug) ?? 0);
      const avgMatchScore = Math.round((scores.reduce((a, b) => a + b, 0) / articleCount) * 100) / 100;
      const maxMatchScore = Math.max(...scores);
      const hasRepresentative = maxMatchScore >= REPRESENTATIVE_MATCH_SCORE_THRESHOLD;

      const intents = members.map(detectSearchIntent);
      const intentCounts = new Map<string, number>();
      for (const i of intents) intentCounts.set(i, (intentCounts.get(i) ?? 0) + 1);
      const [dominantIntent, dominantCount] = [...intentCounts.entries()].sort((a, b) => b[1] - a[1])[0];
      const intentConsistency = Math.round((dominantCount / articleCount) * 1000) / 10;

      const linkCounts = members.map(m => (graph.outgoing.get(m.slug)?.size ?? 0) + (graph.incoming.get(m.slug)?.size ?? 0));
      const avgInternalLinks = Math.round((linkCounts.reduce((a, b) => a + b, 0) / articleCount) * 100) / 100;

      // 가장 유사한 다른 클러스터(같은 카테고리 내)
      const mySet = categoryKeywordSets.get(def.slug)!;
      let mostSimilar: { name: string; overlap: number } | undefined;
      for (const other of defs) {
        if (other.slug === def.slug) continue;
        const otherSet = categoryKeywordSets.get(other.slug)!;
        const overlap = Math.round(jaccard(mySet, otherSet) * 100) / 100;
        if (!mostSimilar || overlap > mostSimilar.overlap) mostSimilar = { name: other.name, overlap };
      }

      let proposedAction: string;
      let reason: string;
      if (pillar) {
        proposedAction = 'keep(이미 Pillar 있음)';
        reason = `이미 /guide/${pillar.slug}/ Pillar 페이지가 있음 — 구조 변경 불필요`;
      } else if (mostSimilar && mostSimilar.overlap >= SIMILAR_CLUSTER_JACCARD_THRESHOLD) {
        proposedAction = `merge-with-${mostSimilar.name}`;
        reason = `"${mostSimilar.name}" 클러스터와 keyword 중복도(Jaccard)가 ${mostSimilar.overlap} — 두 클러스터가 사실상 같은 주제를 가리킬 가능성, 통합 검토`;
      } else if (intentConsistency < SPLIT_TOO_BROAD_INTENT_CONSISTENCY * 100) {
        proposedAction = 'split-too-broad';
        reason = `지배적 검색의도(${dominantIntent}) 비중이 ${intentConsistency}%로 낮음 — 서로 다른 검색의도가 섞여 있어 세분화 검토`;
      } else if (GENERIC_CATCHALL_CLUSTERS.has(def.slug)) {
        proposedAction = 'no-Pillar-needed(카테고리 포괄)';
        reason = `글 수(${articleCount})는 많지만 클러스터 정의 자체가 카테고리 전체와 거의 같은 "전반" 성격 — 검색의도가 너무 넓어 Pillar 후보에서 제외(2단계 pillar-plan.csv와 동일 판정)`;
      } else if (articleCount >= 15 && avgMatchScore >= 1.3) {
        proposedAction = 'create-Pillar(후보)';
        reason = `글 수(${articleCount})와 주제 일관성(평균 matchScore ${avgMatchScore})이 충분 — §5-6 Pillar Quality Score 재평가 대상`;
      } else if (!hasRepresentative && articleCount >= 5) {
        proposedAction = 'rename-or-refine-matchTerms';
        reason = `최고 matchScore가 ${maxMatchScore}로 낮음(대표 글이라 할 만한 글이 없음) — 클러스터 이름/matchTerms가 실제 글 내용과 느슨하게만 맞음`;
      } else {
        proposedAction = 'keep';
        reason = '현재 상태로 유지 — 별도 조치 불필요';
      }

      rows.push({
        cluster_id: def.slug, cluster_name: def.name, category,
        article_count: articleCount, avg_match_score: avgMatchScore, dominant_intent: dominantIntent, intent_consistency_pct: intentConsistency,
        has_representative_article: hasRepresentative ? '예' : '아니오', avg_internal_links: avgInternalLinks, has_pillar: pillar ? '예' : '아니오',
        most_similar_cluster: mostSimilar?.name ?? '', similar_cluster_overlap: mostSimilar?.overlap ?? 0,
        proposed_action: proposedAction, reason,
      });
    }
  }

  ensureAuditDir();
  const columns = [
    'cluster_id', 'cluster_name', 'category', 'article_count', 'avg_match_score', 'dominant_intent', 'intent_consistency_pct',
    'has_representative_article', 'avg_internal_links', 'has_pillar', 'most_similar_cluster', 'similar_cluster_overlap',
    'proposed_action', 'reason',
  ];
  rows.sort((a, b) => (b.article_count as number) - (a.article_count as number));
  fs.writeFileSync(path.join(AUDIT_DIR, 'cluster-quality-review.csv'), toCsv(columns, rows), 'utf-8');

  const actionCounts = new Map<string, number>();
  for (const r of rows) actionCounts.set(r.proposed_action as string, (actionCounts.get(r.proposed_action as string) ?? 0) + 1);
  console.log(`클러스터 ${rows.length}개 재감사 완료:`);
  for (const [action, count] of actionCounts) console.log(`  ${action}: ${count}개`);
  console.log('출력: seo-audit/cluster-quality-review.csv (클러스터는 계산값이라 URL 변경 없이 rename/merge 추천 가능)');
}

main();
