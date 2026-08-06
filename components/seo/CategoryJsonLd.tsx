import JsonLd from './JsonLd';
import { SITE_NAME, SITE_URL, absoluteUrl, buildBreadcrumbJsonLd } from '@/lib/seo';

export default function CategoryJsonLd({ slug, name }: { slug: string; name: string }) {
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: SITE_NAME, url: SITE_URL },
    { name, url: absoluteUrl(`/category/${slug}/`) },
  ]);
  return <JsonLd data={breadcrumb} />;
}
