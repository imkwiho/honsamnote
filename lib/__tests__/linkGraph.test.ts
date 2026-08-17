import { describe, it, expect } from 'vitest';
import { type AuditPost } from '../seoAudit';
import { buildLinkGraph, findOrphanPages } from '../linkGraph';

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

describe('buildLinkGraph', () => {
  it('관련 글로 연결된 두 글은 서로 outgoing/incoming 관계를 가진다', () => {
    const a = makePost({ slug: 'a', keywords: ['욕실 곰팡이'] });
    const b = makePost({ slug: 'b', keywords: ['욕실 곰팡이', '배수구'] });
    const graph = buildLinkGraph([a, b]);
    expect(graph.outgoing.get('a')?.has('b')).toBe(true);
    expect(graph.incoming.get('b')?.has('a')).toBe(true);
  });

  it('A등급 Pillar 클러스터에 속한 글은 "guide:{slug}" 출처로 incoming edge를 받는다', () => {
    const post = makePost({ slug: 'a', category: 'storage', categoryName: '좁은 집과 수납', keywords: ['원룸 수납'], title: '원룸 수납 팁' });
    const graph = buildLinkGraph([post]);
    expect(graph.incoming.get('a')?.has('guide:oneroom-storage')).toBe(true);
  });
});

describe('findOrphanPages', () => {
  it('incoming edge가 하나도 없는 글을 orphan으로 판정한다', () => {
    const isolated = makePost({ slug: 'isolated', category: 'cost', categoryName: '생활비 최적화', keywords: ['완전 무관한 표현'] });
    const graph = buildLinkGraph([isolated]);
    const orphans = findOrphanPages([isolated], graph);
    expect(orphans.map(p => p.slug)).toContain('isolated');
  });

  it('incoming edge가 있는 글은 orphan이 아니다', () => {
    const a = makePost({ slug: 'a', keywords: ['욕실 곰팡이'] });
    const b = makePost({ slug: 'b', keywords: ['욕실 곰팡이', '배수구'] });
    const graph = buildLinkGraph([a, b]);
    const orphans = findOrphanPages([a, b], graph);
    expect(orphans.map(p => p.slug)).not.toContain('b');
  });
});
