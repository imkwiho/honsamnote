// SEO 3단계 §20 — 현재 링크 그래프(사이드웨이/next)의 모든 outgoing edge에
// 대해 관련성 점수를 재계산해, 약한 신호(카테고리 일치 등)만으로 연결된
// 후보를 보고한다. 자동 삭제는 하지 않는다.
import fs from 'fs';
import path from 'path';
import { classifyClusterDetailed, computeRelevanceScore, computeCommonTermsByCategory } from '../lib/seoAudit';
import { getRelatedContent } from '../lib/relatedPosts';
import { loadAllPosts, AUDIT_DIR, ensureAuditDir, toCsv } from './lib/seoPhase3Shared';

// computeRelevanceScore = clusterMatch*6 + primaryKeywordMatch*5 + keywordOverlap*2
// + tagOverlap*2 + categoryMatch*1. 이 점수 미만이면 clusterMatch나
// primaryKeywordMatch 같은 강한 신호가 전혀 없고, keyword/tag overlap
// 1~2개나 category 일치만으로 연결된 것 — "약한 링크" 후보로 본다.
const WEAK_THRESHOLD = 4;

function main() {
  const posts = loadAllPosts();
  const bySlug = new Map(posts.map(p => [p.slug, p]));
  const clusterOf = (p: (typeof posts)[number]) => classifyClusterDetailed(p).clusterSlug;
  const commonTermsByCategory = computeCommonTermsByCategory(posts);

  const rows: Record<string, unknown>[] = [];
  let totalEdges = 0;

  for (const post of posts) {
    const commonTerms = commonTermsByCategory.get(post.category ?? '') ?? new Set<string>();
    const related = getRelatedContent(post, posts, commonTerms);
    const edges: { slug: string; type: 'sideways' | 'next' }[] = [
      ...related.sideways.map(l => ({ slug: l.slug, type: 'sideways' as const })),
      ...related.next.map(l => ({ slug: l.slug, type: 'next' as const })),
    ];
    totalEdges += edges.length;

    for (const edge of edges) {
      const target = bySlug.get(edge.slug);
      if (!target) continue;
      const score = computeRelevanceScore(post, target, clusterOf, commonTerms);
      if (score >= WEAK_THRESHOLD) continue;

      rows.push({
        source_slug: post.slug,
        source_title: post.title,
        target_slug: target.slug,
        target_title: target.title,
        relevance_score: score,
        relation_type: edge.type,
        reason: score === 0 ? '(발생 불가 — 점수 0은 애초에 후보에서 제외됨)' :
          `강한 신호(같은 클러스터/대표 키워드 일치) 없이 카테고리 일치 또는 소수 keyword/tag overlap만으로 연결됨(점수 ${score})`,
      });
    }
  }

  ensureAuditDir();
  const columns = ['source_slug', 'source_title', 'target_slug', 'target_title', 'relevance_score', 'relation_type', 'reason'];
  rows.sort((a, b) => (a.relevance_score as number) - (b.relevance_score as number));
  fs.writeFileSync(path.join(AUDIT_DIR, 'weak-internal-links.csv'), toCsv(columns, rows), 'utf-8');

  console.log(`전체 내부링크 edge ${totalEdges}개 중 약한 링크(점수 <${WEAK_THRESHOLD}) 후보: ${rows.length}개`);
  console.log('출력: seo-audit/weak-internal-links.csv (자동 삭제 없음 — 후보 보고만)');
}

main();
