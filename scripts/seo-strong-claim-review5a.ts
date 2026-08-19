// SEO 5단계 §6 — HIGH 단정 표현 166개 문맥 검토.
// 단순 문자열 치환하지 않는다. 각 문장의 실제 문맥을 확인하고 결정한다.
// KEEP: 안전상 필요한 강한 지시 표현
// SOFTEN: 근거 없는 과장 — 완화 표현 제안
// REVIEW: 문맥 판단 어려움 — 수동 검토 필요
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const AUDIT_DIR = path.join(process.cwd(), 'seo-audit');
const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');
const TODAY = new Date().toISOString().slice(0, 10);

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

// 강한 표현 목록 (Phase 4 seoPhase4Shared.ts의 STRONG_CLAIM_PHRASES 기준)
const STRONG_PHRASES = [
  { re: /반드시/, label: '반드시' },
  { re: /절대(?:로)?/, label: '절대' },
  { re: /무조건/, label: '무조건' },
  { re: /완전히/, label: '완전히' },
  { re: /100%/, label: '100%' },
  { re: /확실히/, label: '확실히' },
  { re: /완벽하게/, label: '완벽하게' },
  { re: /즉시\s*해결/, label: '즉시해결' },
  { re: /완전\s*박멸/, label: '완전박멸' },
  { re: /가장\s*안전/, label: '가장안전' },
];

// KEEP 가능한 안전 문맥 — 이 패턴과 같이 나오면 강한 표현이 적절
const SAFETY_KEEP_CONTEXTS = [
  /가스.*냄새|냄새.*가스/,
  /화재|불꽃|불씨/,
  /감전|누전/,
  /응급.*상황|응급.*처치/,
  /대피|탈출/,
  /119|소방/,
  /전원.*차단|차단기/,
  /식중독.*증상|식중독.*위험/,
  /범죄.*예방|범죄.*대처/,
];

// SOFTEN 권고 문맥 — 이런 맥락에서 강한 표현은 과장
const SOFTEN_CONTEXTS: { re: RegExp; suggestion: string }[] = [
  {
    re: /바퀴벌레.*(?:반드시|완전히|무조건)|(?:반드시|완전히|무조건).*바퀴벌레/,
    suggestion: '"반드시 완전히 제거"→"효과가 다를 수 있으며, 지속 발생 시 전문 방역 검토 권장"',
  },
  {
    re: /곰팡이.*(?:반드시|완전히|무조건)|(?:반드시|완전히|무조건).*곰팡이/,
    suggestion: '"완전히 제거"→"곰팡이 발생 정도와 위치에 따라 효과가 다를 수 있음"',
  },
  {
    re: /청소.*(?:반드시|무조건)|(?:반드시|무조건).*청소/,
    suggestion: '"반드시" 삭제 또는 "권장합니다"로 완화',
  },
  {
    re: /냄새.*(?:완전히|반드시 제거)|(?:완전히|반드시 제거).*냄새/,
    suggestion: '"완전히 제거"→"냄새를 크게 줄일 수 있으며"',
  },
  {
    re: /100%.*제거|제거.*100%/,
    suggestion: '"100% 제거" 삭제. 효과 편차가 있음을 명시',
  },
  {
    re: /완벽하게.*보호|보호.*완벽하게/,
    suggestion: '"완벽하게 보호"→"보호받기 위해" (완벽 보장 불가)',
  },
];

interface ReviewRow {
  post_id: string;
  url: string;
  category: string;
  title: string;
  phrase_found: string;
  total_occurrences: number;
  sentence_context: string;
  decision: 'KEEP' | 'SOFTEN' | 'REVIEW';
  keep_reason: string;
  soften_suggestion: string;
  checked_date: string;
}

function extractSentencesWithPhrase(content: string, phrase: RegExp): string[] {
  // 마크다운 제거 후 문장 단위로 추출
  const plain = content
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]+`/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  const sentences = plain.split(/(?<=[.!?。])\s+|\n{2,}/);
  return sentences.filter(s => phrase.test(s)).map(s => s.trim().slice(0, 200));
}

function main() {
  // 1. HIGH strong-claim 게시글 로드
  const scPath = path.join(AUDIT_DIR, 'strong-claim-review.csv');
  if (!fs.existsSync(scPath)) {
    console.error('strong-claim-review.csv 없음');
    process.exit(1);
  }

  const rawLines = fs.readFileSync(scPath, 'utf-8').replace(/^﻿/, '').split('\n').filter(Boolean);
  const highPosts = rawLines.slice(1).filter(l => {
    const cols = parseCsvRow(l);
    return cols[6]?.trim() === 'HIGH';
  }).map(l => {
    const cols = parseCsvRow(l);
    return {
      post_id: cols[0]?.trim() ?? '',
      url: cols[1]?.trim() ?? '',
      category: cols[2]?.trim() ?? '',
      title: cols[3]?.trim() ?? '',
      phrases_found: cols[4]?.trim() ?? '',
      total_occurrences: parseInt(cols[5]?.trim() ?? '0', 10),
    };
  });

  console.log(`HIGH 단정 표현 게시글: ${highPosts.length}개 처리 중...`);

  const rows: ReviewRow[] = [];

  for (const post of highPosts) {
    const mdxPath = path.join(BLOG_DIR, `${post.post_id}.mdx`);
    if (!fs.existsSync(mdxPath)) continue;

    const raw = fs.readFileSync(mdxPath, 'utf-8');
    const { content } = matter(raw);

    // 각 강한 표현 패턴별로 문맥 추출 및 결정
    for (const { re, label } of STRONG_PHRASES) {
      re.lastIndex = 0;
      const globalRe = new RegExp(re.source, 'g');
      if (!globalRe.test(content)) continue;

      const sentences = extractSentencesWithPhrase(content, re);
      if (sentences.length === 0) continue;

      const firstSentence = sentences[0];

      // 결정 로직
      let decision: ReviewRow['decision'] = 'REVIEW';
      let keep_reason = '';
      let soften_suggestion = '';

      // KEEP 확인
      const isSafetyContext = SAFETY_KEEP_CONTEXTS.some(ctx => ctx.test(firstSentence));
      if (isSafetyContext) {
        decision = 'KEEP';
        keep_reason = '안전 지침 문맥 — 강한 지시 표현이 적절. 사용자 보호에 필요.';
      } else {
        // SOFTEN 확인
        for (const soften of SOFTEN_CONTEXTS) {
          if (soften.re.test(firstSentence) || (re.test(firstSentence) && soften.re.test(content.slice(Math.max(0, content.indexOf(firstSentence) - 100), content.indexOf(firstSentence) + 300)))) {
            decision = 'SOFTEN';
            soften_suggestion = soften.suggestion;
            break;
          }
        }

        // SOFTEN 후보가 없지만 비안전 맥락 — REVIEW
        if (decision === 'REVIEW') {
          // 법률·행정 맥락에서 "반드시"는 강조 목적으로 적절할 수 있음
          if (/전입신고|확정일자|계약|보증금|신고|세금|보험/.test(firstSentence) && label === '반드시') {
            decision = 'KEEP';
            keep_reason = '법적 의무 절차 강조 — "반드시" 사용 적절. 단 법률 내용 정확성 별도 확인 필요.';
          } else if (label === '100%' || label === '완벽하게') {
            decision = 'SOFTEN';
            soften_suggestion = `"${label}" 표현 — 절대적 보장 불가. "크게 줄일 수 있습니다" 또는 "효과가 있을 수 있습니다" 수준으로 완화 권고.`;
          }
        }
      }

      rows.push({
        post_id: post.post_id,
        url: post.url,
        category: post.category,
        title: post.title,
        phrase_found: label,
        total_occurrences: sentences.length,
        sentence_context: firstSentence.replace(/"/g, "'").slice(0, 250),
        decision,
        keep_reason,
        soften_suggestion,
        checked_date: TODAY,
      });
    }
  }

  // 집계
  const keeps = rows.filter(r => r.decision === 'KEEP').length;
  const softens = rows.filter(r => r.decision === 'SOFTEN').length;
  const reviews = rows.filter(r => r.decision === 'REVIEW').length;

  // 게시글 단위 집계 (SOFTEN이 있는 게시글)
  const softenPosts = new Set(rows.filter(r => r.decision === 'SOFTEN').map(r => r.post_id));

  const columns = [
    'post_id', 'url', 'category', 'title',
    'phrase_found', 'total_occurrences', 'sentence_context',
    'decision', 'keep_reason', 'soften_suggestion', 'checked_date',
  ] as const;

  const csvOut = columns.join(',') + '\n'
    + rows.map(r => columns.map(c => csvEsc(String(r[c] ?? ''))).join(',')).join('\n') + '\n';

  fs.writeFileSync(path.join(AUDIT_DIR, 'strong-claim-decisions.csv'), csvOut, 'utf-8');

  // SOFTEN 대상만 별도 파일
  const softenRows = rows.filter(r => r.decision === 'SOFTEN');
  const softenCsv = columns.join(',') + '\n'
    + softenRows.map(r => columns.map(c => csvEsc(String(r[c] ?? ''))).join(',')).join('\n') + '\n';
  fs.writeFileSync(path.join(AUDIT_DIR, 'strong-claim-soften.csv'), softenCsv, 'utf-8');

  console.log(`HIGH 단정 표현 문맥 검토 완료 — ${highPosts.length}개 게시글 / ${rows.length}건 표현`);
  console.log(`  KEEP (유지): ${keeps}건 — 안전/법적 의무 강조`);
  console.log(`  SOFTEN (완화 권고): ${softens}건 — ${softenPosts.size}개 게시글`);
  console.log(`  REVIEW (수동 검토): ${reviews}건`);
  console.log('출력: seo-audit/strong-claim-decisions.csv, seo-audit/strong-claim-soften.csv');
}

main();
