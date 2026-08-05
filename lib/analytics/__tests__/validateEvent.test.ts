import { describe, it, expect } from 'vitest';
import { validateTrackPayload, validateHeartbeatPayload, isExcludedPath } from '../validateEvent';

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000';
const VALID_UUID_2 = '223e4567-e89b-12d3-a456-426614174000';

describe('validateTrackPayload', () => {
  it('정상 payload를 그대로 반환한다', () => {
    const result = validateTrackPayload({
      visitorId: VALID_UUID,
      sessionId: VALID_UUID_2,
      pathname: '/blog/some-post/',
      category: 'cost',
      contentType: 'post',
    });
    expect(result).toMatchObject({ visitorId: VALID_UUID, sessionId: VALID_UUID_2, pathname: '/blog/some-post/', category: 'cost' });
  });

  it('visitorId/sessionId가 없으면 null', () => {
    expect(validateTrackPayload({ pathname: '/blog/x/' })).toBeNull();
  });

  it('pathname이 /로 시작하지 않으면 null', () => {
    expect(validateTrackPayload({ visitorId: VALID_UUID, sessionId: VALID_UUID_2, pathname: 'blog/x' })).toBeNull();
  });

  it('body가 객체가 아니면 null', () => {
    expect(validateTrackPayload(null)).toBeNull();
    expect(validateTrackPayload('string')).toBeNull();
    expect(validateTrackPayload(undefined)).toBeNull();
  });

  it('지나치게 긴 문자열 필드는 무시(생략)한다', () => {
    const longText = 'a'.repeat(1000);
    const result = validateTrackPayload({
      visitorId: VALID_UUID,
      sessionId: VALID_UUID_2,
      pathname: '/blog/x/',
      pageTitle: longText,
    });
    expect(result?.pageTitle).toBeUndefined();
  });
});

describe('validateHeartbeatPayload', () => {
  it('정상 payload를 반환한다', () => {
    const result = validateHeartbeatPayload({ visitorId: VALID_UUID, sessionId: VALID_UUID_2, pathname: '/blog/x/' });
    expect(result).toEqual({ visitorId: VALID_UUID, sessionId: VALID_UUID_2, pathname: '/blog/x/' });
  });

  it('필수 필드 누락 시 null', () => {
    expect(validateHeartbeatPayload({ visitorId: VALID_UUID })).toBeNull();
  });
});

describe('isExcludedPath', () => {
  it('관리자 경로를 제외한다', () => {
    expect(isExcludedPath('/admin')).toBe(true);
    expect(isExcludedPath('/admin/dashboard')).toBe(true);
    expect(isExcludedPath('/admin/login')).toBe(true);
  });

  it('API 경로와 Next 정적 경로를 제외한다', () => {
    expect(isExcludedPath('/api/posts')).toBe(true);
    expect(isExcludedPath('/_next/static/chunk.js')).toBe(true);
  });

  it('정적 파일(css/js/이미지)을 제외한다', () => {
    expect(isExcludedPath('/favicon.ico')).toBe(true);
    expect(isExcludedPath('/robots.txt')).toBe(true);
    expect(isExcludedPath('/sitemap.xml')).toBe(true);
    expect(isExcludedPath('/styles/main.css')).toBe(true);
    expect(isExcludedPath('/images/photo.png')).toBe(true);
  });

  it('일반 블로그/카테고리 경로는 제외하지 않는다', () => {
    expect(isExcludedPath('/blog/some-post/')).toBe(false);
    expect(isExcludedPath('/category/cost/')).toBe(false);
    expect(isExcludedPath('/')).toBe(false);
  });
});
