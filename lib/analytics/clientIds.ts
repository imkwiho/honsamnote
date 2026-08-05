// 개인정보를 포함하지 않는 익명 방문자/세션 식별자. 이름, 이메일, IP 등은
// 절대 포함하지 않으며 crypto.randomUUID()로 생성한 값만 브라우저에 저장한다.
// (이 파일 자체는 컴포넌트가 아니라 'use client' 지시어가 필요 없다 — 항상
// 'use client' 컴포넌트인 VisitorTracker.tsx에서만 import해서 쓴다.)

const VISITOR_ID_KEY = 'honsamnote_visitor_id';
const SESSION_ID_KEY = 'honsamnote_session_id';
const SESSION_LAST_ACTIVITY_KEY = 'honsamnote_session_last_activity';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30분

function safeRandomId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // ignore
  }
  // crypto.randomUUID를 쓸 수 없는 아주 오래된 환경을 위한 최소 대체.
  return `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** localStorage 사용 가능 여부를 안전하게 확인한다(프라이빗 모드 등 예외 대비). */
function storageAvailable(storage: Storage): boolean {
  try {
    const testKey = '__honsamnote_test__';
    storage.setItem(testKey, '1');
    storage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

// localStorage가 막힌 환경(프라이빗 모드 등)에서는 탭 메모리에만 유지되는
// 임시 ID로 대체한다. 새로고침하면 새 ID가 되지만, 최소한 그 세션 안에서는
// 안정적인 값을 준다.
let memoryVisitorId: string | null = null;
let memorySessionId: string | null = null;

export function getVisitorId(): string {
  if (typeof window === 'undefined') return '';
  try {
    if (storageAvailable(window.localStorage)) {
      let id = window.localStorage.getItem(VISITOR_ID_KEY);
      if (!id) {
        id = safeRandomId();
        window.localStorage.setItem(VISITOR_ID_KEY, id);
      }
      return id;
    }
  } catch {
    // fallthrough to memory
  }
  if (!memoryVisitorId) memoryVisitorId = safeRandomId();
  return memoryVisitorId;
}

/**
 * 세션 ID를 반환한다. 마지막 활동 후 30분이 지났으면 새 세션을 발급하고,
 * 그렇지 않으면 기존 세션을 이어간다. 호출할 때마다 마지막 활동 시각을 갱신한다.
 */
export function getOrRotateSessionId(): { sessionId: string; isNewSession: boolean } {
  if (typeof window === 'undefined') return { sessionId: '', isNewSession: false };

  const now = Date.now();
  try {
    const storage = storageAvailable(window.sessionStorage) ? window.sessionStorage : null;
    if (storage) {
      const existingId = storage.getItem(SESSION_ID_KEY);
      const lastActivity = Number(storage.getItem(SESSION_LAST_ACTIVITY_KEY) ?? 0);
      const expired = !existingId || now - lastActivity > SESSION_TIMEOUT_MS;
      const sessionId = expired ? safeRandomId() : existingId;
      storage.setItem(SESSION_ID_KEY, sessionId);
      storage.setItem(SESSION_LAST_ACTIVITY_KEY, String(now));
      return { sessionId, isNewSession: expired };
    }
  } catch {
    // fallthrough to memory
  }

  if (!memorySessionId) {
    memorySessionId = safeRandomId();
    return { sessionId: memorySessionId, isNewSession: true };
  }
  return { sessionId: memorySessionId, isNewSession: false };
}
