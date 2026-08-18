// SEO 3단계 §22-25 — 클러스터마다 "대표 콘텐츠(Primary Page)" 1개를 정하고,
// 새 글 생성 시 그 대표 콘텐츠의 검색의도를 침범하지 않는지 경고한다.
// 클러스터는 front matter에 저장되지 않는 계산값이므로, Primary Page 지정도
// 순수 계산이다(파일에 아무것도 쓰지 않음 — 관리자 화면에서만 노출).
import { type AuditPost, classifyClusterDetailed, primaryKeyword, detectSearchIntent } from './seoAudit';
import { buildLinkGraph, type LinkGraph } from './linkGraph';

export interface PrimaryPageInfo {
  clusterId: string;
  clusterName: string;
  primarySlug: string;
  primaryTitle: string;
  supportingSlugs: string[];
  reason: string;
}

/** 클러스터 안에서 "대표 콘텐츠"로 가장 적합한 글 1개를 고른다. 기준(우선순위순):
 * ① 클러스터 정의와의 주제 적합도(matchScore) — 가장 그 클러스터를 잘 대표하는 글
 * ② 들어오는 내부링크 수 — 이미 사이트 안에서 다른 글들이 참조하고 있는 글
 * ③ 본문 충실도(길이) — 너무 얕은 글이 대표가 되지 않도록
 * ④ 최신순 — 동점이면 더 최근에 검토/작성된 글
 */
export function computePrimaryPages(posts: AuditPost[], graph: LinkGraph): Map<string, PrimaryPageInfo> {
  const membersByCluster = new Map<string, AuditPost[]>();
  for (const post of posts) {
    const { clusterSlug } = classifyClusterDetailed(post);
    if (clusterSlug.endsWith('-general')) continue; // 미분류는 대표 콘텐츠 개념이 성립하지 않음
    const list = membersByCluster.get(clusterSlug) ?? [];
    list.push(post);
    membersByCluster.set(clusterSlug, list);
  }

  const result = new Map<string, PrimaryPageInfo>();
  for (const [clusterId, members] of membersByCluster) {
    if (members.length === 0) continue;
    const clusterName = classifyClusterDetailed(members[0]).clusterName;

    const scored = members.map(post => {
      const { matchScore } = classifyClusterDetailed(post);
      const incoming = graph.incoming.get(post.slug)?.size ?? 0;
      const contentScore = Math.min(3, post.content.length / 2000);
      const score = matchScore * 10 + incoming * 2 + contentScore;
      return { post, score };
    });
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const dateA = a.post.updatedAt ?? a.post.date;
      const dateB = b.post.updatedAt ?? b.post.date;
      return dateB.localeCompare(dateA);
    });

    const primary = scored[0].post;
    result.set(clusterId, {
      clusterId,
      clusterName,
      primarySlug: primary.slug,
      primaryTitle: primary.title,
      supportingSlugs: scored.slice(1).map(s => s.post.slug),
      reason: members.length === 1
        ? '클러스터에 글이 1개뿐 — 그 글이 곧 대표 콘텐츠'
        : `주제 적합도(matchScore ${scored[0].score.toFixed(1)}점 환산)·들어오는 링크·본문 충실도 기준 최상위`,
    });
  }
  return result;
}

export interface PrimaryPageInfringement {
  infringes: boolean;
  clusterId?: string;
  clusterName?: string;
  primarySlug?: string;
  primaryTitle?: string;
  message?: string;
}

/**
 * §24-25 — 새 글이 이미 대표 콘텐츠가 있는 클러스터의 검색의도를 그대로
 * 침범하는지 확인한다. 무인 CI 환경이라 **차단은 아니고 경고만** 반환한다
 * (호출부인 scripts/generate-post.ts가 콘솔에 로그만 남기고 계속 진행).
 */
export function checkPrimaryPageInfringement(newPost: AuditPost, existingPosts: AuditPost[]): PrimaryPageInfringement {
  const { clusterSlug, clusterName } = classifyClusterDetailed(newPost);
  if (clusterSlug.endsWith('-general')) return { infringes: false };

  const graph = buildLinkGraph(existingPosts);
  const primaryPages = computePrimaryPages(existingPosts, graph);
  const primary = primaryPages.get(clusterSlug);
  if (!primary) return { infringes: false }; // 아직 이 클러스터에 대표 콘텐츠가 없음 — 새 글이 첫 후보일 수 있음

  const primaryPost = existingPosts.find(p => p.slug === primary.primarySlug);
  if (!primaryPost) return { infringes: false };

  const sameIntent = detectSearchIntent(newPost) === detectSearchIntent(primaryPost);
  const sameKeyword = primaryKeyword(newPost) !== '' && primaryKeyword(newPost) === primaryKeyword(primaryPost);

  if (sameIntent && sameKeyword) {
    return {
      infringes: true,
      clusterId: clusterSlug,
      clusterName,
      primarySlug: primary.primarySlug,
      primaryTitle: primary.primaryTitle,
      message: `이 검색 의도의 대표 콘텐츠가 이미 존재합니다: "${primary.primaryTitle}" (/blog/${primary.primarySlug}/) — 새 글 대신 기존 글 업데이트를 우선 검토하세요.`,
    };
  }
  return { infringes: false, clusterId: clusterSlug, clusterName, primarySlug: primary.primarySlug, primaryTitle: primary.primaryTitle };
}
