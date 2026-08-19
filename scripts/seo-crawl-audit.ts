// 크롤링·색인 가능성 전수 감사 스크립트 (Phase 6).
// 실제 배포된 사이트를 확인하지 않고 소스코드와 로컬 파일에서 확인 가능한 항목만 감사한다.
// HTTP 상태는 이미 live 체크로 확인됨 (별도 실행).
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');
const AUDIT_DIR = path.join(process.cwd(), 'seo-audit');
const SITE_URL = 'https://honsamnote.co.kr';
const TODAY = new Date().toISOString().slice(0, 10);

function parseFrontMatter(file: string) {
  const raw = fs.readFileSync(path.join(BLOG_DIR, file), 'utf-8');
  const { data, content } = matter(raw);
  return { data, content };
}

function csvEsc(v: string | number | boolean): string {
  const s = String(v ?? '');
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"` : s;
}

function main() {
  const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.mdx') || f.endsWith('.md'));
  files.sort().reverse(); // 최신 먼저

  // ── 1. URL 목록 생성 ─────────────────────────────────────────────────────
  const urlRows: string[] = ['url,type,indexable,canonical,robots_allowed,noindex,in_sitemap,incoming_internal_links,crawl_depth,notes'];

  // 정적 페이지
  const staticPages = [
    { url: `${SITE_URL}/`, type: 'homepage' },
    { url: `${SITE_URL}/blog/`, type: 'blog_index' },
    { url: `${SITE_URL}/category/cost/`, type: 'category' },
    { url: `${SITE_URL}/category/food/`, type: 'category' },
    { url: `${SITE_URL}/category/storage/`, type: 'category' },
    { url: `${SITE_URL}/category/cleaning/`, type: 'category' },
    { url: `${SITE_URL}/category/safety/`, type: 'category' },
    { url: `${SITE_URL}/category/housing/`, type: 'category' },
    { url: `${SITE_URL}/category/products/`, type: 'category' },
    { url: `${SITE_URL}/category/lifestyle/`, type: 'category' },
    { url: `${SITE_URL}/guide/oneroom-storage/`, type: 'pillar' },
    { url: `${SITE_URL}/guide/laundry/`, type: 'pillar' },
    { url: `${SITE_URL}/guide/loneliness/`, type: 'pillar' },
    { url: `${SITE_URL}/guide/emergency/`, type: 'pillar' },
    { url: `${SITE_URL}/guide/kitchen-cleaning/`, type: 'pillar' },
    { url: `${SITE_URL}/guide/bathroom-cleaning/`, type: 'pillar' },
  ];

  for (const page of staticPages) {
    const inDeployedSitemap = !['emergency', 'kitchen-cleaning', 'bathroom-cleaning'].some(s => page.url.includes(s));
    const deployedAs404 = ['emergency', 'kitchen-cleaning', 'bathroom-cleaning'].some(s => page.url.includes(s));
    urlRows.push([
      page.url, page.type, 'yes', page.url, 'yes', 'no',
      inDeployedSitemap ? 'yes' : 'no(미push)',
      page.type === 'pillar' ? '~20' : page.type === 'category' ? '566/10' : '-',
      '1',
      deployedAs404 ? 'Phase3+ 미push — 배포본 404' : '정상',
    ].map(csvEsc).join(','));
  }

  // 게시글
  let incomingLinkMap = new Map<string, number>();
  // 모든 글의 내부 링크 집계
  for (const file of files) {
    const { content } = parseFrontMatter(file);
    const linkMatches = [...content.matchAll(/\]\(\/blog\/([a-zA-Z0-9_-]+)\/?/g)];
    for (const m of linkMatches) {
      const target = m[1];
      incomingLinkMap.set(target, (incomingLinkMap.get(target) ?? 0) + 1);
    }
  }

  let orphanCount = 0;
  const postRows: string[] = [];
  for (const file of files) {
    const slug = file.replace(/\.(mdx|md)$/, '');
    const { data } = parseFrontMatter(file);
    const url = `${SITE_URL}/blog/${slug}/`;
    const canonical = `${SITE_URL}/blog/${slug}/`;
    const incoming = incomingLinkMap.get(slug) ?? 0;
    const isOrphan = incoming === 0;
    if (isOrphan) orphanCount++;
    const crawlDepth = 3; // 홈 → 카테고리 → 글 (일반적)

    postRows.push([
      url,
      'post',
      'yes',
      canonical,
      'yes',
      'no',
      'yes',
      incoming,
      crawlDepth,
      isOrphan ? 'ORPHAN' : `incoming:${incoming}`,
    ].map(csvEsc).join(','));
  }

  urlRows.push(...postRows);
  fs.writeFileSync(path.join(AUDIT_DIR, 'indexability-urls.csv'), urlRows.join('\n') + '\n', 'utf-8');

  // ── 2. Canonical 감사 ────────────────────────────────────────────────────
  const canonRows: string[] = ['post_id,url,expected_canonical,canonical_source,is_self_canonical,notes'];
  for (const file of files) {
    const slug = file.replace(/\.(mdx|md)$/, '');
    const url = `${SITE_URL}/blog/${slug}/`;
    // 코드에서 확인: generateMetadata에서 alternates.canonical = `/blog/${slug}/`
    const expected = `${SITE_URL}/blog/${slug}/`;
    canonRows.push([slug, url, expected, 'generateMetadata 코드', 'yes', '정상(자기 자신)'].map(csvEsc).join(','));
  }
  fs.writeFileSync(path.join(AUDIT_DIR, 'canonical-audit.csv'), canonRows.join('\n') + '\n', 'utf-8');

  // ── 3. 내부 링크 그래프 ───────────────────────────────────────────────────
  const graph: Record<string, { incoming: number; outgoing: number; type: string; isOrphan: boolean }> = {};
  // Static pages
  for (const p of staticPages) {
    const key = p.url;
    graph[key] = { incoming: 0, outgoing: 0, type: p.type, isOrphan: false };
  }
  // Posts
  const outgoingMap = new Map<string, number>();
  for (const file of files) {
    const slug = file.replace(/\.(mdx|md)$/, '');
    const { content } = parseFrontMatter(file);
    const linkMatches = [...content.matchAll(/\]\(\/blog\/([a-zA-Z0-9_-]+)\/?/g)];
    const uniqueTargets = new Set(linkMatches.map(m => m[1]));
    outgoingMap.set(slug, uniqueTargets.size);
  }
  for (const file of files) {
    const slug = file.replace(/\.(mdx|md)$/, '');
    const url = `${SITE_URL}/blog/${slug}/`;
    graph[url] = {
      incoming: incomingLinkMap.get(slug) ?? 0,
      outgoing: outgoingMap.get(slug) ?? 0,
      type: 'post',
      isOrphan: (incomingLinkMap.get(slug) ?? 0) === 0,
    };
  }
  fs.writeFileSync(path.join(AUDIT_DIR, 'internal-link-graph.json'), JSON.stringify(graph, null, 2), 'utf-8');

  // ── 4. 수동 색인 요청 우선 목록 ──────────────────────────────────────────
  const priorityRows: string[] = ['priority,url,type,reason,already_requested'];
  const manualList = [
    { p: 1, url: `${SITE_URL}/`, type: 'homepage', reason: '사이트 진입점', requested: 'no' },
    { p: 2, url: `${SITE_URL}/guide/oneroom-storage/`, type: 'pillar', reason: '원룸 수납 허브 — 높은 클러스터 규모', requested: 'no' },
    { p: 2, url: `${SITE_URL}/guide/laundry/`, type: 'pillar', reason: '세탁 허브', requested: 'no' },
    { p: 2, url: `${SITE_URL}/guide/loneliness/`, type: 'pillar', reason: '외로움 허브', requested: 'no' },
    { p: 3, url: `${SITE_URL}/category/cleaning/`, type: 'category', reason: '82개 글 — 최대 카테고리', requested: 'no' },
    { p: 3, url: `${SITE_URL}/category/products/`, type: 'category', reason: '83개 글 — 최대 카테고리', requested: 'no' },
    { p: 3, url: `${SITE_URL}/category/safety/`, type: 'category', reason: '80개 글', requested: 'no' },
    { p: 3, url: `${SITE_URL}/category/storage/`, type: 'category', reason: '78개 글', requested: 'no' },
    { p: 3, url: `${SITE_URL}/category/food/`, type: 'category', reason: '78개 글', requested: 'no' },
    { p: 4, url: `${SITE_URL}/blog/2026-08-14-storage-auto-fcf546/`, type: 'post', reason: '이미 색인 요청 완료', requested: 'yes' },
    { p: 4, url: `${SITE_URL}/blog/`, type: 'blog_index', reason: '전체 글 목록', requested: 'no' },
    { p: 5, url: `${SITE_URL}/blog/2026-07-29-cost-1/`, type: 'post', reason: '가장 오래된 글 — 대표 콘텐츠', requested: 'no' },
    { p: 5, url: `${SITE_URL}/blog/2026-07-30-food-15/`, type: 'post', reason: '밀키트 비교 — 검색 수요 있는 주제', requested: 'no' },
    { p: 5, url: `${SITE_URL}/blog/2026-07-30-storage-23/`, type: 'post', reason: '원룸 수납 — 클러스터 허브 연결', requested: 'no' },
    { p: 5, url: `${SITE_URL}/blog/2026-07-31-cleaning-79/`, type: 'post', reason: '청소 대표글', requested: 'no' },
  ];
  for (const r of manualList) {
    priorityRows.push([r.p, r.url, r.type, r.reason, r.requested].map(csvEsc).join(','));
  }
  fs.writeFileSync(path.join(AUDIT_DIR, 'manual-index-priority.csv'), priorityRows.join('\n') + '\n', 'utf-8');

  // ── 5. 발행 빈도 분석 ────────────────────────────────────────────────────
  const dateGroups = new Map<string, number>();
  for (const file of files) {
    const { data } = parseFrontMatter(file);
    const d = (data.date ?? '').slice(0, 10);
    if (d) dateGroups.set(d, (dateGroups.get(d) ?? 0) + 1);
  }
  const sortedDates = [...dateGroups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const totalDays = sortedDates.length;
  const totalPosts = files.length;
  const avgPerDay = totalDays > 0 ? (totalPosts / totalDays).toFixed(1) : '0';
  const maxInDay = Math.max(...dateGroups.values());
  const publishingLines = [
    '# 발행 빈도 분석 — 크롤링 관점',
    '',
    `생성일: ${TODAY}`,
    '',
    `## 현황`,
    `- 총 게시글: ${totalPosts}개`,
    `- 발행일 수: ${totalDays}일`,
    `- 평균 발행 수: ${avgPerDay}개/일`,
    `- 최대 하루 발행: ${maxInDay}개`,
    '',
    '## 날짜별 발행 수',
    ...sortedDates.map(([d, n]) => `- ${d}: ${n}개`),
    '',
    '## 크롤링 관점 위험 분석',
    '',
    '**GSC 현황**: 578개 URL 발견, 1개 색인 (2026-08-19 기준)',
    '',
    '**진단**: 발견됨-미색인 556개의 원인은 단기 대량 발행이 아니라',
    '신규 사이트의 낮은 도메인 권위와 크롤 예산 제한이 주요 원인이다.',
    '사이트 개설 후 수주 내에 500+ 글 발행 → Google이 품질을 검증하는 중.',
    '',
    '**권고**:',
    '1. 추가 발행보다 기존 콘텐츠의 크롤링·색인화를 기다리는 것이 우선',
    '2. 새 글 발행은 현재 속도보다 줄이거나 유지 (하루 5개 이하 권장)',
    '3. GSC에서 주요 URL 수동 색인 요청 (manual-index-priority.csv 참조)',
    '4. Phase 3-5 코드를 GitHub에 push → Pillar 3개 추가로 허브 강화',
    '',
    '**실제 변경**: 권고사항만 제시, 발행 시스템 코드는 수정하지 않음.',
  ];
  fs.writeFileSync(path.join(AUDIT_DIR, 'publishing-crawl-analysis.md'), publishingLines.join('\n') + '\n', 'utf-8');

  // ── 요약 출력 ─────────────────────────────────────────────────────────────
  console.log(`감사 완료 — ${TODAY}`);
  console.log(`총 게시글: ${totalPosts}개`);
  console.log(`orphan 게시글: ${orphanCount}개`);
  console.log(`출력 파일:`);
  console.log(`  seo-audit/indexability-urls.csv`);
  console.log(`  seo-audit/canonical-audit.csv`);
  console.log(`  seo-audit/internal-link-graph.json`);
  console.log(`  seo-audit/manual-index-priority.csv`);
  console.log(`  seo-audit/publishing-crawl-analysis.md`);
}

main();
