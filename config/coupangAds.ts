// 쿠팡 파트너스 광고 설정. id/trackingCode는 운영자의 실제 식별값이므로 변경하지 말 것.
export const coupangAdSettings = {
  enabled: true,
  postBottomEnabled: true,
  postMiddleEnabled: false,
  homeEnabled: false,
  categoryPageEnabled: false,
  newsletterEnabled: false,
  maxAdsPerPost: 1,
  widgetId: 992222,
  trackingCode: 'AF1634685',
  template: 'carousel',
  width: 680,
  height: 140,
} as const;

export type CoupangAdSettings = typeof coupangAdSettings;
