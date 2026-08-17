import { describe, it, expect } from 'vitest';
import { type AuditPost } from '../seoAudit';
import { computeSeoMetadata, computeAllSeoMetadata } from '../seoMetadata';

function makePost(overrides: Partial<AuditPost>): AuditPost {
  return {
    slug: 'test-slug',
    title: '테스트 제목',
    description: '테스트 설명입니다.',
    date: '2026-08-01',
    tags: [],
    keywords: [],
    category: 'cleaning',
    categoryName: '청소·세탁·집안일',
    content: '## 문제 상황\n본문 내용입니다.',
    ...overrides,
  };
}

describe('computeSeoMetadata — titleConfidence 등급', () => {
  it('원제목에 대표 키워드가 있고 검색의도가 명확하면 HIGH', () => {
    const post = makePost({ title: '전자레인지 냄새 제거 방법', keywords: ['전자레인지 냄새'] });
    const meta = computeSeoMetadata(post);
    expect(meta.titleConfidence).toBe('HIGH');
  });

  it('대표 키워드가 아예 없으면 LOW', () => {
    const post = makePost({ title: '평범한 제목입니다', keywords: [], tags: [] });
    const meta = computeSeoMetadata(post);
    expect(meta.titleConfidence).toBe('LOW');
  });

  it('대표 키워드는 있지만 원제목에 없으면 MEDIUM(추가 검토 필요)', () => {
    const post = makePost({ title: '이 글은 여러 팁을 담고 있습니다', keywords: ['전자레인지 냄새'] });
    const meta = computeSeoMetadata(post);
    expect(meta.titleConfidence).toBe('MEDIUM');
  });

  it('실제 사례: 감자/양파처럼 서로 다른 주제가 한 제목에 섞여 있으면 role-split candidate로 LOW 처리한다', () => {
    const post = makePost({
      title: '마트에서 산 감자 싹 나고 양파 물러질 때, 버릴까 말까?',
      keywords: ['감자 싹', '양파'],
    });
    const meta = computeSeoMetadata(post);
    expect(meta.titleConfidence).toBe('LOW');
    expect(meta.titleConfidenceReason).toContain('role-split');
  });

  it('물음표가 2개 이상이면 role-split candidate로 본다', () => {
    const post = makePost({ title: '이거 버려도 될까? 아니면 계속 써도 될까?', keywords: ['보관법'] });
    const meta = computeSeoMetadata(post);
    expect(meta.titleConfidence).toBe('LOW');
  });

  it('범용 표현이 keywords 맨 앞에 있어도 실제 버그처럼 잘못된 제목을 만들지 않는다', () => {
    const post = makePost({
      title: '혼자 사는 직장인, 주말 무기력증 탈출! 나만의 루틴 만드는 법',
      keywords: ['혼자 사는 직장인', '주말 무기력증'],
    });
    const meta = computeSeoMetadata(post);
    expect(meta.primaryKeyword).toBe('주말 무기력증');
    expect(meta.seoTitleSuggestion).not.toContain('혼자 사는 직장인');
  });
});

describe('computeSeoMetadata — 기본 필드', () => {
  it('클러스터/검색의도가 lib/seoAudit.ts의 분류 결과와 일치한다', () => {
    const post = makePost({ category: 'safety', categoryName: '안전·응급상황', keywords: ['바퀴벌레 퇴치'], title: '바퀴벌레 퇴치 방법' });
    const meta = computeSeoMetadata(post);
    expect(meta.clusterId).toBe('pest-control');
    expect(meta.clusterName).toBe('해충 퇴치');
    expect(meta.searchIntent).toBe('방법형');
  });

  it('secondaryKeywords가 primaryKeyword를 제외한 나머지를 담는다', () => {
    const post = makePost({ keywords: ['식재료 보관', '냉장 보관', '신선도'] });
    const meta = computeSeoMetadata(post);
    expect(meta.primaryKeyword).toBe('식재료 보관');
    expect(meta.secondaryKeywords).toEqual(['냉장 보관', '신선도']);
  });
});

describe('computeAllSeoMetadata', () => {
  it('slug를 키로 하는 Map을 반환하고, 게시글 수와 개수가 일치한다', () => {
    const posts = [makePost({ slug: 'a' }), makePost({ slug: 'b' })];
    const map = computeAllSeoMetadata(posts);
    expect(map.size).toBe(2);
    expect(map.get('a')?.slug).toBe('a');
    expect(map.get('b')?.slug).toBe('b');
  });
});
