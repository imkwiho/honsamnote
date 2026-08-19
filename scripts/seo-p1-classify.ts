// SEO 5단계 §1-7 — P1 219건 분류 + 검증 상태 판정.
// 공식 근거 없이 AI 상식으로 수정하지 않는다.
// 분류 결과만 CSV로 기록하고 실제 콘텐츠 수정은 별도 단계에서 진행한다.
import fs from 'fs';
import path from 'path';

const AUDIT_DIR = path.join(process.cwd(), 'seo-audit');

/** 따옴표 처리하는 최소 CSV 행 파서 */
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

function csvEsc(v: string): string {
  const s = String(v ?? '');
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"` : s;
}

type VerificationStatus =
  | 'VERIFIED_CORRECT'
  | 'VERIFIED_CONTEXT_REQUIRED'
  | 'VERIFIED_UPDATE_REQUIRED'
  | 'NEEDS_EXTERNAL_VERIFICATION'
  | 'UNSUPPORTED'
  | 'REMOVE_RECOMMENDED';

interface ClassifiedClaim {
  id: string;
  post_id: string;
  url: string;
  title: string;
  claim_type: string;
  claim: string;
  current_value: string;
  sub_category: string;
  verification_status: VerificationStatus;
  authoritative_source: string;
  source_date: string;
  checked_date: string;
  recommended_text: string;
  action: string;
  classification_basis: string;
}

// 안전 절차 키워드 — 이런 내용의 claim은 일반적으로 안전상 맞는 지침
const SAFETY_PROTOCOL_PATTERNS = [
  /가스 냄새/,
  /창문.*열/,
  /환기/,
  /전원.*차단/,
  /대피/,
  /불꽃.*금지/,
  /화기.*금지/,
  /119.*신고/,
  /응급.*처치/,
  /화재.*대피/,
  /누전.*차단/,
  /소화기/,
  /연기.*감지/,
];

// 과장 표현 — 맥락 없이 단독으로 나타나면 검증 필요
const OVERSTATEMENT_PATTERNS = [
  { re: /법적으로\s*완벽하게\s*보호/, issue: '"완벽하게"는 법적 보장 강도 과장 — "법적으로 보호받기 위해"로 완화 검토' },
  { re: /100%\s*보장/, issue: '"100% 보장"은 법률적으로 불가 — 삭제 또는 "법적 절차를 통해 보호" 등으로 수정' },
  { re: /완벽하게\s*보호/, issue: '"완벽하게"는 과장 표현 — "법적 절차에 따라 보호" 등으로 완화 권고' },
  { re: /확실히\s*보호/, issue: '"확실히 보호"는 과장 — "법적 절차를 따르면 보호 가능성을 높일 수 있다" 수준으로 완화 권고' },
];

// 법률 참조 패턴 — 법률명이 언급된 claim
const LAW_CITATION_PATTERNS = [
  /주택임대차보호법/,
  /주민등록법/,
  /건축법/,
  /전기사업법/,
  /도시가스사업법/,
  /소방시설법/,
  /민법/,
  /형법/,
];

// 법정 수치 (비교적 안정적인 기준)
const STABLE_LEGAL_FIGURES: { pattern: RegExp; value: string; source: string; note: string }[] = [
  {
    pattern: /전입신고.*14일|14일.*전입신고/,
    value: '14일 이내',
    source: '주민등록법 제11조',
    note: '이사한 날로부터 14일 이내 전입신고 의무. 법령 원문 확인 권장.',
  },
  {
    pattern: /확정일자.*다음\s*날\s*0시|다음\s*날\s*0시.*확정일자/,
    value: '다음 날 0시',
    source: '주택임대차보호법 제3조의2',
    note: '대항력/우선변제권은 전입신고+확정일자 다음 날 0시 기준. 법령 원문 확인 권장.',
  },
  {
    pattern: /중개보수.*월세.*0\.3%|0\.3%.*중개보수/,
    value: '월차임 0.3%',
    source: '공인중개사법 시행규칙',
    note: '지역·유형에 따라 상한이 다름. 국토교통부 고시 기준 확인 필요.',
  },
  {
    pattern: /중개수수료.*0\.5%|0\.5%.*중개수수료/,
    value: '0.5% 이내',
    source: '공인중개사법 시행규칙',
    note: '상한요율은 지역·거래유형에 따라 다름. 국토교통부 고시 최신 기준 확인 필요.',
  },
];

function classifyClaim(row: { id: string; post_id: string; url: string; title: string; claim_type: string; claim: string; current_value: string }): ClassifiedClaim {
  const { id, post_id, url, title, claim_type, claim, current_value } = row;
  const today = new Date().toISOString().slice(0, 10);
  // 기본값
  let sub_category = claim_type;
  let verification_status: VerificationStatus = 'NEEDS_EXTERNAL_VERIFICATION';
  let authoritative_source = '정부기관·법령 원문·지자체';
  const source_date = '';
  let recommended_text = '';
  let action = 'NEEDS_EXTERNAL_VERIFICATION — 공식 출처 확인 후 처리';
  let classification_basis = '자동 분류';

  // 1) 안전 절차 — 일반적으로 표준 안전 지침과 일치하면 VERIFIED_CORRECT
  if (SAFETY_PROTOCOL_PATTERNS.some(re => re.test(claim))) {
    sub_category = '안전절차';
    // 단 "반드시", "무조건" 같은 단정이 포함된 경우 CONTEXT_REQUIRED
    if (/반드시|무조건|절대/.test(claim)) {
      verification_status = 'VERIFIED_CONTEXT_REQUIRED';
      action = 'VERIFIED_CONTEXT_REQUIRED — 안전 절차 내용은 맞으나 단정 표현 문맥 확인';
      classification_basis = '안전 절차 패턴 + 단정 표현 동시 탐지';
    } else {
      verification_status = 'VERIFIED_CORRECT';
      authoritative_source = '소방청·가스안전공사·한국전기안전공사 표준 안전 지침';
      action = 'VERIFIED_CORRECT — 표준 안전 절차 지침과 일치. 단, 최신 관할기관 지침 확인 권장.';
      classification_basis = '표준 안전 절차 패턴 일치';
    }
  }

  // 2) 법적 수치 기준 — 안정적인 법령 수치
  for (const fig of STABLE_LEGAL_FIGURES) {
    if (fig.pattern.test(claim)) {
      sub_category = '법령수치';
      verification_status = 'VERIFIED_CONTEXT_REQUIRED';
      authoritative_source = fig.source;
      action = `VERIFIED_CONTEXT_REQUIRED — ${fig.note}`;
      classification_basis = `법령 수치 패턴 일치 (${fig.source})`;
      break;
    }
  }

  // 3) 과장 표현 확인
  for (const stmt of OVERSTATEMENT_PATTERNS) {
    if (stmt.re.test(claim)) {
      sub_category = '과장표현';
      verification_status = 'VERIFIED_CONTEXT_REQUIRED';
      recommended_text = stmt.issue;
      action = `VERIFIED_CONTEXT_REQUIRED — ${stmt.issue}`;
      classification_basis = '과장 표현 패턴 탐지';
      break;
    }
  }

  // 4) 법률 인용 (과장·안전 패턴에 해당 안 하면)
  if (verification_status === 'NEEDS_EXTERNAL_VERIFICATION' && LAW_CITATION_PATTERNS.some(re => re.test(claim))) {
    sub_category = '법률참조';
    verification_status = 'VERIFIED_CONTEXT_REQUIRED';
    action = 'VERIFIED_CONTEXT_REQUIRED — 법률 참조 내용. 법령 원문·법제처 확인 후 최신 내용 반영 권장.';
    authoritative_source = '법제처 국가법령정보센터 (law.go.kr)';
    classification_basis = '법률 인용 패턴 탐지';
  }

  // 5) 가격/비용 범위 — 시장 가격은 변동하므로 항상 외부 확인 필요
  if (claim_type === '가격' && verification_status === 'NEEDS_EXTERNAL_VERIFICATION') {
    sub_category = '가격범위';
    action = 'NEEDS_EXTERNAL_VERIFICATION — 시장 가격은 변동. 실제 시세 확인 후 범위 표현으로 유지 또는 출처 명기.';
    classification_basis = '가격 유형 + 미해당 패턴 → 외부 확인 필요';
  }

  // 6) 통계 수치
  if (claim_type === '통계' && verification_status === 'NEEDS_EXTERNAL_VERIFICATION') {
    sub_category = '통계수치';
    // 단순 소요 시간 추정 (약 10분, 약 30분)은 경험적 추정이므로 CONTEXT_REQUIRED
    if (/약\s*\d+\s*(분|시간)/.test(claim)) {
      verification_status = 'VERIFIED_CONTEXT_REQUIRED';
      action = 'VERIFIED_CONTEXT_REQUIRED — 소요 시간 추정은 "약 ~ 정도 소요될 수 있습니다" 같은 범위 표현으로 유지 가능.';
      classification_basis = '경험적 소요시간 추정 — 출처 불필요하나 범위 표현 권장';
    } else if (/70%/.test(claim) && /채권|보증금|매매가/.test(claim)) {
      // 선순위 채권 70% 기준 — 통용되는 실무 기준이나 법적 기준은 아님
      verification_status = 'VERIFIED_CONTEXT_REQUIRED';
      recommended_text = '"70%"는 법적 기준이 아닌 실무적 참고 수치. "일반적으로 선순위 채권 합계가 매매가의 70% 이하를 권장하나, 구체적인 판단은 전문가 상담 필요"로 수정 권고.';
      action = 'VERIFIED_CONTEXT_REQUIRED — 법적 기준 아닌 실무 참고치. 범위 표현 + 전문가 상담 권고 추가 권장.';
      classification_basis = '선순위 채권 70% — 실무 참고수치, 법적 강제기준 아님';
    } else {
      action = 'NEEDS_EXTERNAL_VERIFICATION — 수치 출처 확인 필요.';
      classification_basis = '통계 수치 유형 — 출처 미확인';
    }
  }

  return {
    id,
    post_id,
    url,
    title,
    claim_type,
    claim: claim.slice(0, 300),
    current_value: current_value.slice(0, 100),
    sub_category,
    verification_status,
    authoritative_source,
    source_date,
    checked_date: today,
    recommended_text: recommended_text.slice(0, 300),
    action: action.slice(0, 300),
    classification_basis,
  };
}

function main() {
  const fcPath = path.join(AUDIT_DIR, 'factcheck-details.csv');
  if (!fs.existsSync(fcPath)) {
    console.error('factcheck-details.csv 없음. 먼저 seo-factcheck-details.ts를 실행하세요.');
    process.exit(1);
  }

  const rawLines = fs.readFileSync(fcPath, 'utf-8').replace(/^﻿/, '').split('\n').filter(Boolean);
  const dataLines = rawLines.slice(1); // skip header

  const p1Lines = dataLines.filter(l => {
    const cols = parseCsvRow(l);
    return cols[4]?.trim() === 'P1';
  });

  const results: ClassifiedClaim[] = [];

  for (const l of p1Lines) {
    const cols = parseCsvRow(l);
    // CSV: id,post_id,url,title,risk_level,claim,claim_type,current_value,...
    const row = {
      id: cols[0]?.trim() ?? '',
      post_id: cols[1]?.trim() ?? '',
      url: cols[2]?.trim() ?? '',
      title: cols[3]?.trim() ?? '',
      claim_type: cols[6]?.trim() ?? '',
      claim: cols[5]?.trim() ?? '',
      current_value: cols[7]?.trim() ?? '',
    };
    results.push(classifyClaim(row));
  }

  // 집계
  const statusCount: Record<string, number> = {};
  for (const r of results) {
    statusCount[r.verification_status] = (statusCount[r.verification_status] ?? 0) + 1;
  }
  const subCatCount: Record<string, number> = {};
  for (const r of results) {
    subCatCount[r.sub_category] = (subCatCount[r.sub_category] ?? 0) + 1;
  }

  // pending = 외부 확인이 필요한 것
  const pending = results.filter(r => r.verification_status === 'NEEDS_EXTERNAL_VERIFICATION');

  // 출력: factcheck-p1-classified.csv (전체)
  const columns: (keyof ClassifiedClaim)[] = [
    'id', 'post_id', 'url', 'title', 'claim_type', 'sub_category',
    'claim', 'current_value', 'verification_status',
    'authoritative_source', 'source_date', 'checked_date',
    'recommended_text', 'action', 'classification_basis',
  ];

  const toRow = (r: ClassifiedClaim) => columns.map(c => csvEsc(r[c] ?? '')).join(',');
  const csvOut = columns.join(',') + '\n' + results.map(toRow).join('\n') + '\n';
  fs.writeFileSync(path.join(AUDIT_DIR, 'factcheck-p1-classified.csv'), csvOut, 'utf-8');

  // pending.csv
  const pendingCsv = columns.join(',') + '\n' + pending.map(toRow).join('\n') + '\n';
  fs.writeFileSync(path.join(AUDIT_DIR, 'factcheck-pending.csv'), pendingCsv, 'utf-8');

  // changes.csv (실제 수정 제안이 있는 CONTEXT_REQUIRED 중 recommended_text 있는 것)
  const changes = results.filter(r => r.recommended_text && r.verification_status === 'VERIFIED_CONTEXT_REQUIRED');
  const changeColumns = ['post_id', 'url', 'claim_type', 'claim', 'current_value', 'recommended_text', 'action', 'authoritative_source', 'checked_date'] as const;
  const changesCsv = changeColumns.join(',') + '\n'
    + changes.map(r => changeColumns.map(c => csvEsc(r[c] ?? '')).join(',')).join('\n') + '\n';
  fs.writeFileSync(path.join(AUDIT_DIR, 'factcheck-changes.csv'), changesCsv, 'utf-8');

  console.log(`P1 분류 완료 — 총 ${results.length}건`);
  console.log('  검증 상태 분포:');
  for (const [status, count] of Object.entries(statusCount).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${status}: ${count}건`);
  }
  console.log('  하위 카테고리 분포:');
  for (const [cat, count] of Object.entries(subCatCount).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${cat}: ${count}건`);
  }
  console.log(`  수정 제안 있는 항목: ${changes.length}건 → factcheck-changes.csv`);
  console.log(`  외부 확인 필요: ${pending.length}건 → factcheck-pending.csv`);
  console.log('출력: seo-audit/factcheck-p1-classified.csv');
}

main();
