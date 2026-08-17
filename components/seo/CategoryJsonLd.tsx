import JsonLd from './JsonLd';
import { absoluteUrl, buildBreadcrumbJsonLd, breadcrumbNodesToJsonLd, type BreadcrumbNode } from '@/lib/seo';

interface Props {
  slug: string;
  breadcrumbNodes: BreadcrumbNode[]; // 화면에 보이는 <Breadcrumb />와 동일 배열
}

export default function CategoryJsonLd({ slug, breadcrumbNodes }: Props) {
  const url = absoluteUrl(`/category/${slug}/`);
  const breadcrumb = buildBreadcrumbJsonLd(breadcrumbNodesToJsonLd(breadcrumbNodes, url));
  return <JsonLd data={breadcrumb} />;
}
