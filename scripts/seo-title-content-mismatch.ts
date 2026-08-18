// SEO 4단계 §12 — 제목과 본문의 검색 의도 불일치 탐지.
// 제목의 대표 키워드가 본문 앞부분(첫 600자)에 없거나, 제목 의도와
// 다른 주제가 본문을 지배하는 경우를 찾아낸다.
import fs from 'fs';
import path from 'path';
import {
  loadAllPosts, AUDIT_DIR, SITE_URL, ensureAuditDir, toCsv, firstChars,
} from './lib/seoPhase4Shared';
import { primaryKeyword } from '../lib/seoAudit';
import { computeSeoMetadata } from '../lib/seoMetadata';

// 의도별 기대 키워드(본문 앞부분에 있어야 하는 단어들)
const INTENT_SIGNALS: Record<string, string[]> = {
  '방법형':     ['방법', '방식', '법', '어떻게', '하는 법', '단계', '절차', '순서'],
  '비교형':     ['vs', '비교', '차이', '장단점', '어느', '어떤'],
  '판단형':     ['해야', '필요', '필요 없', '권장', '추천', '선택', '판단'],
  '문제해결형': ['해결', '원인', '대처', '없애', '제거', '고치'],
  '정보형':     ['이란', '뭔가요', '무엇인지', '알아보', '설명', '소개'],
  '질문형':     ['질문', '궁금', '어떻게', '왜', '무엇'],
};

function main() {
  const posts = loadAllPosts();
  const rows: Record<string, unknown>[] = [];

  for (const post of posts) {
    const kw = primaryKeyword(post);
    if (!kw) continue; // 키워드 없으면 분석 불가

    const meta = computeSeoMetadata(post);
    const opening = firstChars(post.content, 600);

    // 1) 대표 키워드가 본문 앞부분에 없는 경우
    const kwInOpening = opening.includes(kw);

    // 2) 의도 신호가 앞부분에 없는 경우
    const intentSignals = INTENT_SIGNALS[meta.searchIntent] ?? [];
    const intentInOpening = intentSignals.some(s => opening.includes(s));

    // 3) 제목이 구체적인 주제를 명시하는데 앞부분이 엉뚱한 내용으로 시작
    //    (긴 감정적 도입 탐지: 첫 200자 중 핵심 키워드 없이 감성 표현만)
    const firstOpening = opening.slice(0, 200);
    const emotionalOpening = /퇴근\s후|피곤한|지친|힘든|막막한|불안한|걱정|두렵|당황/.test(firstOpening)
      && !kwInOpening
      && firstOpening.length > 100;

    if (!kwInOpening || (!intentInOpening && intentSignals.length > 0)) {
      const mismatchType = !kwInOpening ? 'KEYWORD_ABSENT_FROM_OPENING'
        : emotionalOpening ? 'EMOTIONAL_INTRO_DELAYS_ANSWER'
        : 'INTENT_SIGNAL_ABSENT';

      rows.push({
        post_id: post.slug,
        url: `${SITE_URL}/blog/${post.slug}/`,
        title: post.title,
        primary_keyword: kw,
        search_intent: meta.searchIntent,
        mismatch_type: mismatchType,
        kw_in_opening: kwInOpening ? 'yes' : 'no',
        intent_in_opening: intentInOpening ? 'yes' : 'no',
        emotional_intro: emotionalOpening ? 'yes' : 'no',
        opening_snippet: firstOpening.replace(/,/g, '，').replace(/\n/g, ' ').slice(0, 150),
        recommended_action: mismatchType === 'KEYWORD_ABSENT_FROM_OPENING'
          ? 'CONTENT_ALIGNMENT_REQUIRED: 제목 키워드가 본문 앞부분에 없음 — 제목 수정 또는 본문 도입 개선'
          : mismatchType === 'EMOTIONAL_INTRO_DELAYS_ANSWER'
          ? 'answer-first candidate: 감성 도입 후 핵심 답변이 늦게 나옴 — 도입 순서 개선 검토'
          : 'INTENT_SIGNAL_ABSENT: 제목 의도 신호가 본문 앞부분에 없음 — 본문 구조 점검',
      });
    }
  }

  // mismatch_type별 정렬
  const order: Record<string, number> = {
    KEYWORD_ABSENT_FROM_OPENING: 0,
    EMOTIONAL_INTRO_DELAYS_ANSWER: 1,
    INTENT_SIGNAL_ABSENT: 2,
  };
  rows.sort((a, b) => (order[a.mismatch_type as string] ?? 3) - (order[b.mismatch_type as string] ?? 3));

  ensureAuditDir();
  const columns = [
    'post_id', 'url', 'title', 'primary_keyword', 'search_intent',
    'mismatch_type', 'kw_in_opening', 'intent_in_opening', 'emotional_intro',
    'opening_snippet', 'recommended_action',
  ];
  fs.writeFileSync(path.join(AUDIT_DIR, 'title-content-mismatch.csv'), toCsv(columns, rows), 'utf-8');

  const keywordAbsent = rows.filter(r => r.mismatch_type === 'KEYWORD_ABSENT_FROM_OPENING').length;
  const emotionalIntro = rows.filter(r => r.mismatch_type === 'EMOTIONAL_INTRO_DELAYS_ANSWER').length;
  const intentAbsent = rows.filter(r => r.mismatch_type === 'INTENT_SIGNAL_ABSENT').length;
  console.log(`제목-본문 불일치 탐지 완료 — ${posts.length}개 검사`);
  console.log(`  KEYWORD_ABSENT_FROM_OPENING: ${keywordAbsent}개`);
  console.log(`  EMOTIONAL_INTRO_DELAYS_ANSWER: ${emotionalIntro}개`);
  console.log(`  INTENT_SIGNAL_ABSENT: ${intentAbsent}개`);
  console.log(`  총: ${rows.length}개`);
  console.log('출력: seo-audit/title-content-mismatch.csv');
}

main();
