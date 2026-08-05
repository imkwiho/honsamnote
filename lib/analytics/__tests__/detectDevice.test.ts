import { describe, it, expect } from 'vitest';
import { detectDeviceType } from '../detectDevice';

describe('detectDeviceType', () => {
  it('iPhone/Android 모바일을 mobile로 분류한다', () => {
    expect(detectDeviceType('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15')).toBe('mobile');
    expect(detectDeviceType('Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 Mobile Safari/537.36')).toBe('mobile');
  });

  it('iPad를 tablet으로 분류한다', () => {
    expect(detectDeviceType('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15')).toBe('tablet');
  });

  it('데스크톱 Chrome/Windows를 desktop으로 분류한다', () => {
    expect(detectDeviceType('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36')).toBe('desktop');
  });

  it('UA가 없으면 desktop으로 기본 처리한다', () => {
    expect(detectDeviceType(null)).toBe('desktop');
    expect(detectDeviceType(undefined)).toBe('desktop');
  });
});
