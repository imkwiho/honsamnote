// 사이트 전역 SEO 상수. 이 값 하나만 바꾸면 홈페이지·글·카테고리·사이트맵·RSS·
// JSON-LD 전부에 일관되게 반영되도록, 메타데이터를 만드는 모든 곳이 이 파일을 참조한다.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://honsamnote.co.kr').replace(/\/+$/, '');
export const SITE_NAME = '혼삶노트';
export const SITE_DESCRIPTION =
  '1인 가구를 위한 생활비, 식재료, 수납, 청소, 안전, 주거, 생활제품과 인간관계 정보를 제공하는 실용 생활정보 플랫폼';
export const SITE_LOCALE = 'ko_KR';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.png`;
export const DEFAULT_OG_IMAGE_DIMENSIONS = { width: 1200, height: 630 };

/** content/blog/*.mdx의 상대 slug를 site의 절대 URL로 만든다. */
export function absoluteUrl(pathname: string): string {
  const clean = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${SITE_URL}${clean}`;
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

/** 여러 페이지(글/카테고리)가 공유하는 BreadcrumbList JSON-LD를 만든다. */
export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

// 2단계: 화면에 보이는 Breadcrumb UI(components/seo/Breadcrumb.tsx)와
// JSON-LD(buildBreadcrumbJsonLd)가 서로 다른 항목을 만들어 어긋나는 일을
// 막기 위해, 페이지마다 이 상대경로 노드 배열을 **한 번만** 만들어 두
// 곳(화면 컴포넌트 + *JsonLd 컴포넌트)에 그대로 넘긴다. 마지막 노드(현재
// 페이지)는 href를 생략한다.
export interface BreadcrumbNode {
  name: string;
  href?: string;
}

/** BreadcrumbNode[] → JSON-LD용 절대 URL 배열로 변환. href가 없는 마지막 노드는 currentUrl(절대경로)을 쓴다. */
export function breadcrumbNodesToJsonLd(nodes: BreadcrumbNode[], currentUrl: string): BreadcrumbItem[] {
  return nodes.map(node => ({ name: node.name, url: node.href ? absoluteUrl(node.href) : currentUrl }));
}
