// SEO 3단계 §22-23 — 클러스터별 Primary Page(대표 콘텐츠) 지정 결과를
// 보고서로 남긴다. content/blog/는 읽기만 한다.
import fs from 'fs';
import path from 'path';
import { computePrimaryPages } from '../lib/primaryPages';
import { buildLinkGraph } from '../lib/linkGraph';
import { loadAllPosts, AUDIT_DIR, SITE_URL, ensureAuditDir, toCsv } from './lib/seoPhase3Shared';

function main() {
  const posts = loadAllPosts();
  const graph = buildLinkGraph(posts);
  const primaryPages = computePrimaryPages(posts, graph);

  const rows = [...primaryPages.values()]
    .sort((a, b) => (b.supportingSlugs.length + 1) - (a.supportingSlugs.length + 1))
    .map(info => ({
      cluster_id: info.clusterId,
      cluster_name: info.clusterName,
      primary_page: info.primarySlug,
      primary_url: `${SITE_URL}/blog/${info.primarySlug}/`,
      primary_title: info.primaryTitle,
      supporting_page_count: info.supportingSlugs.length,
      supporting_pages: info.supportingSlugs.join('; '),
      reason: info.reason,
    }));

  ensureAuditDir();
  const columns = ['cluster_id', 'cluster_name', 'primary_page', 'primary_url', 'primary_title', 'supporting_page_count', 'supporting_pages', 'reason'];
  fs.writeFileSync(path.join(AUDIT_DIR, 'primary-pages.csv'), toCsv(columns, rows), 'utf-8');

  console.log(`클러스터 ${rows.length}개에 대해 Primary Page 지정 완료`);
  console.log('출력: seo-audit/primary-pages.csv');
}

main();
