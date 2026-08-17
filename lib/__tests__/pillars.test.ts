import { describe, it, expect } from 'vitest';
import { type AuditPost } from '../seoAudit';
import { PILLARS, getPillarForCluster, getPillarBySlug, assignSubTopic } from '../pillars';

function makePost(overrides: Partial<AuditPost>): AuditPost {
  return {
    slug: 'test-slug',
    title: '테스트 제목',
    description: '설명',
    date: '2026-08-01',
    tags: [],
    keywords: [],
    category: 'storage',
    categoryName: '좁은 집과 수납',
    content: '',
    ...overrides,
  };
}

describe('PILLARS', () => {
  it('A등급으로 분류된 3개 클러스터에만 존재한다', () => {
    const clusterIds = PILLARS.map(p => p.clusterId).sort();
    expect(clusterIds).toEqual(['laundry-clothing', 'loneliness-isolation', 'oneroom-storage'].sort());
  });

  it('각 Pillar는 intro/whatItSolves가 비어있지 않고, 하위 주제를 2개 이상 가진다', () => {
    for (const pillar of PILLARS) {
      expect(pillar.intro.length).toBeGreaterThan(10);
      expect(pillar.whatItSolves.length).toBeGreaterThan(10);
      expect(pillar.subTopics.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('getPillarForCluster / getPillarBySlug', () => {
  it('클러스터 id로 정확한 Pillar를 찾는다', () => {
    expect(getPillarForCluster('oneroom-storage')?.slug).toBe('oneroom-storage');
  });

  it('A등급이 아닌 클러스터는 undefined를 반환한다', () => {
    expect(getPillarForCluster('general-living-cost')).toBeUndefined();
  });

  it('slug로도 정확한 Pillar를 찾는다', () => {
    expect(getPillarBySlug('laundry')?.clusterId).toBe('laundry-clothing');
  });
});

describe('assignSubTopic', () => {
  const pillar = PILLARS.find(p => p.slug === 'oneroom-storage')!;

  it('제목/keywords가 힌트와 일치하면 해당 하위 주제를 반환한다', () => {
    const post = makePost({ title: '옷장 정리로 계절옷 보관하는 법' });
    expect(assignSubTopic(post, pillar)).toBe('옷·의류 수납');
  });

  it('여러 하위 주제 힌트가 매치되면 점수가 가장 높은 쪽을 고른다', () => {
    const post = makePost({ title: '냉장고 옆 팬트리 식료품 정리', keywords: ['하부장'] });
    expect(assignSubTopic(post, pillar)).toBe('주방·욕실 주변 수납');
  });

  it('어떤 힌트와도 안 맞으면 "기타"를 반환한다', () => {
    const post = makePost({ title: '완전히 무관한 제목입니다', keywords: [] });
    expect(assignSubTopic(post, pillar)).toBe('기타');
  });
});
