import JsonLd from './JsonLd';
import { SITE_NAME, SITE_URL, DEFAULT_OG_IMAGE, absoluteUrl, buildBreadcrumbJsonLd, breadcrumbNodesToJsonLd, type BreadcrumbNode } from '@/lib/seo';

interface Props {
  title: string;
  description: string;
  slug: string;
  date: string;
  updatedAt?: string;
  categoryName?: string;
  tags: string[];
  // 화면에 보이는 <Breadcrumb />와 반드시 같은 배열을 넘긴다(lib/seo.ts 주석 참고) —
  // 이 컴포넌트가 스스로 breadcrumb을 만들지 않는 이유.
  breadcrumbNodes: BreadcrumbNode[];
}

// 실제 이름이 있는 필자가 없는 AI 보조 작성 블로그라, 가상의 전문가 인물을
// 만들어내는 대신 발행 주체(Organization)를 author/publisher로 명시한다.
export default function ArticleJsonLd({ title, description, slug, date, updatedAt, categoryName, tags, breadcrumbNodes }: Props) {
  const url = absoluteUrl(`/blog/${slug}/`);
  const publishedTime = date ? new Date(date).toISOString() : undefined;
  const modifiedTime = updatedAt ? new Date(updatedAt).toISOString() : publishedTime;

  const article = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description,
    image: [DEFAULT_OG_IMAGE],
    datePublished: publishedTime,
    dateModified: modifiedTime,
    author: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: { '@type': 'ImageObject', url: absoluteUrl('/icon.png') },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    url,
    articleSection: categoryName,
    keywords: tags.length > 0 ? tags.join(', ') : undefined,
  };

  const breadcrumb = buildBreadcrumbJsonLd(breadcrumbNodesToJsonLd(breadcrumbNodes, url));

  return (
    <>
      <JsonLd data={article} />
      <JsonLd data={breadcrumb} />
    </>
  );
}
