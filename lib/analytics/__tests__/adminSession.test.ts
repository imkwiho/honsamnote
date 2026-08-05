import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  sha256Hex,
  createSessionToken,
  verifySessionToken,
  parseCookieHeader,
  buildSessionCookie,
  buildClearSessionCookie,
  SESSION_COOKIE_NAME,
} from '../adminSession';

const SECRET = 'test-admin-auth-hash-value';

describe('sha256Hex', () => {
  it('같은 입력은 항상 같은 해시를 만든다', async () => {
    const a = await sha256Hex('hello');
    const b = await sha256Hex('hello');
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it('입력이 다르면 해시도 다르다', async () => {
    const a = await sha256Hex('password1');
    const b = await sha256Hex('password2');
    expect(a).not.toBe(b);
  });
});

describe('createSessionToken / verifySessionToken', () => {
  it('정상 발급한 토큰은 검증을 통과한다', async () => {
    const token = await createSessionToken(SECRET);
    expect(await verifySessionToken(token, SECRET)).toBe(true);
  });

  it('다른 시크릿으로 서명 검증하면 실패한다(위조 방지)', async () => {
    const token = await createSessionToken(SECRET);
    expect(await verifySessionToken(token, 'wrong-secret')).toBe(false);
  });

  it('토큰을 조작하면(payload 변조) 검증에 실패한다', async () => {
    const token = await createSessionToken(SECRET);
    const [, sig] = token.split('.');
    const tampered = `${btoa(JSON.stringify({ exp: Date.now() + 999999999 }))}.${sig}`;
    expect(await verifySessionToken(tampered, SECRET)).toBe(false);
  });

  it('만료된 토큰은 검증에 실패한다', async () => {
    vi.useFakeTimers();
    try {
      const token = await createSessionToken(SECRET, 1000); // 1초짜리
      vi.advanceTimersByTime(2000);
      expect(await verifySessionToken(token, SECRET)).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('빈 토큰/시크릿은 항상 실패한다', async () => {
    expect(await verifySessionToken(null, SECRET)).toBe(false);
    expect(await verifySessionToken('abc.def', '')).toBe(false);
  });

  it('형식이 잘못된 토큰은 실패한다', async () => {
    expect(await verifySessionToken('not-a-valid-token', SECRET)).toBe(false);
    expect(await verifySessionToken('a.b.c', SECRET)).toBe(false);
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('parseCookieHeader', () => {
  it('여러 쿠키를 파싱한다', () => {
    const result = parseCookieHeader('a=1; b=2; honsamnote_admin_session=abc.def');
    expect(result).toEqual({ a: '1', b: '2', honsamnote_admin_session: 'abc.def' });
  });

  it('빈 헤더는 빈 객체를 반환한다', () => {
    expect(parseCookieHeader(null)).toEqual({});
    expect(parseCookieHeader(undefined)).toEqual({});
    expect(parseCookieHeader('')).toEqual({});
  });

  it('URL 인코딩된 값을 디코딩한다', () => {
    const result = parseCookieHeader(`${SESSION_COOKIE_NAME}=${encodeURIComponent('a.b+c')}`);
    expect(result[SESSION_COOKIE_NAME]).toBe('a.b+c');
  });
});

describe('buildSessionCookie / buildClearSessionCookie', () => {
  it('HttpOnly, Secure, SameSite=Strict 속성을 포함한다', () => {
    const cookie = buildSessionCookie('sometoken', 3600);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=Strict');
    expect(cookie).toContain('Max-Age=3600');
    expect(cookie).toContain(SESSION_COOKIE_NAME);
  });

  it('로그아웃 쿠키는 Max-Age=0으로 즉시 만료시킨다', () => {
    expect(buildClearSessionCookie()).toContain('Max-Age=0');
  });
});
