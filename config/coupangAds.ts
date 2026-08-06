import { assertValidCoupangWidgetConfig } from '../lib/coupangValidation';

// 쿠팡 파트너스 광고 설정. id/trackingCode는 운영자의 실제 식별값이므로 변경하지 말 것.
export const coupangAdSettings = {
  enabled: true,
  postBottomEnabled: true,
  postMiddleEnabled: true,
  homeEnabled: false,
  categoryPageEnabled: false,
  newsletterEnabled: false,
  maxAdsPerPost: 4,
  widgetId: 992222,
  trackingCode: 'AF1634685',
  template: 'carousel',
  width: 680,
  height: 140,
} as const;

// 본문 길이에 따른 광고 슬롯 개수 상한. AI가 이보다 많이 추천해도 여기서 잘라낸다.
export const SLOT_COUNT_BY_LENGTH: { maxLength: number; maxSlots: number }[] = [
  { maxLength: 1200, maxSlots: 1 },
  { maxLength: 2500, maxSlots: 2 },
  { maxLength: 4500, maxSlots: 3 },
  { maxLength: Infinity, maxSlots: 4 },
];

export function getMaxSlotsForLength(contentLength: number): number {
  const rule = SLOT_COUNT_BY_LENGTH.find(r => contentLength < r.maxLength);
  return Math.min(rule?.maxSlots ?? 1, coupangAdSettings.maxAdsPerPost);
}

assertValidCoupangWidgetConfig(coupangAdSettings);

export type CoupangAdSettings = typeof coupangAdSettings;
