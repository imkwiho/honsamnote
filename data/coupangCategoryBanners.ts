export interface CoupangCategoryBanner {
  /** 쿠팡 파트너스 "카테고리 배너"가 발급한 실제 트래킹 링크. */
  href: string;
  /** 쿠팡 광고 서버가 제공하는 배너 크리에이티브 이미지 URL (trackingCode 포함). */
  imgSrc: string;
  width: number;
  height: number;
}

// 쿠팡 파트너스 "카테고리 배너" 기능으로 실제 발급받은 배너다 (2026-08-05,
// partners.coupang.com > 링크 생성 > 카테고리 배너 > 728x90). 이 기능은 쿠팡이
// 정해놓은 고정 대분류에만 연결할 수 있어, 우리 8개 콘텐츠 카테고리와 이름이
// 정확히 1:1로 맞진 않는다. cleaning/safety는 쿠팡 카테고리 배너 목록에
// 정확히 맞는 대분류가 없어(청소용품/안전용품 대분류 자체가 없음),
// 사용자 승인 하에 가장 근접한 기존 배너를 재사용해 매핑했다(아래 주석 참고).
// 이제 8개 카테고리 전부 매핑되어 있어, 매칭 실패 시 폴백인 기존 기본
// 동적 위젯(카테고리 무관 캐러셀)은 정상적으로는 쓰이지 않는다.
//
// 상품이 매번 바뀌는 캐러셀이 아니라 쿠팡이 그 대분류에 맞춰 주기적으로
// 교체하는 고정 이미지 배너 1개 + 링크다. 여러 상품을 보여주진 않지만,
// 최소한 "완전히 무관한 상품"이 뜨는 문제는 해결된다.
//
// 참고: 같은 대분류를 다시 발급받아도 이미지(배너 id)는 그대로지만 href
// (트래킹 단축링크)는 매번 새로 생성된다 — 여기엔 가장 최근에 발급받은
// href를 사용한다.
export const COUPANG_CATEGORY_BANNERS: Record<string, CoupangCategoryBanner> = {
  // 로켓 홈인테리어 — 수납/주거환경 둘 다 이 배너를 공용으로 쓴다.
  storage: {
    href: 'https://link.coupang.com/a/fXwXWNgJqu',
    imgSrc:
      'https://ads-partners.coupang.com/banners/1014215?trackingCode=AF1634685&subId=&traceId=V0-301-2f679fc6bd8f2e58-I1014215&w=728&h=90',
    width: 728,
    height: 90,
  },
  housing: {
    href: 'https://link.coupang.com/a/fXwXWNgJqu',
    imgSrc:
      'https://ads-partners.coupang.com/banners/1014215?trackingCode=AF1634685&subId=&traceId=V0-301-2f679fc6bd8f2e58-I1014215&w=728&h=90',
    width: 728,
    height: 90,
  },
  // 로켓 주방용품 — 그릇/조리도구/보관용기 등 실제 글 내용(식재료 보관·주방
  // 정리)과 더 잘 맞아 이전에 쓰던 "로켓 프레시"에서 교체했다.
  food: {
    href: 'https://link.coupang.com/a/fXwZymRd00',
    imgSrc:
      'https://ads-partners.coupang.com/banners/1014224?trackingCode=AF1634685&subId=&traceId=V0-301-2b8ef06377ec8f50-I1014224&w=728&h=90',
    width: 728,
    height: 90,
  },
  // 로켓 가전/디지털
  products: {
    href: 'https://link.coupang.com/a/fXvMdSSrOm',
    imgSrc:
      'https://ads-partners.coupang.com/banners/1014217?trackingCode=AF1634685&subId=&traceId=V0-301-5f9bd61900e673c0-I1014217&w=728&h=90',
    width: 728,
    height: 90,
  },
  // 골드박스 — 생활비 절약(특가/할인 성격)에 가장 근접
  cost: {
    href: 'https://link.coupang.com/a/fXvSvq3GjQ',
    imgSrc:
      'https://ads-partners.coupang.com/banners/1014218?trackingCode=AF1634685&subId=&traceId=V0-301-969b06e95b87326d-I1014218&w=728&h=90',
    width: 728,
    height: 90,
  },
  // 로켓 반려동물용품 — 마땅한 대분류가 없던 "일상·관계"에 매핑. 1인 가구
  // 콘텐츠에서 반려동물은 관계·동반 주제로 자주 다뤄져 근접하다고 판단.
  lifestyle: {
    href: 'https://link.coupang.com/a/fXwWaIXgQK',
    imgSrc:
      'https://ads-partners.coupang.com/banners/1014225?trackingCode=AF1634685&subId=&traceId=V0-301-7e6e8eb8ddfa1bfb-I1014225&w=728&h=90',
    width: 728,
    height: 90,
  },
  // 쿠팡 카테고리 배너 목록에 "안전용품" 대분류가 없어, 가스감지기·화재경보기·
  // 스마트 도어락 등 안전용품이 실제로 자주 분류되는 "로켓 가전/디지털"을
  // 재사용했다(products와 배너 공유). 완벽히 일치하진 않지만 기존 범용
  // 캐러셀(완전 무관 상품)보단 훨씬 근접하다.
  safety: {
    href: 'https://link.coupang.com/a/fXvMdSSrOm',
    imgSrc:
      'https://ads-partners.coupang.com/banners/1014217?trackingCode=AF1634685&subId=&traceId=V0-301-5f9bd61900e673c0-I1014217&w=728&h=90',
    width: 728,
    height: 90,
  },
  // 마찬가지로 "청소용품" 대분류가 없어 "로켓 홈인테리어"를 재사용했다
  // (storage/housing과 배너 공유). 청소도구·수납형 청소용품이 생활/홈
  // 영역과 인접하다고 판단.
  cleaning: {
    href: 'https://link.coupang.com/a/fXwXWNgJqu',
    imgSrc:
      'https://ads-partners.coupang.com/banners/1014215?trackingCode=AF1634685&subId=&traceId=V0-301-2f679fc6bd8f2e58-I1014215&w=728&h=90',
    width: 728,
    height: 90,
  },
};
