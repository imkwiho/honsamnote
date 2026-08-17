import { describe, it, expect } from 'vitest';
import { type AuditPost } from '../seoAudit';
import { getRelatedContent } from '../relatedPosts';

function makePost(overrides: Partial<AuditPost>): AuditPost {
  return {
    slug: 'test-slug',
    title: '테스트 제목',
    description: '설명',
    date: '2026-08-01',
    tags: [],
    keywords: [],
    category: 'cleaning',
    categoryName: '청소·세탁·집안일',
    content: '',
    ...overrides,
  };
}

describe('getRelatedContent', () => {
  it('같은 클러스터 글은 sideways에, 다른 클러스터는 next에 들어간다', () => {
    const current = makePost({ slug: 'current', category: 'cleaning', keywords: ['욕실 곰팡이'], title: '욕실 곰팡이 제거법' });
    const sameCluster = makePost({ slug: 'same', category: 'cleaning', keywords: ['욕실 곰팡이', '배수구'], title: '배수구 냄새 없애는 법' });
    const otherCluster = makePost({ slug: 'other', category: 'cleaning', keywords: ['세탁기 냄새'], title: '세탁기 냄새 제거법', tags: ['욕실 곰팡이'] });
    const unrelated = makePost({ slug: 'unrelated', category: 'food', categoryName: '혼밥·식재료 관리', keywords: ['식재료 보관'], title: '식재료 보관법' });

    const result = getRelatedContent(current, [current, sameCluster, otherCluster, unrelated]);
    expect(result.sideways.map(l => l.slug)).toContain('same');
    expect(result.sideways.map(l => l.slug)).not.toContain('unrelated');
  });

  it('점수가 0인 글은 후보에 넣지 않는다(억지로 채우지 않음)', () => {
    const current = makePost({ slug: 'current', category: 'cleaning', keywords: ['욕실 곰팡이'] });
    const unrelated = makePost({ slug: 'unrelated', category: 'food', categoryName: '혼밥·식재료 관리', keywords: ['식재료 보관'], tags: [] });
    const result = getRelatedContent(current, [current, unrelated]);
    expect(result.sideways).toHaveLength(0);
    expect(result.next).toHaveLength(0);
  });

  it('자기 자신은 후보에서 제외된다', () => {
    const current = makePost({ slug: 'current', keywords: ['욕실 곰팡이'] });
    const result = getRelatedContent(current, [current]);
    expect(result.sideways.every(l => l.slug !== 'current')).toBe(true);
    expect(result.next.every(l => l.slug !== 'current')).toBe(true);
  });

  it('A등급 Pillar에 속한 클러스터면 up 링크를 반환한다', () => {
    const post = makePost({ slug: 'a', category: 'storage', categoryName: '좁은 집과 수납', keywords: ['원룸 수납'], title: '원룸 수납 팁' });
    const result = getRelatedContent(post, [post]);
    expect(result.up).not.toBeNull();
    expect(result.up?.href).toBe('/guide/oneroom-storage/');
  });

  it('A등급 Pillar가 없는 클러스터면 up은 null이다', () => {
    const post = makePost({ slug: 'a', category: 'cost', categoryName: '생활비 최적화', keywords: ['생활비 절약'], title: '생활비 절약 팁' });
    const result = getRelatedContent(post, [post]);
    expect(result.up).toBeNull();
  });

  it('sideways/next 개수를 억지로 채우지 않으며 각각 최대 개수(4/2)를 넘지 않는다', () => {
    const current = makePost({ slug: 'current', category: 'safety', categoryName: '안전·응급상황', keywords: ['바퀴벌레 퇴치'] });
    const manySame = Array.from({ length: 10 }, (_, i) =>
      makePost({ slug: `same-${i}`, category: 'safety', categoryName: '안전·응급상황', keywords: ['바퀴벌레 퇴치', '해충'] })
    );
    const result = getRelatedContent(current, [current, ...manySame]);
    expect(result.sideways.length).toBeLessThanOrEqual(4);
  });

  it('미분류(-general) 클러스터끼리는 같은 클러스터로 취급하지 않는다', () => {
    const current = makePost({ slug: 'current', category: 'cleaning', keywords: [], title: '애매한 제목 A' });
    const otherGeneral = makePost({ slug: 'other', category: 'cleaning', keywords: [], title: '애매한 제목 B', tags: ['가전 배치'] });
    const result = getRelatedContent(current, [current, otherGeneral]);
    expect(result.sideways).toHaveLength(0);
  });
});
