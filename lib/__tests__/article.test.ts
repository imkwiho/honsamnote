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

// getMaxSlotsForLength가 3슬롯을 허용하는 2,500자 이상이 되도록 문단을 늘린
// 샘플. 소제목 8개로 구성해 자동 분산 배치 테스트에 쓴다.
const FILLER = '이 문단은 글자 수를 충분히 채우기 위한 예시 설명 문장입니다. '.repeat(20);
const LONG_SAMPLE = [
  '## 문제 상황', FILLER,
  '## 먼저 확인할 결론', FILLER,
  '## 원인과 판단 기준', FILLER,
  '## 해결 순서', FILLER,
  '## 비용·시간·주의사항', FILLER,
  '## 이렇게 하면 오히려 악화됩니다', FILLER,
  '## 자주 하는 실수', FILLER,
  '## 체크리스트', FILLER,
].join('\n\n');

describe('processArticleBody', () => {
  it('affiliateAdsEnabled가 없으면(기본값 false) 소제목이 있어도 삽입하지 않는다', () => {
    const result = processArticleBody(SAMPLE, { affiliateSlotAfterHeadings: ['해결 순서'] });
    expect(result.affiliateSlotsPlaced).toBe(0);
    expect(result.mdx).not.toContain('<CoupangPartnersCarousel');
  });

  it('일치하는 소제목 뒤에 캐러셀 태그를 삽입하고 배치 개수를 반환한다', () => {
    const result = processArticleBody(SAMPLE, {
      affiliateAdsEnabled: true,
      affiliateSlotAfterHeadings: ['해결 순서'],
    });
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
      affiliateAdsEnabled: true,
      affiliateSlotAfterHeadings: ['문제 상황', '해결 순서'],
      affiliateSlotTitles: ['첫 번째 제목', '두 번째 제목'],
    });
    expect(result.affiliateSlotsPlaced).toBe(2);
    expect((result.mdx.match(/<CoupangPartnersCarousel/g) ?? []).length).toBe(2);
    expect(result.mdx).toContain('aiTitle="첫 번째 제목"');
    expect(result.mdx).toContain('aiTitle="두 번째 제목"');
  });

  it('지정한 소제목이 실제 글에 없어도 광고가 켜져 있으면 자동으로 분산 배치한다', () => {
    const result = processArticleBody(SAMPLE, {
      affiliateAdsEnabled: true,
      affiliateSlotAfterHeadings: ['존재하지-않는-소제목'],
    });
    // SAMPLE은 1,200자 미만이라 길이 상한(getMaxSlotsForLength)이 1개로 제한한다.
    expect(result.affiliateSlotsPlaced).toBe(1);
    expect(result.mdx).toContain('<CoupangPartnersCarousel');
  });

  it('AI 매칭 소제목이 전혀 없어도 광고가 켜져 있으면 최대 3개까지 글 전체에 고르게 배치한다', () => {
    const result = processArticleBody(LONG_SAMPLE, { affiliateAdsEnabled: true });
    expect(result.affiliateSlotsPlaced).toBe(3);
    expect((result.mdx.match(/<CoupangPartnersCarousel/g) ?? []).length).toBe(3);

    // 첫 섹션(문제 상황) 바로 뒤와 마지막 섹션(체크리스트) 뒤에는 넣지 않는다.
    const firstCarousel = result.mdx.indexOf('<CoupangPartnersCarousel');
    const lastCarousel = result.mdx.lastIndexOf('<CoupangPartnersCarousel');
    const problemHeading = result.mdx.indexOf('문제 상황');
    const secondHeadingStart = result.mdx.indexOf('먼저 확인할 결론');
    const checklistHeading = result.mdx.indexOf('체크리스트');
    expect(firstCarousel).toBeGreaterThan(problemHeading);
    // 첫 캐러셀은 두 번째 섹션 제목이 나온 이후여야 한다(도입부 바로 뒤 배치 금지).
    expect(firstCarousel).toBeGreaterThan(secondHeadingStart);
    expect(lastCarousel).toBeLessThan(checklistHeading);
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
