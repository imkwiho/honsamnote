import { describe, it, expect } from 'vitest';
import { processArticleBody } from '../article';

const SAMPLE = `## 문제 상황
문제 설명입니다.

## 먼저 확인할 결론
결론입니다.

## 원인과 판단 기준
원인 설명입니다.

## 해결 순서
1. 첫 단계
2. 둘째 단계

## 체크리스트
- [ ] 첫 항목
- [ ] 둘째 항목`;

describe('processArticleBody', () => {
  it('일치하는 소제목 뒤에 캐러셀 태그를 삽입하고 배치 개수를 반환한다', () => {
    const result = processArticleBody(SAMPLE, { affiliateSlotAfterHeadings: ['해결 순서'] });
    expect(result.affiliateSlotsPlaced).toBe(1);
    expect(result.mdx).toContain('<CoupangPartnersCarousel');
    // 해결 순서 섹션 다음, 체크리스트 섹션 이전에 삽입되어야 한다.
    const carouselIndex = result.mdx.indexOf('<CoupangPartnersCarousel');
    const checklistIndex = result.mdx.indexOf('체크리스트');
    expect(carouselIndex).toBeGreaterThan(-1);
    expect(carouselIndex).toBeLessThan(checklistIndex);
  });

  it('여러 소제목을 지정하면 여러 개를 각자 다른 위치에 삽입한다', () => {
    const result = processArticleBody(SAMPLE, {
      affiliateSlotAfterHeadings: ['문제 상황', '해결 순서'],
      affiliateSlotTitles: ['첫 번째 제목', '두 번째 제목'],
    });
    expect(result.affiliateSlotsPlaced).toBe(2);
    expect((result.mdx.match(/<CoupangPartnersCarousel/g) ?? []).length).toBe(2);
    expect(result.mdx).toContain('aiTitle="첫 번째 제목"');
    expect(result.mdx).toContain('aiTitle="두 번째 제목"');
  });

  it('일치하는 소제목이 없으면 삽입하지 않는다', () => {
    const result = processArticleBody(SAMPLE, { affiliateSlotAfterHeadings: ['존재하지-않는-소제목'] });
    expect(result.affiliateSlotsPlaced).toBe(0);
    expect(result.mdx).not.toContain('<CoupangPartnersCarousel');
  });

  it('affiliateSlotAfterHeadings이 없으면 삽입하지 않는다', () => {
    const result = processArticleBody(SAMPLE);
    expect(result.affiliateSlotsPlaced).toBe(0);
  });

  it('결론/체크리스트/악화 섹션은 강조 박스로 감싼다', () => {
    const result = processArticleBody(SAMPLE);
    expect(result.mdx).toContain('<SummaryBox');
    expect(result.mdx).toContain('<ChecklistBox');
  });

  it('작업 목록 마커([ ])를 제거한다', () => {
    const result = processArticleBody(SAMPLE);
    expect(result.mdx).not.toContain('[ ]');
  });

  it('목차는 소제목 개수만큼 생성된다', () => {
    const result = processArticleBody(SAMPLE);
    expect(result.toc).toHaveLength(5);
  });
});
