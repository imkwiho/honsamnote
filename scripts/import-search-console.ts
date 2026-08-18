// SEO 4단계 §20 — Google Search Console CSV 임포터.
// 사용법: npx tsx scripts/import-search-console.ts <path-to-gsc-export.csv>
// Search Console에서 내보낸 쿼리별 성과 CSV를 파싱해 seo-audit/search-console-import.json으로 저장한다.
//
// 예상 CSV 형식 (Google Search Console 쿼리 보고서):
// "쿼리","클릭수","노출수","CTR","평균 게재순위"
// "원룸 정리하는 법","120","4500","2.67%","8.2"
import fs from 'fs';
import path from 'path';
import { AUDIT_DIR, ensureAuditDir } from './lib/seoPhase4Shared';

interface GscRow {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface GscPageRow {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

function parseGscCsv(csvText: string): GscRow[] {
  const lines = csvText.replace(/^﻿/, '').split('\n').filter(Boolean);
  if (lines.length < 2) return [];
  // 헤더 파싱으로 컬럼 순서 자동 감지
  const header = parseRow(lines[0]).map(h => h.toLowerCase().trim());
  const qIdx = header.findIndex(h => h.includes('쿼리') || h === 'query' || h === 'top queries');
  const cIdx = header.findIndex(h => h.includes('클릭') || h === 'clicks');
  const iIdx = header.findIndex(h => h.includes('노출') || h === 'impressions');
  const tIdx = header.findIndex(h => h.includes('ctr') || h.includes('클릭률'));
  const pIdx = header.findIndex(h => h.includes('순위') || h === 'position' || h.includes('average position'));

  if (qIdx === -1) {
    console.error('CSV에서 쿼리 컬럼을 찾지 못했습니다. 헤더:', header);
    return [];
  }

  const rows: GscRow[] = [];
  for (const line of lines.slice(1)) {
    const cells = parseRow(line);
    const query = cells[qIdx]?.trim();
    if (!query) continue;
    rows.push({
      query,
      clicks: cIdx >= 0 ? parseInt(cells[cIdx]?.replace(/,/g, '') || '0', 10) : 0,
      impressions: iIdx >= 0 ? parseInt(cells[iIdx]?.replace(/,/g, '') || '0', 10) : 0,
      ctr: tIdx >= 0 ? parseFloat(cells[tIdx]?.replace('%', '') || '0') : 0,
      position: pIdx >= 0 ? parseFloat(cells[pIdx] || '0') : 0,
    });
  }
  return rows;
}

function parseGscPageCsv(csvText: string): GscPageRow[] {
  const lines = csvText.replace(/^﻿/, '').split('\n').filter(Boolean);
  if (lines.length < 2) return [];
  const header = parseRow(lines[0]).map(h => h.toLowerCase().trim());
  const pgIdx = header.findIndex(h => h.includes('페이지') || h === 'page' || h.includes('top pages'));
  const cIdx = header.findIndex(h => h.includes('클릭') || h === 'clicks');
  const iIdx = header.findIndex(h => h.includes('노출') || h === 'impressions');
  const tIdx = header.findIndex(h => h.includes('ctr') || h.includes('클릭률'));
  const pIdx = header.findIndex(h => h.includes('순위') || h === 'position' || h.includes('average position'));

  if (pgIdx === -1) return [];
  const rows: GscPageRow[] = [];
  for (const line of lines.slice(1)) {
    const cells = parseRow(line);
    const page = cells[pgIdx]?.trim();
    if (!page) continue;
    rows.push({
      page,
      clicks: cIdx >= 0 ? parseInt(cells[cIdx]?.replace(/,/g, '') || '0', 10) : 0,
      impressions: iIdx >= 0 ? parseInt(cells[iIdx]?.replace(/,/g, '') || '0', 10) : 0,
      ctr: tIdx >= 0 ? parseFloat(cells[tIdx]?.replace('%', '') || '0') : 0,
      position: pIdx >= 0 ? parseFloat(cells[pIdx] || '0') : 0,
    });
  }
  return rows;
}

/** 쉼표 구분 CSV 행 파싱 (따옴표 지원) */
function parseRow(line: string): string[] {
  const cells: string[] = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      let j = i + 1;
      while (j < line.length) {
        if (line[j] === '"' && line[j + 1] === '"') { j += 2; }
        else if (line[j] === '"') { j++; break; }
        else { j++; }
      }
      cells.push(line.slice(i + 1, j - 1).replace(/""/g, '"'));
      i = j + 1; // skip comma
    } else {
      const j = line.indexOf(',', i);
      if (j === -1) { cells.push(line.slice(i)); break; }
      cells.push(line.slice(i, j));
      i = j + 1;
    }
  }
  return cells;
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    // 데모 모드: 샘플 구조만 생성
    console.log('사용법: npx tsx scripts/import-search-console.ts <query-csv> [page-csv]');
    console.log('');
    console.log('Google Search Console → 성과 → 쿼리별 보고서를 CSV로 내보내서 첫 번째 인수로 지정하세요.');
    console.log('페이지별 보고서 CSV는 두 번째 인수(선택)로 지정 가능합니다.');
    console.log('');

    // 빈 플레이스홀더 파일 생성
    ensureAuditDir();
    const placeholder = {
      importedAt: new Date().toISOString(),
      source: 'PLACEHOLDER — 실제 데이터 미연결',
      note: 'Google Search Console CSV를 임포트하려면: npx tsx scripts/import-search-console.ts <query.csv> [page.csv]',
      queryRows: [],
      pageRows: [],
      summary: {
        totalQueries: 0,
        totalClicks: 0,
        totalImpressions: 0,
        avgPosition: null,
        top10Queries: [],
        top10Pages: [],
      },
    };
    fs.writeFileSync(
      path.join(AUDIT_DIR, 'search-console-import.json'),
      JSON.stringify(placeholder, null, 2),
      'utf-8',
    );
    console.log('플레이스홀더 생성: seo-audit/search-console-import.json');
    return;
  }

  const queryFile = args[0];
  const pageFile = args[1];

  if (!fs.existsSync(queryFile)) {
    console.error(`파일 없음: ${queryFile}`);
    process.exit(1);
  }

  const queryRows = parseGscCsv(fs.readFileSync(queryFile, 'utf-8'));
  const pageRows = pageFile && fs.existsSync(pageFile)
    ? parseGscPageCsv(fs.readFileSync(pageFile, 'utf-8'))
    : [];

  const totalClicks = queryRows.reduce((a, r) => a + r.clicks, 0);
  const totalImpressions = queryRows.reduce((a, r) => a + r.impressions, 0);
  const avgPosition = queryRows.length > 0
    ? Math.round(queryRows.reduce((a, r) => a + r.position, 0) / queryRows.length * 10) / 10
    : null;

  const output = {
    importedAt: new Date().toISOString(),
    source: path.basename(queryFile),
    queryRows: queryRows.sort((a, b) => b.clicks - a.clicks),
    pageRows: pageRows.sort((a, b) => b.clicks - a.clicks),
    summary: {
      totalQueries: queryRows.length,
      totalClicks,
      totalImpressions,
      avgPosition,
      top10Queries: queryRows.slice(0, 10).map(r => ({ query: r.query, clicks: r.clicks, position: r.position })),
      top10Pages: pageRows.slice(0, 10).map(r => ({ page: r.page, clicks: r.clicks, position: r.position })),
    },
  };

  ensureAuditDir();
  fs.writeFileSync(
    path.join(AUDIT_DIR, 'search-console-import.json'),
    JSON.stringify(output, null, 2),
    'utf-8',
  );

  console.log(`Search Console 임포트 완료`);
  console.log(`  쿼리 수: ${queryRows.length}개`);
  console.log(`  총 클릭: ${totalClicks.toLocaleString()}`);
  console.log(`  총 노출: ${totalImpressions.toLocaleString()}`);
  if (avgPosition) console.log(`  평균 순위: ${avgPosition}`);
  console.log('출력: seo-audit/search-console-import.json');
}

main();
