// SEO 5단계 §24-27 — P2 355건 관리 구조 초기화.
// 이번 단계에서 실제 내용을 수정하지 않는다.
// 재검토 주기를 설정하고 seo-audit/p2-volatile-claims.json을 생성한다.
import fs from 'fs';
import path from 'path';
import { createVolatileClaimRecord, type VolatileClaimRecord } from '../lib/volatileClaimMeta';

const AUDIT_DIR = path.join(process.cwd(), 'seo-audit');

function parseCsvRow(line: string): string[] {
  const cells: string[] = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      let j = i + 1;
      while (j < line.length) {
        if (line[j] === '"' && line[j + 1] === '"') j += 2;
        else if (line[j] === '"') { j++; break; }
        else j++;
      }
      cells.push(line.slice(i + 1, j - 1).replace(/""/g, '"'));
      i = j + 1;
    } else {
      const j = line.indexOf(',', i);
      if (j === -1) { cells.push(line.slice(i)); break; }
      cells.push(line.slice(i, j));
      i = j + 1;
    }
  }
  return cells;
}

// claim_type별 변동성 분류
function classifyVolatility(claim_type: string, claim: string): 'HIGH' | 'MEDIUM' | 'LOW' {
  // 가격/비용/요금 — 자주 변동
  if (/가격|비용|요금|금액|원|수수료|임금|급여/.test(claim_type) ||
      /만\s*원|\d+원|\d+%/.test(claim)) return 'HIGH';

  // 법률/행정 — 가끔 변동 (개정 가능)
  if (/법률|행정|규정|정책/.test(claim_type)) return 'MEDIUM';

  // 통계/일반 수치
  if (/통계|수치/.test(claim_type)) return 'MEDIUM';

  return 'LOW';
}

function main() {
  const fcPath = path.join(AUDIT_DIR, 'factcheck-details.csv');
  if (!fs.existsSync(fcPath)) {
    console.error('factcheck-details.csv 없음');
    process.exit(1);
  }

  const rawLines = fs.readFileSync(fcPath, 'utf-8').replace(/^﻿/, '').split('\n').filter(Boolean);
  const p2Lines = rawLines.slice(1).filter(l => {
    const cols = parseCsvRow(l);
    return cols[4]?.trim() === 'P2';
  });

  const records: VolatileClaimRecord[] = [];
  const today = new Date().toISOString().slice(0, 10);

  for (const l of p2Lines) {
    const cols = parseCsvRow(l);
    const post_id = cols[1]?.trim() ?? '';
    const claim = (cols[5]?.trim() ?? '').slice(0, 200);
    const claim_type = cols[6]?.trim() ?? '';
    const current_value = cols[7]?.trim() ?? '';

    if (!post_id || !claim) continue;

    const volatility = classifyVolatility(claim_type, current_value || claim);

    records.push(createVolatileClaimRecord({
      post_id,
      claim: claim.slice(0, 150),
      claim_type,
      risk_level: 'P2',
      volatility,
      verified_date: today, // 아직 실제 검증 안 됨 — 이후 검증 시 업데이트
      source_url: '', // 외부 확인 후 채워넣을 것
    }));
  }

  // 변동성별 집계
  const highV = records.filter(r => r.volatility === 'HIGH').length;
  const medV = records.filter(r => r.volatility === 'MEDIUM').length;
  const lowV = records.filter(r => r.volatility === 'LOW').length;

  // 재검토 일자 분포
  const recheckByMonth: Record<string, number> = {};
  for (const r of records) {
    const month = r.next_review_date.slice(0, 7);
    recheckByMonth[month] = (recheckByMonth[month] ?? 0) + 1;
  }

  const output = {
    generatedAt: new Date().toISOString(),
    totalP2Claims: records.length,
    volatilityDistribution: { HIGH: highV, MEDIUM: medV, LOW: lowV },
    recheckSchedule: recheckByMonth,
    note: 'P2 355건 관리 구조 초기화. verified_date는 현재 미검증 상태이며 실제 확인 후 업데이트 필요.',
    records,
  };

  fs.writeFileSync(
    path.join(AUDIT_DIR, 'p2-volatile-claims.json'),
    JSON.stringify(output, null, 2),
    'utf-8',
  );

  // CSV 요약
  const csvCols = ['post_id', 'claim_type', 'volatility', 'verified_date', 'recheck_interval_days', 'next_review_date', 'status', 'claim'];
  const csvRows = records.map(r =>
    csvCols.map(c => {
      const v = String(r[c as keyof VolatileClaimRecord] ?? '');
      return v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
    }).join(',')
  );
  fs.writeFileSync(
    path.join(AUDIT_DIR, 'p2-recheck-schedule.csv'),
    csvCols.join(',') + '\n' + csvRows.join('\n') + '\n',
    'utf-8',
  );

  console.log(`P2 변동 정보 구조 초기화 완료 — ${records.length}건`);
  console.log(`  HIGH(90일): ${highV}건 / MEDIUM(180일): ${medV}건 / LOW(365일): ${lowV}건`);
  console.log('  재검토 일정:');
  for (const [month, count] of Object.entries(recheckByMonth).sort()) {
    console.log(`    ${month}: ${count}건`);
  }
  console.log('출력: seo-audit/p2-volatile-claims.json, seo-audit/p2-recheck-schedule.csv');
}

main();
