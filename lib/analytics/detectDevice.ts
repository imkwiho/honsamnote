export type DeviceType = 'mobile' | 'tablet' | 'desktop';

/**
 * User-Agent를 mobile/tablet/desktop 세 가지로만 분류한다. User-Agent
 * 원문 자체는 어디에도 저장하지 않고, 이 함수의 반환값만 저장한다.
 */
export function detectDeviceType(userAgent: string | null | undefined): DeviceType {
  if (!userAgent) return 'desktop';
  const ua = userAgent.toLowerCase();

  if (/ipad|tablet|nexus 7|nexus 9|nexus 10|kindle|playbook|silk/.test(ua) && !/mobile/.test(ua)) {
    return 'tablet';
  }
  // 안드로이드 태블릿은 UA에 "mobile"이 없는 경우가 많다.
  if (/android/.test(ua) && !/mobile/.test(ua)) {
    return 'tablet';
  }
  if (/mobi|iphone|ipod|android.*mobile|windows phone/.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
}
