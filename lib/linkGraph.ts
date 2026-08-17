// SEO 2단계 §10/§19-20이 함께 쓰는 내부링크 그래프. lib/relatedPosts.ts의
// getRelatedContent()가 실제로 ArticleFooter에 렌더링하는 것과 똑같은
// 로직으로 outgoing/incoming을 계산한다 — "화면에 실제로 보이는 링크"
// 기준이어야 orphan 판정이 site 현실과 일치한다. 카테고리/전체글 목록
// 페이지(페이지네이션)는 포함하지 않는다 — 지시서가 말하는 "내부링크"는
// 편집적으로 연결된 관련 콘텐츠 링크를 뜻하지, 기계적인 목록 페이지 노출을
// 뜻하지 않는다.
import { type AuditPost, classifyCluster, computeCommonTermsByCategory } from './seoAudit';
import { getRelatedContent } from './relatedPosts';
import { PILLARS } from './pillars';

export interface LinkGraph {
  outgoing: Map<string, Set<string>>; // post slug -> 이 글이 링크하는 다른 글 slug들(관련 글 카드 기준)
  incoming: Map<string, Set<string>>; // post slug -> 이 글로 들어오는 링크의 출처(다른 글 slug 또는 "guide:{pillarSlug}")
}

function addIncoming(incoming: Map<string, Set<string>>, target: string, source: string) {
  if (!incoming.has(target)) incoming.set(target, new Set());
  incoming.get(target)!.add(source);
}

export function buildLinkGraph(posts: AuditPost[]): LinkGraph {
  const outgoing = new Map<string, Set<string>>();
  const incoming = new Map<string, Set<string>>();
  const commonTermsByCategory = computeCommonTermsByCategory(posts);

  for (const post of posts) {
    const commonTerms = commonTermsByCategory.get(post.category ?? '') ?? new Set<string>();
    const related = getRelatedContent(post, posts, commonTerms);
    const targets = new Set<string>();
    for (const l of related.sideways) targets.add(l.slug);
    for (const l of related.next) targets.add(l.slug);
    outgoing.set(post.slug, targets);
    for (const t of targets) addIncoming(incoming, t, post.slug);
  }

  // Pillar 페이지 → 하위 글: 가이드 페이지도 실제 클릭 가능한 링크를 제공하므로 incoming edge로 센다.
  for (const pillar of PILLARS) {
    const members = posts.filter(p => classifyCluster(p).clusterSlug === pillar.clusterId);
    for (const m of members) addIncoming(incoming, m.slug, `guide:${pillar.slug}`);
  }

  return { outgoing, incoming };
}

export function findOrphanPages(posts: AuditPost[], graph: LinkGraph): AuditPost[] {
  return posts.filter(p => (graph.incoming.get(p.slug)?.size ?? 0) === 0);
}
