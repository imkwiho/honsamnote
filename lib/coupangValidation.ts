// 쿠팡 위젯 설정값이 올바른 형식인지 검증한다. 앞으로 위젯 ID를 바꾸거나
// 새 위젯을 추가할 때 잘못된 값이 조용히 배포되는 것을 막기 위한 안전장치.

export function isValidWidgetId(id: unknown): id is number {
  return typeof id === 'number' && Number.isInteger(id) && id > 0;
}

// 쿠팡 파트너스 trackingCode는 "AF" + 영숫자로 구성된다.
export function isValidTrackingCode(code: unknown): code is string {
  return typeof code === 'string' && /^AF[0-9A-Za-z]+$/.test(code);
}

export function isValidCarouselWidth(width: unknown): width is number {
  return typeof width === 'number' && width > 0 && width <= 680;
}

export function isValidCarouselHeight(height: unknown): height is number {
  return typeof height === 'number' && height > 0 && height <= 400;
}

export interface CoupangWidgetConfig {
  widgetId: unknown;
  trackingCode: unknown;
  width: unknown;
  height: unknown;
}

// 하나라도 형식이 틀리면 에러 메시지 목록을 반환한다 (문제 없으면 빈 배열).
export function validateCoupangWidgetConfig(config: CoupangWidgetConfig): string[] {
  const errors: string[] = [];
  if (!isValidWidgetId(config.widgetId)) errors.push(`widgetId가 올바르지 않습니다: ${String(config.widgetId)}`);
  if (!isValidTrackingCode(config.trackingCode)) errors.push(`trackingCode 형식이 올바르지 않습니다: ${String(config.trackingCode)}`);
  if (!isValidCarouselWidth(config.width)) errors.push(`width가 올바르지 않습니다: ${String(config.width)}`);
  if (!isValidCarouselHeight(config.height)) errors.push(`height가 올바르지 않습니다: ${String(config.height)}`);
  return errors;
}

// 설정 파일 로드 시 즉시 검증한다. 잘못된 값이면 빌드 시점에 바로 실패해서
// 잘못 배포되는 것을 막는다 (하드코딩된 상수라 런타임 사용자 입력이 아님).
export function assertValidCoupangWidgetConfig(config: CoupangWidgetConfig): void {
  const errors = validateCoupangWidgetConfig(config);
  if (errors.length > 0) {
    throw new Error(`쿠팡 위젯 설정이 올바르지 않습니다:\n${errors.join('\n')}`);
  }
}
