import { getAllPosts } from '@/lib/mdx';
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from '@/lib/seo';

export const dynamic = 'force-static';

const RSS_ITEM_LIMIT = 30;

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toRfc822(dateStr: string | undefined): string {
  if (!dateStr) return new Date().toUTCString();
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? new Date().toUTCString() : d.toUTCString();
}

export async function GET() {
  const posts = (await getAllPosts()).slice(0, RSS_ITEM_LIMIT);

  const items = posts
    .map(p => {
      const url = `${SITE_URL}/blog/${p.slug}/`;
      return `
    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${toRfc822(p.date)}</pubDate>
      <description>${escapeXml(p.description)}</description>
      <dc:creator>${escapeXml(SITE_NAME)}</dc:creator>${
        p.categoryName ? `\n      <category>${escapeXml(p.categoryName)}</category>` : ''
      }
    </item>`;
    })
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(SITE_NAME)}</title>
    <link>${SITE_URL}</link>
    <description>${escapeXml(SITE_DESCRIPTION)}</description>
    <language>ko</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link xmlns:atom="http://www.w3.org/2005/Atom" href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { 'content-type': 'application/rss+xml; charset=utf-8' },
  });
}
