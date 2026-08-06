import JsonLd from './JsonLd';
import { SITE_NAME, SITE_URL, SITE_DESCRIPTION, absoluteUrl } from '@/lib/seo';

// 사이트 자체 검색 기능이 없어 SearchAction은 넣지 않는다(실제로 없는 기능을
// 구조화 데이터에 광고하면 검증 도구에서 오류로 잡히거나 검색엔진을 오도한다).
export default function WebsiteJsonLd() {
  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
      logo: { '@type': 'ImageObject', url: absoluteUrl('/icon.png') },
    },
  };

  return <JsonLd data={website} />;
}
