// SEO 2단계 §24-26 — 새 글을 저장하기 전에 기존 글과 너무 유사한지 확인한다.
// lib/seoAudit.ts의 findDuplicateCandidates()를 그대로 재사용한다(같은
// 카테고리 내 비교, generic phrase/카테고리 내 흔한 keyword 제외, 클러스터
// 보너스 등 이미 검증된 기준을 새 글에도 동일하게 적용) — 로직을 새로
// 만들지 않고 기존 걸 새 글 하나와 기존 전체를 합친 배열에 돌려서, 그
// 새 글이 낀 쌍만 골라낸다.
import { type AuditPost, findDuplicateCandidates } from './seoAudit';

// findDuplicateCandidates의 MERGE_THRESHOLD(통합 후보 기준)와 동일 — 이
// 정도로 유사하면 새 글로 저장하지 않고 기존 글 업데이트를 권한다.
const BLOCK_THRESHOLD = 0.75;

export interface SimilarExistingPost {
  slug: string;
  title: string;
  similarity: number;
}

export interface DuplicateCheckResult {
  blocked: boolean;
  closestExisting: SimilarExistingPost[];
}

/** newPost는 아직 저장되지 않은 글이어야 한다(slug는 임시로 유일하기만 하면 됨). */
export function checkForDuplicate(newPost: AuditPost, existingPosts: AuditPost[]): DuplicateCheckResult {
  const combined = [...existingPosts, newPost];
  const candidates = findDuplicateCandidates(combined);
  const involvingNew = candidates.filter(c => c.mainPost === newPost.slug || c.duplicatePost === newPost.slug);

  const closestExisting: SimilarExistingPost[] = involvingNew
    .map(c => {
      const otherSlug = c.mainPost === newPost.slug ? c.duplicatePost : c.mainPost;
      const other = existingPosts.find(p => p.slug === otherSlug);
      return { slug: otherSlug, title: other?.title ?? otherSlug, similarity: c.similarity };
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5);

  const blocked = closestExisting.some(c => c.similarity >= BLOCK_THRESHOLD);
  return { blocked, closestExisting };
}
