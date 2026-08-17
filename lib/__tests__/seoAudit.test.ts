import { describe, it, expect } from 'vitest';
import {
  type AuditPost,
  classifyCluster,
  needsTitleFix,
  needsMetaFix,
  findDuplicateDescriptionSlugs,
  findDuplicateCandidates,
  computeRelevanceScore,
  computeFactCheckFlag,
  computeSeoPriority,
  detectSearchIntent,
} from '../seoAudit';

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

describe('classifyCluster', () => {
  it('청소 카테고리 글을 keywords로 욕실 청소 클러스터에 분류한다', () => {
    const post = makePost({ category: 'cleaning', keywords: ['욕실 곰팡이', '변기 청소'] });
    expect(classifyCluster(post).clusterSlug).toBe('bathroom-cleaning');
  });

  it('매칭되는 클러스터가 없으면 카테고리-general로 폴백한다', () => {
    const post = makePost({ category: 'cleaning', keywords: ['전혀 관련 없는 표현'], title: '아무 상관 없는 제목' });
    expect(classifyCluster(post).clusterSlug).toBe('cleaning-general');
  });

  it('안전 카테고리 글을 해충 퇴치 클러스터로 분류한다(실제 상위 keyword 기준)', () => {
    const post = makePost({ category: 'safety', categoryName: '안전·응급상황', keywords: ['바퀴벌레 퇴치'] });
    expect(classifyCluster(post).clusterSlug).toBe('pest-control');
  });
});

describe('detectSearchIntent', () => {
  it('"vs" 또는 "비교"가 있으면 비교형으로 판단한다', () => {
    expect(detectSearchIntent(makePost({ title: '미니 밥솥 vs 즉석밥 비교' }))).toBe('비교형');
  });

  it('"방법"으로 끝나면 방법형으로 판단한다', () => {
    expect(detectSearchIntent(makePost({ title: '전자레인지 냄새 제거 방법' }))).toBe('방법형');
  });

  it('매칭되는 패턴이 없으면 문제해결형을 기본값으로 반환한다', () => {
    expect(detectSearchIntent(makePost({ title: '평범한 일반 제목' }))).toBe('문제해결형');
  });
});

describe('needsTitleFix', () => {
  it('45자를 초과하는 제목은 수정 필요로 표시한다', () => {
    const longTitle = '혼자 사는 당신, 이것은 아주 길고 장황한 제목으로 45자를 훌쩍 넘기는 예시 제목입니다 정말로';
    expect(needsTitleFix(makePost({ title: longTitle }))).toBe(true);
  });

  it('상투적인 도입부로 시작하면 수정 필요로 표시한다', () => {
    expect(needsTitleFix(makePost({ title: '혼자 사는 당신, 짧은 제목' }))).toBe(true);
  });

  it('짧고 상투적 도입부 없고 대표 키워드가 포함되면 수정 불필요로 표시한다', () => {
    const post = makePost({ title: '전자레인지 냄새 제거 방법', keywords: ['전자레인지 냄새'] });
    expect(needsTitleFix(post)).toBe(false);
  });
});

describe('needsMetaFix / findDuplicateDescriptionSlugs', () => {
  it('155자를 초과하는 description은 수정 필요로 표시한다', () => {
    const longDesc = '설명 '.repeat(60);
    expect(needsMetaFix(makePost({ description: longDesc }), new Set())).toBe(true);
  });

  it('동일한 description을 가진 글이 2개 이상이면 둘 다 중복 slug로 잡는다', () => {
    const posts = [
      makePost({ slug: 'a', description: '완전히 동일한 설명입니다.' }),
      makePost({ slug: 'b', description: '완전히 동일한 설명입니다.' }),
      makePost({ slug: 'c', description: '다른 설명입니다.' }),
    ];
    const dup = findDuplicateDescriptionSlugs(posts);
    expect(dup.has('a')).toBe(true);
    expect(dup.has('b')).toBe(true);
    expect(dup.has('c')).toBe(false);
  });
});

describe('findDuplicateCandidates', () => {
  it('같은 카테고리 내 제목·키워드가 매우 유사한 두 글을 통합 후보로 잡는다', () => {
    const posts = [
      makePost({ slug: 'roach-1', category: 'safety', title: '바퀴벌레 퇴치 완벽 가이드', keywords: ['바퀴벌레 퇴치', '해충 예방', '원룸 바퀴벌레'] }),
      makePost({ slug: 'roach-2', category: 'safety', title: '바퀴벌레 퇴치 완벽 방법', keywords: ['바퀴벌레 퇴치', '해충 예방', '원룸 바퀴벌레'] }),
      makePost({ slug: 'unrelated', category: 'safety', title: '보일러 동파 예방법', keywords: ['보일러 동파'] }),
    ];
    const candidates = findDuplicateCandidates(posts);
    const pair = candidates.find(c => (c.mainPost === 'roach-1' || c.mainPost === 'roach-2') && (c.duplicatePost === 'roach-1' || c.duplicatePost === 'roach-2'));
    expect(pair).toBeDefined();
    expect(pair!.recommendedAction).toBe('C. 통합 후보');
  });

  it('제목 문체가 달라 텍스트 유사도는 낮아도 같은 세부 클러스터면 잡아낸다(실제 사례: 바퀴벌레 관련 글 4건)', () => {
    // 2026-08-10-safety-auto-e68c91 vs 2026-08-10-safety-auto-46a836 — 둘 다
    // "해충 퇴치" 클러스터로 분류되지만 조사·문체가 달라 순수 텍스트 Jaccard는
    // 낮게 나온다(약 0.19). 클러스터 일치 신호를 함께 반영해야 잡힌다.
    const posts = [
      makePost({
        slug: 'roach-a',
        category: 'safety',
        categoryName: '안전·응급상황',
        title: '혼자 사는 당신, 주방이나 거실에 바퀴벌레가 갑자기 보일 때: 멘붕 없이 안전하게 퇴치하고 추가 침입 막는 현실적인 방법',
        keywords: ['바퀴벌레', '바퀴벌레 퇴치', '혼자 바퀴벌레', '1인 가구 바퀴벌레', '해충 방역', '집 바퀴벌레'],
      }),
      makePost({
        slug: 'roach-b',
        category: 'safety',
        categoryName: '안전·응급상황',
        title: '혼자 사는 당신, 갑자기 집에 바퀴벌레나 쥐가 출몰했을 때: 당황하지 않고 위생적으로 퇴치하고 예방하는 현실적인 방법',
        keywords: ['1인 가구 바퀴벌레', '혼자 사는 집 쥐', '해충 퇴치', '해충 예방', '위생 관리', '방역'],
      }),
    ];
    const candidates = findDuplicateCandidates(posts);
    expect(candidates).toHaveLength(1);
    expect(['B. 역할 분리 검토', 'C. 통합 후보']).toContain(candidates[0].recommendedAction);
  });

  it('카테고리 내에서 흔한 keyword(카테고리 이름과 거의 같은 표현)만 겹치는 글들은 후보로 잡지 않는다', () => {
    // 실제 사례: "생활비 절약"/"생활비 최적화"가 cost 카테고리 글 상당수에
    // 붙어 있어, 이것만으로 겹친다고 보면 관련 없는 글들까지 전부 후보가 됨.
    const commonKeywords = ['생활비 절약', '생활비 최적화'];
    const posts = Array.from({ length: 8 }, (_, i) =>
      makePost({
        slug: `cost-${i}`,
        category: 'cost',
        categoryName: '생활비 최적화',
        title: `서로 다른 주제의 글 ${i}`,
        keywords: [...commonKeywords], // 카테고리 전반에 흔한 keyword만 공유, 그 외 겹치는 게 없음
      })
    );
    expect(findDuplicateCandidates(posts)).toHaveLength(0);
  });

  it('둘 다 미분류(-general) 클러스터인 경우는 클러스터 일치로 쳐주지 않는다', () => {
    const posts = [
      makePost({ slug: 'a', category: 'lifestyle', categoryName: '관계·고립·생활 리듬', title: '전혀 클러스터에 안 걸리는 애매한 제목 하나', keywords: [] }),
      makePost({ slug: 'b', category: 'lifestyle', categoryName: '관계·고립·생활 리듬', title: '역시 클러스터에 안 걸리는 애매한 제목 둘', keywords: [] }),
    ];
    expect(findDuplicateCandidates(posts)).toHaveLength(0);
  });

  it('다른 카테고리의 유사한 제목은 비교 대상에서 제외한다', () => {
    const posts = [
      makePost({ slug: 'a', category: 'safety', title: '냄새 제거 방법', keywords: ['냄새 제거'] }),
      makePost({ slug: 'b', category: 'cleaning', title: '냄새 제거 방법', keywords: ['냄새 제거'] }),
    ];
    expect(findDuplicateCandidates(posts)).toHaveLength(0);
  });

  it('전혀 다른 주제의 글은 후보로 잡지 않는다', () => {
    const posts = [
      makePost({ slug: 'a', category: 'cleaning', title: '욕실 곰팡이 제거법', keywords: ['욕실 곰팡이'] }),
      makePost({ slug: 'b', category: 'cleaning', title: '세탁기 냄새 없애는 법', keywords: ['세탁기 냄새'] }),
    ];
    expect(findDuplicateCandidates(posts)).toHaveLength(0);
  });
});

describe('computeRelevanceScore', () => {
  const clusterOf = (p: AuditPost) => classifyCluster(p).clusterSlug;

  it('같은 클러스터면 5점을 더한다', () => {
    const a = makePost({ slug: 'a', keywords: ['욕실 곰팡이'] });
    const b = makePost({ slug: 'b', keywords: ['욕실 곰팡이'] });
    expect(computeRelevanceScore(a, b, clusterOf)).toBeGreaterThanOrEqual(5);
  });

  it('키워드/태그/카테고리가 전혀 겹치지 않고 클러스터도 다르면 0점이다', () => {
    const a = makePost({ slug: 'a', category: 'cleaning', keywords: ['욕실 곰팡이'], tags: ['청소'] });
    const b = makePost({ slug: 'b', category: 'food', categoryName: '혼밥·식재료 관리', keywords: ['식재료 보관'], tags: ['요리'] });
    expect(computeRelevanceScore(a, b, clusterOf)).toBe(0);
  });

  it('키워드 중복 1개당 3점씩 더한다', () => {
    const a = makePost({ slug: 'a', category: 'food', categoryName: '혼밥·식재료 관리', keywords: ['식재료 보관', '냉장 보관'], tags: [] });
    const b = makePost({ slug: 'b', category: 'lifestyle', categoryName: '관계·고립·생활 리듬', keywords: ['식재료 보관'], tags: [] });
    // 카테고리 다름(0) + 클러스터 다름(0) + 키워드 겹침 1개(3) + 태그 겹침 0
    expect(computeRelevanceScore(a, b, clusterOf)).toBe(3);
  });
});

describe('computeFactCheckFlag', () => {
  it('안전 카테고리 글에서 금액 표현을 발견하면 플래그를 켠다', () => {
    const post = makePost({ category: 'safety', content: '출장비는 보통 50000원 정도입니다.' });
    const result = computeFactCheckFlag(post);
    expect(result.flagged).toBe(true);
    expect(result.matches.some(m => m.pattern === '금액')).toBe(true);
  });

  it('안전·비용·주거가 아닌 카테고리는 검사하지 않는다', () => {
    const post = makePost({ category: 'lifestyle', content: '비용은 50000원입니다.' });
    expect(computeFactCheckFlag(post).flagged).toBe(false);
  });

  it('민감 카테고리라도 매칭되는 패턴이 없으면 플래그가 꺼져 있다', () => {
    const post = makePost({ category: 'cost', content: '특별한 수치나 법령 언급이 없는 본문입니다.' });
    expect(computeFactCheckFlag(post).flagged).toBe(false);
  });
});

describe('computeSeoPriority', () => {
  it('제목 수정이 필요 없고 키워드가 있고 중복 위험이 없는 글이 그 반대보다 우선순위가 높다', () => {
    const good = computeSeoPriority({
      titleNeedsFix: false,
      hasPrimaryKeyword: true,
      contentLength: 4000,
      clusterPostCount: 12,
      isDuplicateCandidate: false,
      internalLinkCount: 0,
    });
    const bad = computeSeoPriority({
      titleNeedsFix: true,
      hasPrimaryKeyword: false,
      contentLength: 500,
      clusterPostCount: 1,
      isDuplicateCandidate: true,
      internalLinkCount: 0,
    });
    expect(good).toBeGreaterThan(bad);
  });

  it('0~100 범위 안의 값을 반환한다', () => {
    const score = computeSeoPriority({
      titleNeedsFix: false,
      hasPrimaryKeyword: true,
      contentLength: 2000,
      clusterPostCount: 5,
      isDuplicateCandidate: false,
      internalLinkCount: 0,
    });
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});
