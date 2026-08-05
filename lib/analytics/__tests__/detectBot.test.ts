import { describe, it, expect } from 'vitest';
import { isBot } from '../detectBot';

describe('isBot', () => {
  it('알려진 검색엔진/자동화 봇 UA를 감지한다', () => {
    expect(isBot('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')).toBe(true);
    expect(isBot('Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)')).toBe(true);
    expect(isBot('Mozilla/5.0 (compatible; Yeti/1.1; +http://naver.me/spd)')).toBe(true);
    expect(isBot('Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 HeadlessChrome/120.0.0.0 Safari/537.36')).toBe(true);
    expect(isBot('Mozilla/5.0 (compatible; Lighthouse)')).toBe(true);
    expect(isBot('facebookexternalhit/1.1')).toBe(true);
  });

  it('일반 브라우저 UA는 봇으로 판정하지 않는다', () => {
    expect(isBot('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1')).toBe(false);
    expect(isBot('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')).toBe(false);
  });

  it('"bot"이 포함된 일반 단어는 오탐하지 않는다', () => {
    // "Bothell"처럼 bot을 단어 경계 없이 포함하는 문자열은 매칭되면 안 된다.
    expect(isBot('Mozilla/5.0 (Bothell, WA) SomeBrowser/1.0')).toBe(false);
  });

  it('UA가 없으면 봇으로 단정하지 않는다', () => {
    expect(isBot(null)).toBe(false);
    expect(isBot(undefined)).toBe(false);
    expect(isBot('')).toBe(false);
  });
});
