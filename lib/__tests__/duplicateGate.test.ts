import { describe, it, expect } from 'vitest';
import { type AuditPost } from '../seoAudit';
import { checkForDuplicate } from '../duplicateGate';

function makePost(overrides: Partial<AuditPost>): AuditPost {
  return {
    slug: 'test-slug',
    title: '테스트 제목',
    description: '설명',
    date: '2026-08-01',
    tags: [],
    keywords: [],
    category: 'safety',
    categoryName: '안전·응급상황',
    content: '',
    ...overrides,
  };
}

describe('checkForDuplicate', () => {
  it('실제 사례: 문체는 다르지만 같은 클러스터+키워드가 겹치는 새 글은 차단한다', () => {
    // 1단계에서 발견된 실제 통합 후보 사례(바퀴벌레 글들)와 동일한 패턴.
    const existing = [
      makePost({
        slug: 'existing-1',
        title: '주방이나 거실에 바퀴벌레가 갑자기 보일 때 대처법',
        keywords: ['바퀴벌레', '바퀴벌레 퇴치', '해충 방역'],
      }),
    ];
    const newPost = makePost({
      slug: 'new-draft',
      title: '갑자기 집에 바퀴벌레가 출몰했을 때 퇴치하는 법',
      keywords: ['바퀴벌레', '바퀴벌레 퇴치', '해충 방역'],
    });
    const result = checkForDuplicate(newPost, existing);
    expect(result.blocked).toBe(true);
    expect(result.closestExisting[0].slug).toBe('existing-1');
  });

  it('전혀 다른 주제의 새 글은 차단하지 않는다', () => {
    const existing = [makePost({ slug: 'existing-1', title: '보증금 반환 절차', keywords: ['보증금'], category: 'housing', categoryName: '주거·계약·이사' })];
    const newPost = makePost({ slug: 'new-draft', title: '냉장고 냄새 제거법', keywords: ['냉장고 냄새'], category: 'cleaning', categoryName: '청소·세탁·집안일' });
    const result = checkForDuplicate(newPost, existing);
    expect(result.blocked).toBe(false);
    expect(result.closestExisting).toHaveLength(0);
  });

  it('가장 유사도가 높은 기존 글이 closestExisting 맨 앞에 온다', () => {
    const existing = [
      makePost({ slug: 'weak-match', title: '전기세 절약하는 법', keywords: ['전기세 절약'], category: 'cost', categoryName: '생활비 최적화' }),
      makePost({ slug: 'strong-match', title: '전기요금 절약 꿀팁', keywords: ['전기요금 절약', '전기세 절약'], category: 'cost', categoryName: '생활비 최적화' }),
    ];
    const newPost = makePost({ slug: 'new-draft', title: '전기요금 아끼는 방법', keywords: ['전기요금 절약', '전기세 절약'], category: 'cost', categoryName: '생활비 최적화' });
    const result = checkForDuplicate(newPost, existing);
    if (result.closestExisting.length > 1) {
      expect(result.closestExisting[0].similarity).toBeGreaterThanOrEqual(result.closestExisting[1].similarity);
    }
  });

  it('기존 글이 아예 없으면 절대 차단하지 않는다', () => {
    const newPost = makePost({ slug: 'new-draft' });
    const result = checkForDuplicate(newPost, []);
    expect(result.blocked).toBe(false);
  });
});
