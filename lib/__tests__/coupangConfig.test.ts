import { describe, it, expect } from 'vitest';
import { getMaxSlotsForLength, coupangAdSettings } from '../../config/coupangAds';
import {
  isValidWidgetId,
  isValidTrackingCode,
  isValidCarouselWidth,
  isValidCarouselHeight,
  validateCoupangWidgetConfig,
} from '../coupangValidation';

describe('getMaxSlotsForLength', () => {
  it('1,200자 미만은 최대 1개', () => {
    expect(getMaxSlotsForLength(500)).toBe(1);
    expect(getMaxSlotsForLength(1199)).toBe(1);
  });

  it('1,200~2,500자는 최대 2개', () => {
    expect(getMaxSlotsForLength(1200)).toBe(2);
    expect(getMaxSlotsForLength(2499)).toBe(2);
  });

  it('2,500~4,500자는 최대 3개', () => {
    expect(getMaxSlotsForLength(2500)).toBe(3);
    expect(getMaxSlotsForLength(4499)).toBe(3);
  });

  it('4,500자 이상은 최대 4개', () => {
    expect(getMaxSlotsForLength(4500)).toBe(4);
    expect(getMaxSlotsForLength(50000)).toBe(4);
  });

  it('maxAdsPerPost 설정값을 넘지 않는다', () => {
    expect(getMaxSlotsForLength(50000)).toBeLessThanOrEqual(coupangAdSettings.maxAdsPerPost);
  });
});

describe('coupang widget config validators', () => {
  it('현재 설정값(992222 / AF1634685)은 유효하다', () => {
    expect(isValidWidgetId(coupangAdSettings.widgetId)).toBe(true);
    expect(isValidTrackingCode(coupangAdSettings.trackingCode)).toBe(true);
    expect(isValidCarouselWidth(coupangAdSettings.width)).toBe(true);
    expect(isValidCarouselHeight(coupangAdSettings.height)).toBe(true);
  });

  it('잘못된 widgetId를 거부한다', () => {
    expect(isValidWidgetId(0)).toBe(false);
    expect(isValidWidgetId(-1)).toBe(false);
    expect(isValidWidgetId('992222')).toBe(false);
    expect(isValidWidgetId(1.5)).toBe(false);
  });

  it('잘못된 trackingCode를 거부한다', () => {
    expect(isValidTrackingCode('1634685')).toBe(false);
    expect(isValidTrackingCode('')).toBe(false);
    expect(isValidTrackingCode(123)).toBe(false);
  });

  it('validateCoupangWidgetConfig는 문제가 없으면 빈 배열을 반환한다', () => {
    expect(validateCoupangWidgetConfig(coupangAdSettings)).toEqual([]);
  });

  it('validateCoupangWidgetConfig는 문제를 모두 나열한다', () => {
    const errors = validateCoupangWidgetConfig({ widgetId: -1, trackingCode: 'bad', width: 9999, height: -1 });
    expect(errors.length).toBe(4);
  });
});
