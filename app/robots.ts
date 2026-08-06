import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

export const dynamic = 'force-static';

// robots.txt는 보안 수단이 아니다 — 관리자 페이지는 이 파일이 아니라
// 서버 세션 인증(functions/api/admin/*)으로 보호한다. 여기서는 검색로봇에게
// 무엇을 수집해도 되는지만 알려준다. CSS/JS/이미지는 절대 막지 않는다.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/admin/', '/api/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
