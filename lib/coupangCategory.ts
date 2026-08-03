// 카테고리 슬러그/이름이 다르게 저장되어 있어도 8개 정규 카테고리 중 하나로
// 묶어 쿠팡 캐러셀 문구를 고를 수 있게 하는 정규화 함수.
const CATEGORY_GROUPS: Record<string, string[]> = {
  cost: ['생활비', '생활 비용', '절약', '고정비', '공과금', 'cost'],
  food: ['식재료', '식비', '장보기', '간편식', '주방', 'food'],
  storage: ['수납', '정리', '공간 활용', '원룸 정리', 'storage'],
  cleaning: ['청소', '위생', '세탁', '욕실 청소', '주방 청소', 'cleaning'],
  safety: ['안전', '방범', '화재', '가스', '응급', 'safety'],
  housing: ['주거', '원룸', '오피스텔', '냉난방', '침구', '생활환경', 'housing'],
  products: ['제품', '가전', '생활용품', '구매 가이드', '리뷰', 'products'],
  lifestyle: ['관계', '모임', '직장생활', '인간관계', '외로움', '취미', 'lifestyle'],
  newsletter: ['뉴스레터', 'newsletter'],
};

export type CanonicalCoupangCategory =
  | 'cost' | 'food' | 'storage' | 'cleaning' | 'safety' | 'housing' | 'products' | 'lifestyle'
  | 'newsletter' | 'all';

export function normalizeCategory(categorySlug?: string, categoryName?: string): CanonicalCoupangCategory {
  const slug = categorySlug?.trim().toLowerCase();
  if (slug && slug in CATEGORY_GROUPS) return slug as CanonicalCoupangCategory;

  const haystack = `${categorySlug ?? ''} ${categoryName ?? ''}`;
  for (const [canonical, keywords] of Object.entries(CATEGORY_GROUPS)) {
    if (keywords.some(keyword => haystack.includes(keyword))) {
      return canonical as CanonicalCoupangCategory;
    }
  }
  return 'all';
}
