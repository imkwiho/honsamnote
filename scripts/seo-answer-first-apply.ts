// SEO 5단계 §16-20 — Answer-first 후보 선택 적용.
// 62개 중 다음 조건 모두 충족 시에만 실제 변경:
// 1) safe_to_improve=yes
// 2) 이미 "먼저 확인할 결론" 또는 "결론부터" 같은 섹션이 본문에 존재
// 3) 해당 섹션이 "문제 상황" 뒤에 있는 경우 → 앞으로 이동
// 4) P1 고위험 카테고리(housing/safety/legal) 아닌 경우
// 새 내용을 만들지 않는다 — 기존 결론 섹션 위치만 변경.
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const AUDIT_DIR = path.join(process.cwd(), 'seo-audit');
const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');
const TODAY = new Date().toISOString().slice(0, 10);

// P1 고위험 — 이 카테고리는 건드리지 않는다
const P1_CATEGORIES = new Set(['housing', 'safety', 'legal']);

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

// 결론 섹션 헤더 패턴
const CONCLUSION_HEADERS = [
  /^##\s*(먼저\s*확인할\s*결론|결론부터|핵심\s*결론|한줄\s*요약|요약|결론|정리하면|총정리)/m,
];

// 문제 상황 섹션 헤더 패턴
const PROBLEM_HEADERS = [
  /^##\s*(문제\s*상황|상황|배경|문제)/m,
];

interface AnalysisResult {
  post_id: string;
  category: string;
  title: string;
  search_intent: string;
  has_conclusion_section: boolean;
  conclusion_section_title: string;
  problem_section_present: boolean;
  conclusion_before_problem: boolean;
  p1_category: boolean;
  action: 'APPLY' | 'SKIP_P1' | 'SKIP_NO_CONCLUSION' | 'SKIP_ALREADY_FIRST' | 'SKIP_NO_PROBLEM';
  applied: boolean;
  note: string;
}

function analyzeAndApply(post_id: string, category: string, title: string, intent: string, dryRun = false): AnalysisResult {
  const mdxPath = path.join(BLOG_DIR, `${post_id}.mdx`);
  const result: AnalysisResult = {
    post_id,
    category,
    title,
    search_intent: intent,
    has_conclusion_section: false,
    conclusion_section_title: '',
    problem_section_present: false,
    conclusion_before_problem: false,
    p1_category: P1_CATEGORIES.has(category),
    action: 'SKIP_NO_CONCLUSION',
    applied: false,
    note: '',
  };

  if (!fs.existsSync(mdxPath)) {
    result.note = '파일 없음';
    return result;
  }

  // P1 건너뛰기
  if (result.p1_category) {
    result.action = 'SKIP_P1';
    result.note = `P1 고위험 카테고리(${category}) — 건드리지 않음`;
    return result;
  }

  const raw = fs.readFileSync(mdxPath, 'utf-8');
  const { data, content } = matter(raw);

  // 결론 섹션 탐지
  let conclusionMatch: RegExpExecArray | null = null;
  for (const re of CONCLUSION_HEADERS) {
    conclusionMatch = re.exec(content);
    if (conclusionMatch) break;
  }

  if (!conclusionMatch) {
    result.action = 'SKIP_NO_CONCLUSION';
    result.note = '결론 섹션 없음 — 새 내용 작성 불필요 원칙에 따라 건너뜀';
    return result;
  }

  result.has_conclusion_section = true;
  result.conclusion_section_title = conclusionMatch[0].trim();

  // 문제 상황 섹션 탐지
  let problemMatch: RegExpExecArray | null = null;
  for (const re of PROBLEM_HEADERS) {
    problemMatch = re.exec(content);
    if (problemMatch) break;
  }

  result.problem_section_present = !!problemMatch;

  if (!problemMatch) {
    result.action = 'SKIP_NO_PROBLEM';
    result.note = '문제 상황 섹션 없음 — 구조가 다름';
    return result;
  }

  // 결론이 이미 문제 상황보다 앞에 있는지 확인
  const conclusionPos = conclusionMatch.index;
  const problemPos = problemMatch.index;

  result.conclusion_before_problem = conclusionPos < problemPos;

  if (result.conclusion_before_problem) {
    result.action = 'SKIP_ALREADY_FIRST';
    result.note = '결론이 이미 문제 상황보다 앞에 있음 — 변경 불필요';
    return result;
  }

  // APPLY 대상
  result.action = 'APPLY';

  if (!dryRun) {
    // 섹션 분리: 문제 상황부터 결론 직전까지 / 결론부터 다음 ## 까지
    // 전략: content를 줄 단위로 파싱하여 섹션을 재배열
    const lines = content.split('\n');

    // 각 ## 섹션의 시작 인덱스 찾기
    const sectionStarts: { idx: number; header: string }[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (/^##\s/.test(lines[i])) sectionStarts.push({ idx: i, header: lines[i] });
    }

    if (sectionStarts.length < 2) {
      result.note = '섹션 수 부족 — 변경 불필요';
      result.action = 'SKIP_NO_PROBLEM';
      return result;
    }

    // 섹션 내용 추출
    const sections: { header: string; body: string[] }[] = [];
    for (let s = 0; s < sectionStarts.length; s++) {
      const start = sectionStarts[s].idx;
      const end = s + 1 < sectionStarts.length ? sectionStarts[s + 1].idx : lines.length;
      sections.push({
        header: sectionStarts[s].header,
        body: lines.slice(start, end),
      });
    }

    // 결론 섹션 식별
    const conclusionSectionIdx = sections.findIndex(s =>
      CONCLUSION_HEADERS.some(re => re.test(s.header))
    );
    if (conclusionSectionIdx === -1) {
      result.note = '섹션 재파싱 후 결론 섹션 없음';
      result.action = 'SKIP_NO_CONCLUSION';
      return result;
    }

    // 문제 상황 섹션 식별
    const problemSectionIdx = sections.findIndex(s =>
      PROBLEM_HEADERS.some(re => re.test(s.header))
    );
    if (problemSectionIdx === -1 || problemSectionIdx > conclusionSectionIdx) {
      result.note = '섹션 순서 불명확 — 변경 건너뜀';
      result.action = 'SKIP_NO_PROBLEM';
      return result;
    }

    // 새 순서: [결론 섹션] → [나머지 섹션들]
    const conclusionSection = sections[conclusionSectionIdx];
    const otherSections = sections.filter((_, i) => i !== conclusionSectionIdx);

    // 재조합: content에 섹션 앞 내용(있으면) + 결론 + 나머지
    const contentBeforeFirstSection = lines.slice(0, sectionStarts[0].idx).join('\n');
    const newContent = [
      contentBeforeFirstSection,
      conclusionSection.body.join('\n'),
      '',
      otherSections.map(s => s.body.join('\n')).join('\n'),
    ].filter(s => s !== '').join('\n');

    const newRaw = matter.stringify(newContent.trimEnd() + '\n', data);
    fs.writeFileSync(mdxPath, newRaw, 'utf-8');

    result.applied = true;
    result.note = `결론 섹션("${conclusionSection.header.trim()}")을 첫 번째 섹션으로 이동 완료`;
  } else {
    result.note = `[DRY RUN] 결론 섹션("${result.conclusion_section_title}")을 첫 번째 섹션으로 이동 예정`;
  }

  return result;
}

function main() {
  const afPath = path.join(AUDIT_DIR, 'answer-first-candidates.csv');
  if (!fs.existsSync(afPath)) {
    console.error('answer-first-candidates.csv 없음');
    process.exit(1);
  }

  const rawLines = fs.readFileSync(afPath, 'utf-8').replace(/^﻿/, '').split('\n').filter(Boolean);
  // CSV header: post_id,url,title,primary_keyword,search_intent,has_answer_signal,emotional_intro,answer_delayed,kw_position,safe_to_improve,...
  const safeCandidates = rawLines.slice(1).filter(l => {
    const cols = parseCsvRow(l);
    return cols[9]?.trim() === 'yes';
  });

  console.log(`Answer-first 안전 후보: ${safeCandidates.length}개 처리 중...`);

  // 백업
  const backupDir = path.join(process.cwd(), 'backup');
  fs.mkdirSync(backupDir, { recursive: true });

  // DRY RUN 먼저
  const dryResults: AnalysisResult[] = [];
  for (const l of safeCandidates) {
    const cols = parseCsvRow(l);
    const post_id = cols[0]?.trim() ?? '';
    const title = cols[2]?.trim() ?? '';
    const intent = cols[4]?.trim() ?? '';

    if (!post_id) continue;

    // 카테고리 추출 (post_id 패턴: YYYY-MM-DD-CATEGORY-...)
    const catMatch = post_id.match(/^\d{4}-\d{2}-\d{2}-([a-z]+)/);
    const category = catMatch ? catMatch[1] : '';

    dryResults.push(analyzeAndApply(post_id, category, title, intent, true));
  }

  const applyTargets = dryResults.filter(r => r.action === 'APPLY');
  console.log(`  적용 대상: ${applyTargets.length}개`);
  console.log(`  건너뜀(P1): ${dryResults.filter(r => r.action === 'SKIP_P1').length}개`);
  console.log(`  건너뜀(결론 없음): ${dryResults.filter(r => r.action === 'SKIP_NO_CONCLUSION').length}개`);
  console.log(`  건너뜀(이미 앞): ${dryResults.filter(r => r.action === 'SKIP_ALREADY_FIRST').length}개`);

  if (applyTargets.length === 0) {
    console.log('적용 대상 없음.');
  } else {
    // 실제 적용 전 백업
    const backup: Record<string, string> = {};
    for (const r of applyTargets) {
      const mdxPath = path.join(BLOG_DIR, `${r.post_id}.mdx`);
      if (fs.existsSync(mdxPath)) backup[r.post_id] = fs.readFileSync(mdxPath, 'utf-8');
    }
    fs.writeFileSync(
      path.join(backupDir, `answer-first-before-${TODAY}.json`),
      JSON.stringify(backup, null, 2),
      'utf-8',
    );

    // 실제 적용
    const finalResults: AnalysisResult[] = [];
    for (const l of safeCandidates) {
      const cols = parseCsvRow(l);
      const post_id = cols[0]?.trim() ?? '';
      const title = cols[2]?.trim() ?? '';
      const intent = cols[4]?.trim() ?? '';
      if (!post_id) continue;
      const catMatch = post_id.match(/^\d{4}-\d{2}-\d{2}-([a-z]+)/);
      const category = catMatch ? catMatch[1] : '';
      finalResults.push(analyzeAndApply(post_id, category, title, intent, false));
    }

    const applied = finalResults.filter(r => r.applied);
    console.log(`  실제 적용 완료: ${applied.length}개`);

    // 결과 CSV
    const columns = ['post_id', 'category', 'title', 'search_intent', 'has_conclusion_section',
      'conclusion_section_title', 'p1_category', 'action', 'applied', 'note'] as const;
    const csvOut = columns.join(',') + '\n'
      + finalResults.map(r => columns.map(c => csvEsc(String(r[c] ?? ''))).join(',')).join('\n') + '\n';
    fs.writeFileSync(path.join(AUDIT_DIR, 'answer-first-applied.csv'), csvOut, 'utf-8');

    console.log(`백업: backup/answer-first-before-${TODAY}.json`);
  }

  // 결과 CSV (dry run 결과도 저장)
  const columns = ['post_id', 'category', 'title', 'search_intent', 'has_conclusion_section',
    'conclusion_section_title', 'p1_category', 'action', 'applied', 'note'] as const;
  const csvOut = columns.join(',') + '\n'
    + dryResults.map(r => columns.map(c => csvEsc(String(r[c] ?? ''))).join(',')).join('\n') + '\n';
  fs.writeFileSync(path.join(AUDIT_DIR, 'answer-first-applied.csv'), csvOut, 'utf-8');
  console.log('출력: seo-audit/answer-first-applied.csv');
}

main();
