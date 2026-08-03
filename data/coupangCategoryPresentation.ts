export interface CategoryAdPresentation {
  title: string;
  description: string;
  caution?: string;
  enabled: boolean;
}

// 카테고리(정규화된 키)별 쿠팡 캐러셀 문구. 실제 노출 상품은 쿠팡 다이나믹
// 캐러셀이 결정하며, 여기서는 문맥(제목·설명·주의문구)만 다르게 보여준다.
export const COUPANG_CATEGORY_PRESENTATION: Record<string, CategoryAdPresentation> = {
  cost: {
    title: '생활비 절약에 참고할 상품',
    description: '혼자 사는 생활에서 반복적으로 사용하는 생필품과 절약형 상품을 살펴보세요.',
    caution: '가격과 할인 조건은 쿠팡 상품 페이지에서 직접 확인하세요.',
    enabled: true,
  },
  food: {
    title: '1인 가구 식재료와 주방용품 살펴보기',
    description: '소포장 식재료, 간편식, 보관용기와 간단한 조리에 활용할 상품을 확인해 보세요.',
    caution: '식품의 유통기한, 보관방법과 알레르기 정보를 반드시 확인하세요.',
    enabled: true,
  },
  storage: {
    title: '좁은 공간을 효율적으로 쓰는 수납용품',
    description: '원룸, 오피스텔과 작은 집의 공간 활용에 참고할 수납용품을 살펴보세요.',
    caution: '설치 전에 실제 공간의 폭·높이·깊이를 측정하세요.',
    enabled: true,
  },
  cleaning: {
    title: '혼자 사는 집의 청소와 위생관리 용품',
    description: '주방, 욕실, 바닥, 침구와 생활공간 관리에 활용할 수 있는 상품을 확인해 보세요.',
    caution: '세정제와 화학제품은 사용법과 주의사항을 확인하세요.',
    enabled: true,
  },
  safety: {
    title: '1인 가구의 생활안전에 참고할 상품',
    description: '화재, 가스, 방범, 미끄럼과 응급상황 대비에 참고할 수 있는 생활용품입니다.',
    caution: '위험하거나 긴급한 상황에서는 상품 구매보다 112, 119 또는 전문기관에 연락하는 것이 우선입니다.',
    enabled: true,
  },
  housing: {
    title: '편안한 주거생활을 위한 상품 살펴보기',
    description: '침구, 조명, 냉난방, 습도, 소음과 생활환경 개선에 참고할 상품을 확인해 보세요.',
    caution: '전기제품은 소비전력, 안전인증과 설치 조건을 확인하세요.',
    enabled: true,
  },
  products: {
    title: '1인 가구 생활제품과 사용 후기 확인하기',
    description: '혼자 사는 생활에 필요한 가전, 생활용품과 편의제품을 살펴보세요.',
    caution: '제품 사양, 크기, 소비전력과 보증조건은 구매 페이지에서 확인하세요.',
    enabled: true,
  },
  // 관계 카테고리는 "관계 문제를 상품 구매로 해결한다"는 인상을 주지 않기 위해
  // 별도 주의문구 없이 생활 편의 관점의 설명만 사용한다.
  lifestyle: {
    title: '일상과 관계를 편안하게 돕는 생활상품',
    description: '모임, 선물, 취미와 편안한 일상생활에 참고할 상품을 살펴보세요.',
    enabled: true,
  },
  // 뉴스레터 자체(구독 폼)에는 광고를 넣지 않는다. 이 항목은 만약 게시글의
  // 카테고리가 뉴스레터/정보성 글로 분류되는 경우에 한해 사용된다.
  newsletter: {
    title: '1인 가구 생활에 참고할 상품',
    description: '이번 글과 함께 살펴볼 수 있는 생활상품과 후기를 확인해 보세요.',
    enabled: true,
  },
  // 카테고리가 없거나 매칭되지 않는 글(예: 소개 글) 기본값
  all: {
    title: '혼자 사는 생활에 참고할 쿠팡 상품',
    description: '1인 가구의 생활비, 주방, 청소, 수납과 주거생활에 활용할 상품을 살펴보세요.',
    enabled: true,
  },
};
