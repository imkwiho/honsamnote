// SEO 2단계 §5-9 — 내부링크 시스템의 핵심. computeRelevanceScore(카테고리는
// 항상 최하위 가중치, 클러스터/대표 키워드 일치가 핵심 신호)를 바탕으로
// "위로(Pillar) / 옆으로(같은 클러스터) / 다음 문제(관련 클러스터)" 3방향
// 관련 콘텐츠를 계산한다. 숫자를 억지로 채우지 않는다 — 점수가 0이면
// 후보에서 제외된다.
import { type AuditPost, classifyCluster, computeRelevanceScore } from './seoAudit';
import { getPillarForCluster } from './pillars';

export interface RelatedLink {
  slug: string;
  title: string;
  description?: string;
  category?: string;
  categoryName?: string;
}

export interface RelatedContent {
  up: { name: string; href: string } | null;
  sideways: RelatedLink[]; // 같은 세부 클러스터
  next: RelatedLink[]; // 관련 있는 다른 클러스터("다음 문제")
}

const SIDEWAYS_MAX = 4;
const NEXT_MAX = 2;

function toLink(post: AuditPost): RelatedLink {
  return { slug: post.slug, title: post.title, description: post.description, category: post.category, categoryName: post.categoryName };
}

export function getRelatedContent(post: AuditPost, allPosts: AuditPost[], commonTerms: Set<string> = new Set()): RelatedContent {
  const clusterOf = (p: AuditPost) => classifyCluster(p).clusterSlug;
  const postCluster = clusterOf(post);
  const postClusterIsGeneral = postCluster.endsWith('-general');

  const scored = allPosts
    .filter(p => p.slug !== post.slug)
    .map(p => ({ post: p, score: computeRelevanceScore(post, p, clusterOf, commonTerms), cluster: clusterOf(p) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score);

  // 미분류(-general) 클러스터끼리는 "같은 클러스터"로 보지 않는다(둘 다
  // 아무 세부 주제에도 안 걸렸을 뿐이라 옆으로 묶을 근거가 아님) — 이 경우
  // 전부 next 후보로만 다룬다.
  const sameCluster = postClusterIsGeneral ? [] : scored.filter(x => x.cluster === postCluster);
  const otherCluster = scored.filter(x => postClusterIsGeneral || x.cluster !== postCluster);

  const sideways = sameCluster.slice(0, SIDEWAYS_MAX).map(x => toLink(x.post));
  const usedSlugs = new Set(sideways.map(s => s.slug));
  const next = otherCluster.filter(x => !usedSlugs.has(x.post.slug)).slice(0, NEXT_MAX).map(x => toLink(x.post));

  const pillar = getPillarForCluster(postCluster);
  const up = pillar ? { name: pillar.name, href: `/guide/${pillar.slug}/` } : null;

  return { up, sideways, next };
}
