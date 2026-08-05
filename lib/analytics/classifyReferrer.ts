export type ReferrerGroup = 'google' | 'naver_daum_bing' | 'kakao' | 'sns' | 'direct' | 'other';

export const REFERRER_GROUP_LABELS: Record<ReferrerGroup, string> = {
  google: '구글 검색',
  naver_daum_bing: '네이버·다음·빙',
  kakao: '카카오·카카오톡',
  sns: 'SNS',
  direct: '직접 유입',
  other: '기타 사이트',
};

const GOOGLE_DOMAINS = ['google.com', 'google.co.kr', 'googleusercontent.com'];
const NAVER_DAUM_BING_DOMAINS = ['naver.com', 'search.naver.com', 'daum.net', 'search.daum.net', 'bing.com'];
const KAKAO_DOMAINS = ['kakao.com', 'kakaotalk', 'talk.kakao.com'];
const SNS_DOMAINS = [
  'instagram.com', 'facebook.com', 'threads.net', 'youtube.com', 't.co',
  'twitter.com', 'x.com', 'band.us', 'blog.naver.com',
];

function hostIncludesAny(host: string, domains: string[]): boolean {
  return domains.some(d => host === d || host.endsWith(`.${d}`) || host.includes(d));
}

/**
 * referrer(빈 값 가능)를 6개 그룹 중 하나로 분류한다.
 * referrer가 없는 경우(직접 입력, 북마크, 일부 앱의 referrer 제거 등)는
 * "오류"로 단정하지 않고 direct로 분류한다.
 */
export function classifyReferrer(referrer: string | null | undefined, siteOrigin: string): ReferrerGroup {
  if (!referrer || referrer.trim() === '') return 'direct';

  let parsed: URL;
  try {
    parsed = new URL(referrer);
  } catch {
    // referrer가 URL 형식이 아니면(일부 인앱 브라우저의 비표준 값) 직접 유입으로 취급.
    return 'direct';
  }
  // android-app:// 같은 비-웹 스킴(앱 내부 식별자)은 실질적으로 유입 경로
  // 정보가 없는 것과 같으므로 직접 유입으로 취급한다.
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return 'direct';
  const host = parsed.hostname.toLowerCase();

  // 자기 자신(사이트 내 이동)은 referrer로 잡히지만 "유입 경로"로는 의미가 없다 — 직접 유입 취급.
  try {
    const siteHost = new URL(siteOrigin).hostname.toLowerCase();
    if (host === siteHost) return 'direct';
  } catch {
    // siteOrigin 파싱 실패 시 무시하고 계속 분류.
  }

  if (hostIncludesAny(host, GOOGLE_DOMAINS)) return 'google';
  if (hostIncludesAny(host, NAVER_DAUM_BING_DOMAINS)) return 'naver_daum_bing';
  if (hostIncludesAny(host, KAKAO_DOMAINS)) return 'kakao';
  if (hostIncludesAny(host, SNS_DOMAINS)) return 'sns';
  return 'other';
}
