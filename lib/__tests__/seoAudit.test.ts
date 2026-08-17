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
  primaryKeyword,
  secondaryKeywords,
  suggestTitle,
  suggestDescription,
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

  it('제목 앞부분의 수사적 "?"보다 뒷부분의 구체적인 신호(방법/비교 등)를 우선한다', () => {
    // 실제 사례: "냉장고에서 쉰내 폭발? 1인 가구 냉장고 냄새, 빠르게 잡고
    // 예방하는 법" — "?"만 보면 질문형이지만 진짜 의도는 방법형.
    expect(detectSearchIntent(makePost({ title: '냉장고에서 쉰내 폭발? 빠르게 잡고 예방하는 법' }))).toBe('방법형');
    // "?"와 "vs"가 함께 있으면 비교형이 이겨야 한다.
    expect(detectSearchIntent(makePost({ title: '설거지 쌓인다면? 식기세척기 vs 손 설거지, 현명한 선택 기준' }))).toBe('비교형');
  });

  it('구체적인 신호가 전혀 없는 순수 질문형 제목은 여전히 질문형으로 판단한다', () => {
    expect(detectSearchIntent(makePost({ title: '싹 난 감자 먹어도 될까?' }))).toBe('질문형');
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
  // 2단계 내부링크 시스템에서 실제로 쓰는 가중치: sameCluster/primaryKeyword
  // 일치가 가장 높고, category 일치는 절대 핵심 기준이 되면 안 되므로 항상
  // 최하위(1점)다.
  const clusterOf = (p: AuditPost) => classifyCluster(p).clusterSlug;

  it('같은 클러스터면(클러스터 가중치 6) 다른 클러스터보다 항상 높다', () => {
    const a = makePost({ slug: 'a', category: 'cleaning', keywords: ['욕실 곰팡이'], tags: [] });
    const b = makePost({ slug: 'b', category: 'cleaning', keywords: ['욕실 곰팡이'], tags: [] });
    const c = makePost({ slug: 'c', category: 'cleaning', keywords: ['세탁기 냄새'], tags: [] });
    expect(computeRelevanceScore(a, b, clusterOf)).toBeGreaterThan(computeRelevanceScore(a, c, clusterOf));
  });

  it('키워드/태그/카테고리가 전혀 겹치지 않고 클러스터도 다르면 0점이다', () => {
    const a = makePost({ slug: 'a', category: 'cleaning', keywords: ['욕실 곰팡이'], tags: ['청소'] });
    const b = makePost({ slug: 'b', category: 'food', categoryName: '혼밥·식재료 관리', keywords: ['식재료 보관'], tags: ['요리'] });
    expect(computeRelevanceScore(a, b, clusterOf)).toBe(0);
  });

  it('대표 키워드(primaryKeyword)가 완전히 같으면 keyword overlap과 별도로 높은 가중치(5)를 더한다', () => {
    const a = makePost({ slug: 'a', category: 'food', categoryName: '혼밥·식재료 관리', keywords: ['식재료 보관', '냉장 보관'], tags: [] });
    const b = makePost({ slug: 'b', category: 'lifestyle', categoryName: '관계·고립·생활 리듬', keywords: ['식재료 보관'], tags: [] });
    // 카테고리 다름(0) + 클러스터 다름(0) + primaryKeyword 일치(5) + keyword 겹침 1개(2) + 태그 겹침(0)
    expect(computeRelevanceScore(a, b, clusterOf)).toBe(7);
  });

  it('category 단독 일치는 항상 최하위 가중치(1)만 준다 — 핵심 판단 기준이 되면 안 됨', () => {
    const a = makePost({ slug: 'a', category: 'cleaning', keywords: ['전혀 다른 키워드1'], tags: [] });
    const b = makePost({ slug: 'b', category: 'cleaning', keywords: ['전혀 다른 키워드2'], tags: [] });
    expect(computeRelevanceScore(a, b, clusterOf)).toBe(1);
  });

  it('"1인 가구"처럼 범용적인 keyword가 겹치는 것만으로는 점수를 주지 않는다', () => {
    const a = makePost({ slug: 'a', category: 'cleaning', keywords: ['1인 가구', '욕실 곰팡이'], tags: [] });
    const b = makePost({ slug: 'b', category: 'cleaning', keywords: ['1인 가구', '세탁기 냄새'], tags: [] });
    // 클러스터 다름(bathroom-cleaning vs laundry-clothing, 0) + category 일치(1) + "1인 가구"는 GENERIC_PHRASES라 0
    expect(computeRelevanceScore(a, b, clusterOf)).toBe(1);
  });

  it('카테고리 내에서 흔한 keyword(commonTerms)로 전달된 것도 겹침 점수에서 제외한다', () => {
    const a = makePost({ slug: 'a', category: 'cost', keywords: ['생활비 절약', '전기세 절약'], tags: [] });
    const b = makePost({ slug: 'b', category: 'cost', keywords: ['생활비 절약', '가스비 절약'], tags: [] });
    const commonTerms = new Set(['생활비 절약']);
    const withoutFilter = computeRelevanceScore(a, b, clusterOf);
    const withFilter = computeRelevanceScore(a, b, clusterOf, commonTerms);
    expect(withFilter).toBeLessThan(withoutFilter);
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

describe('primaryKeyword / secondaryKeywords', () => {
  it('범용 표현("혼자 사는 직장인" 등)이 keywords 맨 앞에 있어도 건너뛰고 구체적인 키워드를 고른다', () => {
    // 실제 버그 사례: "주말 무기력증 탈출" 글의 keywords[0]가 "혼자 사는
    // 직장인"이라, 필터링 없이 그대로 쓰면 제목 생성 결과가 "혼자 사는
    // 직장인 해결 방법"처럼 원래 없애려던 상투어를 되살렸다.
    const post = makePost({ keywords: ['혼자 사는 직장인', '주말 무기력증', '생활 루틴'] });
    expect(primaryKeyword(post)).toBe('주말 무기력증');
  });

  it('keywords가 전부 범용 표현뿐이면 그래도 첫 번째를 반환한다(없는 것보다는 나음)', () => {
    const post = makePost({ keywords: ['1인 가구', '혼자 사는'] });
    expect(primaryKeyword(post)).toBe('1인 가구');
  });

  it('keywords가 비어 있으면 tags에서 범용 표현을 건너뛰고 고른다', () => {
    const post = makePost({ keywords: [], tags: ['1인 가구', '전자레인지 청소'] });
    expect(primaryKeyword(post)).toBe('전자레인지 청소');
  });

  it('secondaryKeywords는 primaryKeyword로 선택된 항목을 제외한 나머지를 반환한다', () => {
    const post = makePost({ keywords: ['혼자 사는 직장인', '주말 무기력증', '생활 루틴'] });
    expect(secondaryKeywords(post)).toEqual(['혼자 사는 직장인', '생활 루틴']);
  });
});

describe('suggestTitle', () => {
  it('상투적 도입부를 제거하고 대표 키워드를 앞으로 당긴다', () => {
    const post = makePost({ title: '혼자 사는 당신, 전자레인지 냄새 때문에 고민이라면?', keywords: ['전자레인지 냄새'] });
    expect(suggestTitle(post)).toMatch(/^전자레인지 냄새/);
  });

  it('범용 표현이 대표 키워드로 선택되지 않아, 상투어가 제목에 다시 나타나지 않는다', () => {
    const post = makePost({
      title: '혼자 사는 직장인, 주말 무기력증 탈출! 나만의 루틴 만드는 법',
      keywords: ['혼자 사는 직장인', '주말 무기력증'],
    });
    expect(suggestTitle(post)).not.toContain('혼자 사는 직장인');
    expect(suggestTitle(post)).toContain('주말 무기력증');
  });

  it('｜ 뒤에는 카테고리명 대신 구체적인 보조 키워드를 쓴다(범용 표현이면 생략)', () => {
    const post = makePost({
      title: '식기세척기 관련 글',
      keywords: ['미니 식기세척기', '설거지 시간 절약'],
      categoryName: '1인 가구 제품·서비스',
    });
    const result = suggestTitle(post);
    expect(result).not.toContain('1인 가구 제품·서비스');
    expect(result).toContain('설거지 시간 절약');
  });

  it('보조 키워드가 범용 표현을 부분적으로라도 포함하면(예: "1인 가구 주방") 생략한다', () => {
    const post = makePost({ title: '식기세척기 글', keywords: ['미니 식기세척기', '1인 가구 주방'] });
    const result = suggestTitle(post);
    expect(result).not.toContain('｜');
  });
});

describe('suggestDescription', () => {
  it('"결론" 섹션의 첫 문장을 meta description으로 뽑아온다', () => {
    const post = makePost({
      description: '원래 설명',
      content: '## 문제 상황\n본문\n\n## 결론\n에어컨 필터 청소는 직접 해도 충분합니다. 나머지 내용은 생략.\n\n## 체크리스트\n항목',
    });
    expect(suggestDescription(post)).toBe('에어컨 필터 청소는 직접 해도 충분합니다.');
  });

  it('실제 버그 재현: 추출한 문장의 마크다운 서식(**굵게** 등)을 제거한다', () => {
    // 실제 사례: "에어컨 필터 청소는 대부분의 1인 가구가 **직접 해도
    // 충분**합니다." — 별표가 그대로 meta description에 노출되던 문제.
    const post = makePost({
      content: '## 결론\n에어컨 필터 청소는 대부분의 1인 가구가 **직접 해도 충분**합니다. 나머지.',
    });
    const result = suggestDescription(post);
    expect(result).not.toContain('*');
    expect(result).toBe('에어컨 필터 청소는 대부분의 1인 가구가 직접 해도 충분합니다.');
  });

  it('`코드`, [링크](url), ~~취소선~~ 서식도 전부 제거한다', () => {
    const post = makePost({
      content: '## 결론\n`코드` 표현과 [링크](https://example.com)와 ~~취소선~~이 섞인 문장입니다.',
    });
    const result = suggestDescription(post);
    expect(result).toBe('코드 표현과 링크와 취소선이 섞인 문장입니다.');
  });

  it('"결론" 섹션이 없으면 원래 description을 그대로 쓴다', () => {
    const post = makePost({ description: '원래 설명입니다.', content: '## 문제 상황\n본문만 있음' });
    expect(suggestDescription(post)).toBe('원래 설명입니다.');
  });

  it('155자를 넘으면 잘라내고 말줄임표를 붙인다', () => {
    const post = makePost({ description: '가'.repeat(200) });
    const result = suggestDescription(post);
    expect(result.length).toBeLessThanOrEqual(155);
    expect(result.endsWith('…')).toBe(true);
  });

  it('보조 키워드가 없으면 ｜ 구분자를 억지로 채우지 않는다', () => {
    const post = makePost({ title: '전자레인지 냄새 글', keywords: ['전자레인지 냄새'] });
    expect(suggestTitle(post)).not.toContain('｜');
  });
});
