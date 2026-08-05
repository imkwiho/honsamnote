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
// 정확히 1:1로 맞진 않는다. 근접한 대분류가 있는 카테고리만 매핑했고,
// 나머지(cleaning/safety/lifestyle)는 매핑하지 않아 CoupangPartnersCarousel이
// 기존 기본 동적 위젯(카테고리 무관 캐러셀)으로 자동 대체한다.
//
// 상품이 매번 바뀌는 캐러셀이 아니라 쿠팡이 그 대분류에 맞춰 주기적으로
// 교체하는 고정 이미지 배너 1개 + 링크다. 여러 상품을 보여주진 않지만,
// 최소한 "완전히 무관한 상품"이 뜨는 문제는 해결된다.
export const COUPANG_CATEGORY_BANNERS: Record<string, CoupangCategoryBanner> = {
  // 로켓 홈인테리어 — 수납/주거환경 둘 다 이 배너를 공용으로 쓴다.
  storage: {
    href: 'https://link.coupang.com/a/fXvz2PVz76',
    imgSrc:
      'https://ads-partners.coupang.com/banners/1014215?trackingCode=AF1634685&subId=&traceId=V0-301-2f679fc6bd8f2e58-I1014215&w=728&h=90',
    width: 728,
    height: 90,
  },
  housing: {
    href: 'https://link.coupang.com/a/fXvz2PVz76',
    imgSrc:
      'https://ads-partners.coupang.com/banners/1014215?trackingCode=AF1634685&subId=&traceId=V0-301-2f679fc6bd8f2e58-I1014215&w=728&h=90',
    width: 728,
    height: 90,
  },
  // 로켓 프레시
  food: {
    href: 'https://link.coupang.com/a/fXvIfRBBEz',
    imgSrc:
      'https://ads-partners.coupang.com/banners/1014216?trackingCode=AF1634685&subId=&traceId=V0-301-371ae01f4226dec2-I1014216&w=728&h=90',
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
};
