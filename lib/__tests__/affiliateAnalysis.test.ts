import { describe, it, expect } from 'vitest';
import { shouldShowAffiliateAd, MIN_RECOMMENDATION_CONFIDENCE } from '../affiliateAnalysis';

describe('shouldShowAffiliateAd', () => {
  it('AI 분석 데이터가 없는 기존 글은 항상 표시한다', () => {
    expect(shouldShowAffiliateAd({})).toBe(true);
  });

  it('shouldInsertAds가 false면 신뢰도와 무관하게 숨긴다', () => {
    expect(shouldShowAffiliateAd({ shouldInsertAds: false, confidence: 0.99 })).toBe(false);
  });

  it('신뢰도가 임계값 미만이면 숨긴다', () => {
    expect(shouldShowAffiliateAd({ shouldInsertAds: true, confidence: MIN_RECOMMENDATION_CONFIDENCE - 0.01 })).toBe(false);
  });

  it('신뢰도가 임계값 이상이면 표시한다', () => {
    expect(shouldShowAffiliateAd({ shouldInsertAds: true, confidence: MIN_RECOMMENDATION_CONFIDENCE })).toBe(true);
  });

  it('shouldInsertAds만 true이고 신뢰도가 없으면 표시한다', () => {
    expect(shouldShowAffiliateAd({ shouldInsertAds: true })).toBe(true);
  });
});
