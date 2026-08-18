// SEO 4단계 공유 유틸리티. Phase 3 공유(seoPhase3Shared.ts)를 확장해 4단계 전용
// 헬퍼를 모은다. 기존 스크립트는 건드리지 않는다.
import fs from 'fs';
import path from 'path';
import { loadAllPosts, AUDIT_DIR, BLOG_DIR, SITE_URL, ensureAuditDir, toCsv } from './seoPhase3Shared';
export { loadAllPosts, AUDIT_DIR, BLOG_DIR, SITE_URL, ensureAuditDir, toCsv };

/** 게시글의 raw MDX 파일을 읽는다. */
export function loadRaw(slug: string): string {
  const mdx = path.join(BLOG_DIR, `${slug}.mdx`);
  const md = path.join(BLOG_DIR, `${slug}.md`);
  return fs.existsSync(mdx) ? fs.readFileSync(mdx, 'utf-8') : fs.readFileSync(md, 'utf-8');
}

/** 마크다운/MDX 본문에서 순수 텍스트를 추출한다(코드블럭·링크 제거). */
export function extractPlainText(content: string): string {
  return content
    .replace(/```[\s\S]*?```/g, ' ')   // 코드블럭
    .replace(/`[^`]+`/g, ' ')           // 인라인 코드
    .replace(/!\[.*?\]\(.*?\)/g, ' ')   // 이미지
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // 링크 → anchor text만
    .replace(/#{1,6}\s*/g, '')           // 헤딩 마커
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1') // bold/italic
    .replace(/_{1,3}([^_]+)_{1,3}/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '')      // 목록 마커
    .replace(/^\s*\d+\.\s+/gm, '')      // 순서 목록
    .replace(/>\s*/gm, '')              // blockquote
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** 텍스트를 문장 단위로 쪼갠다(마침표/느낌표/물음표 기준, 최소 10자). */
export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?。])\s+/)
    .map(s => s.trim())
    .filter(s => s.length >= 10);
}

/** 텍스트의 첫 N글자를 반환한다. */
export function firstChars(content: string, n: number): string {
  return extractPlainText(content).slice(0, n);
}

// ── P1/P2/P3 Fact-check 패턴 (4단계에서 확장) ───────────────────────────────

export type ClaimType =
  | '법률' | '행정' | '비용' | '가격' | '안전' | '의료' | '식품'
  | '전기' | '가스' | '통계' | '시간' | '기타수치';

export type RiskLevel = 'P1' | 'P2' | 'P3';

export interface ClaimPattern {
  re: RegExp;
  claimType: ClaimType;
  riskLevel: RiskLevel;
  label: string; // 패턴 설명
}

export const CLAIM_PATTERNS: ClaimPattern[] = [
  // ── P1: 법률·임대차 ──────────────────────────────────────────────────
  { re: /임대차보호법|주택임대차보호법|상가임대차/g,          claimType: '법률', riskLevel: 'P1', label: '임대차보호법 언급' },
  { re: /제\s?\d+\s?조|법\s?제\s?\d+조|\d+조\s?\d*항/g,    claimType: '법률', riskLevel: 'P1', label: '법령 조항' },
  { re: /시행령|시행규칙|고시|지침/g,                        claimType: '행정', riskLevel: 'P1', label: '시행령·고시' },
  { re: /보증금.{0,15}반환|보증금.{0,15}청구|보증금.{0,20}보호/g, claimType: '법률', riskLevel: 'P1', label: '보증금 법적 보호' },
  { re: /과태료|벌금|처벌|위반.{0,10}처벌/g,                claimType: '법률', riskLevel: 'P1', label: '과태료·벌금' },
  { re: /전입신고.{0,20}기한|전입신고.{0,10}이내|전입신고.{0,10}일 내/g, claimType: '행정', riskLevel: 'P1', label: '전입신고 기한' },
  { re: /확정일자.{0,20}보호|확정일자.{0,20}받으면/g,        claimType: '법률', riskLevel: 'P1', label: '확정일자 효력' },
  { re: /임차인.{0,20}권리|임차인.{0,20}보호/g,             claimType: '법률', riskLevel: 'P1', label: '임차인 권리' },
  // ── P1: 안전·응급 ────────────────────────────────────────────────────
  { re: /119\s?신고|소방서\s?신고/g,                         claimType: '안전', riskLevel: 'P1', label: '119 신고 안내' },
  { re: /가스.{0,15}폭발|가스.{0,15}누출.{0,15}위험/g,      claimType: '가스', riskLevel: 'P1', label: '가스 폭발·누출 위험' },
  { re: /일산화탄소.{0,15}중독|CO.{0,10}중독/g,             claimType: '가스', riskLevel: 'P1', label: '일산화탄소 중독' },
  { re: /감전.{0,15}위험|누전.{0,15}화재/g,                 claimType: '전기', riskLevel: 'P1', label: '감전·누전 위험' },
  { re: /식중독.{0,20}증상|식중독.{0,20}대처/g,             claimType: '식품', riskLevel: 'P1', label: '식중독 대처' },
  { re: /응급처치.{0,20}방법|응급.{0,10}처치/g,             claimType: '의료', riskLevel: 'P1', label: '응급처치 방법' },
  // ── P2: 가격·비용(수치 포함) ─────────────────────────────────────────
  { re: /\d[\d,]*\s?만\s?원/g,                              claimType: '가격', riskLevel: 'P2', label: '가격·금액(만원)' },
  { re: /\d[\d,]*\s?원[^짜]/g,                              claimType: '가격', riskLevel: 'P2', label: '가격·금액(원)' },
  { re: /\d+(\.\d+)?\s?%/g,                                 claimType: '통계', riskLevel: 'P2', label: '퍼센트 수치' },
  { re: /월\s?요금|월\s?납부|월\s?사용료/g,                  claimType: '비용', riskLevel: 'P2', label: '월 요금·납부' },
  { re: /지원금|지원\s?사업|보조금/g,                        claimType: '행정', riskLevel: 'P2', label: '정부 지원금' },
  { re: /수수료.{0,15}\d+|수수료.{0,10}약/g,               claimType: '가격', riskLevel: 'P2', label: '수수료 금액' },
  // ── P3: 일반 생활정보 수치 ────────────────────────────────────────────
  { re: /실내.{0,10}적정\s?온도|실내.{0,10}적정\s?습도/g,  claimType: '기타수치', riskLevel: 'P3', label: '적정 온·습도' },
  { re: /유통기한|소비기한|보관.{0,10}기간/g,               claimType: '식품', riskLevel: 'P3', label: '유통기한·보관기간' },
  { re: /평균.{0,20}\d+|약\s?\d+/g,                         claimType: '통계', riskLevel: 'P3', label: '평균·약 수치' },
];

/** 텍스트에서 패턴에 매칭되는 주장 문장을 모두 추출한다. */
export function extractClaims(
  text: string,
  patterns: ClaimPattern[],
): Array<{ claim: string; claimType: ClaimType; riskLevel: RiskLevel; label: string; currentValue: string }> {
  const sentences = splitSentences(text);
  const results: Array<{ claim: string; claimType: ClaimType; riskLevel: RiskLevel; label: string; currentValue: string }> = [];
  const seen = new Set<string>();

  for (const { re, claimType, riskLevel, label } of patterns) {
    re.lastIndex = 0; // global 재사용 안전
    const globalRe = new RegExp(re.source, 'g');
    let m: RegExpExecArray | null;
    while ((m = globalRe.exec(text)) !== null) {
      const matchPos = m.index;
      // 매칭된 위치가 포함된 문장 찾기
      let sentence = sentences.find(s => {
        const idx = text.indexOf(s);
        return idx !== -1 && idx <= matchPos && idx + s.length > matchPos;
      });
      if (!sentence) {
        // 없으면 주변 텍스트(±60자)
        const start = Math.max(0, matchPos - 40);
        const end = Math.min(text.length, matchPos + m[0].length + 40);
        sentence = text.slice(start, end).replace(/\s+/g, ' ').trim();
      }
      const key = `${claimType}|${m[0]}`;
      if (!seen.has(key)) {
        seen.add(key);
        results.push({
          claim: sentence.slice(0, 200),
          claimType,
          riskLevel,
          label,
          currentValue: m[0],
        });
      }
    }
  }

  // riskLevel 우선순위로 정렬
  const order: Record<RiskLevel, number> = { P1: 0, P2: 1, P3: 2 };
  return results.sort((a, b) => order[a.riskLevel] - order[b.riskLevel]);
}

// ── 강한 단정 표현 패턴 ───────────────────────────────────────────────────────
export const STRONG_CLAIM_PHRASES: { re: RegExp; label: string }[] = [
  { re: /반드시\s/g,              label: '반드시' },
  { re: /무조건\s/g,              label: '무조건' },
  { re: /완벽하게\s/g,            label: '완벽하게' },
  { re: /100%/g,                  label: '100%' },
  { re: /절대\s/g,                label: '절대' },
  { re: /확실히\s/g,              label: '확실히' },
  { re: /가장\s안전/g,            label: '가장 안전' },
  { re: /즉시\s해결/g,            label: '즉시 해결' },
  { re: /완전\s?박멸/g,           label: '완전 박멸' },
  { re: /법적으로\s무조건/g,      label: '법적으로 무조건' },
  { re: /무조건\s받을\s수\s있/g,  label: '무조건 받을 수 있다' },
  { re: /100\s?퍼센트/g,          label: '100퍼센트' },
  { re: /완전히\s제거/g,          label: '완전히 제거' },
  { re: /절대\s안전/g,            label: '절대 안전' },
  { re: /무조건\s안전/g,          label: '무조건 안전' },
];

// ── 반복 표현 패턴 ──────────────────────────────────────────────────────────
export const REPETITIVE_PHRASES: { phrase: string; re: RegExp }[] = [
  { phrase: '혼자 사는 당신',      re: /혼자\s사는\s당신/g },
  { phrase: '현실적인 방법',       re: /현실적인\s방법/g },
  { phrase: '현명한 선택',         re: /현명한\s선택/g },
  { phrase: '시간과 돈을 아껴',    re: /시간과\s돈을\s아껴/g },
  { phrase: '후회 없는',           re: /후회\s없는/g },
  { phrase: '조금 더 편리한 삶',   re: /조금\s더\s편리한\s삶/g },
  { phrase: '더욱 쾌적한 생활',    re: /더욱\s쾌적한\s생활/g },
  { phrase: '도움이 되길 바랍니다', re: /도움이\s되길\s바랍니다/g },
  { phrase: '퇴근 후',             re: /퇴근\s후/g },
  { phrase: '혼자 사는 직장인',    re: /혼자\s사는\s직장인/g },
  { phrase: '1인 가구 직장인',     re: /1인\s가구\s직장인/g },
  { phrase: '현실 가이드',         re: /현실\s가이드/g },
  { phrase: '스마트하게',          re: /스마트하게/g },
];

// ── Answer-first 질문 의도 ──────────────────────────────────────────────────
export const ANSWER_FIRST_INTENTS = [
  /먹어도\s?(될까|괜찮을까|안전할까)/,
  /버려야\s?할까/,
  /어떻게\s?(제거|처리|해결)/,
  /얼마나?\s?(하?나?|드나?|됩?니?까?)/,
  /무엇을\s?(사야|선택)/,
  /언제\s?(신고|확인|해야)/,
  /어떤\s?(것이|쪽이|게)\s?(낫|좋|맞)/,
  /사야\s?할까/,
  /해도\s?될까/,
  /어떻게\s?하면/,
];
