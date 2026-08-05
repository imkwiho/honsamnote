import { describe, it, expect } from 'vitest';
import { classifyReferrer } from '../classifyReferrer';

const SITE = 'https://honsamnote.co.kr';

describe('classifyReferrer', () => {
  it('구글 검색', () => {
    expect(classifyReferrer('https://www.google.com/search?q=1인가구', SITE)).toBe('google');
    expect(classifyReferrer('https://www.google.co.kr/', SITE)).toBe('google');
  });

  it('네이버/다음/빙', () => {
    expect(classifyReferrer('https://search.naver.com/search.naver?query=원룸', SITE)).toBe('naver_daum_bing');
    expect(classifyReferrer('https://search.daum.net/search?w=tot', SITE)).toBe('naver_daum_bing');
    expect(classifyReferrer('https://www.bing.com/search?q=x', SITE)).toBe('naver_daum_bing');
  });

  it('카카오/카카오톡', () => {
    expect(classifyReferrer('https://talk.kakao.com/', SITE)).toBe('kakao');
    expect(classifyReferrer('https://www.kakao.com/', SITE)).toBe('kakao');
  });

  it('SNS', () => {
    expect(classifyReferrer('https://www.instagram.com/', SITE)).toBe('sns');
    expect(classifyReferrer('https://www.youtube.com/watch?v=x', SITE)).toBe('sns');
    expect(classifyReferrer('https://t.co/abc123', SITE)).toBe('sns');
  });

  it('직접 유입: referrer 없음', () => {
    expect(classifyReferrer(undefined, SITE)).toBe('direct');
    expect(classifyReferrer(null, SITE)).toBe('direct');
    expect(classifyReferrer('', SITE)).toBe('direct');
  });

  it('직접 유입: URL 형식이 아닌(앱에서 잘린) referrer', () => {
    expect(classifyReferrer('android-app://com.kakao.talk', SITE)).toBe('direct');
  });

  it('사이트 자기 자신으로의 이동은 직접 유입으로 취급한다', () => {
    expect(classifyReferrer('https://honsamnote.co.kr/blog/some-post/', SITE)).toBe('direct');
  });

  it('알 수 없는 외부 사이트는 기타로 분류한다', () => {
    expect(classifyReferrer('https://some-random-blog.example.com/', SITE)).toBe('other');
  });
});
