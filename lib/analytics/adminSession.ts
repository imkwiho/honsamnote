// 관리자 로그인 세션. 비밀번호 자체나 그 해시를 클라이언트에 절대 두지 않고,
// 로그인 성공 시 서버(Cloudflare Pages Function)가 만료시각을 담은 토큰을
// HMAC-SHA256으로 서명해 HttpOnly 쿠키로 내려준다. 이후 모든 요청은 이
// 쿠키를 서버에서 검증한다 — 클라이언트 JS는 쿠키 값을 읽을 수도(HttpOnly),
// 위조할 수도 없다(서명 검증 실패).

export const SESSION_COOKIE_NAME = 'honsamnote_admin_session';
export const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24시간

function toBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let str = '';
  for (const b of arr) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// 반환 타입을 명시하지 않는다 — TS5.9+에서 Uint8Array가 제네릭이 되면서
// 명시적 `: Uint8Array` 주석이 오히려 ArrayBuffer 특정 타입 정보를 지워
// crypto.subtle.verify()가 요구하는 BufferSource와 안 맞게 되는 걸 피한다.
function fromBase64Url(b64url: string) {
  const padded = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const b64 = padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), '=');
  const str = atob(b64);
  const arr = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) arr[i] = str.charCodeAt(i);
  return arr;
}

/** 타이밍 공격에 덜 취약하도록 길이 고정 후 비교한다(완벽한 상수시간은 아니지만
 *  단순 === 비교보다 낫고, 이 정도 위협 모델에는 충분하다). */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** 비밀번호(또는 임의 문자열)의 SHA-256 16진 해시. */
export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);
}

// 세션 서명 키는 비밀번호 비교에 쓰는 ADMIN_AUTH_HASH를 그대로 재사용하지 않고
// 한 번 더 파생시킨다(용도 분리 — 이 값이 새어나가도 로그인 비밀번호 검증
// 자체에는 쓰일 수 없다).
async function deriveSessionSecret(adminAuthHash: string): Promise<string> {
  return sha256Hex(`${adminAuthHash}:session-signing`);
}

interface SessionPayload {
  exp: number;
}

export async function createSessionToken(adminAuthHash: string, ttlMs: number = SESSION_TTL_MS): Promise<string> {
  const payload: SessionPayload = { exp: Date.now() + ttlMs };
  const payloadB64 = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await importHmacKey(await deriveSessionSecret(adminAuthHash));
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payloadB64));
  return `${payloadB64}.${toBase64Url(sig)}`;
}

export async function verifySessionToken(token: string | null | undefined, adminAuthHash: string): Promise<boolean> {
  if (!token || !adminAuthHash) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payloadB64, sigB64] = parts;

  try {
    const key = await importHmacKey(await deriveSessionSecret(adminAuthHash));
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      fromBase64Url(sigB64),
      new TextEncoder().encode(payloadB64)
    );
    if (!valid) return false;

    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(payloadB64))) as SessionPayload;
    return typeof payload.exp === 'number' && payload.exp > Date.now();
  } catch {
    return false;
  }
}

export function parseCookieHeader(cookieHeader: string | null | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieHeader) return result;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) {
      try {
        result[key] = decodeURIComponent(value);
      } catch {
        result[key] = value;
      }
    }
  }
  return result;
}

/** 로그인 성공 시 응답에 실을 Set-Cookie 값. HttpOnly + Secure + SameSite=Strict. */
export function buildSessionCookie(token: string, maxAgeSeconds = SESSION_TTL_MS / 1000): string {
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${Math.round(maxAgeSeconds)}`;
}

/** 로그아웃 시 쿠키를 즉시 만료시키는 Set-Cookie 값. */
export function buildClearSessionCookie(): string {
  return `${SESSION_COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}
