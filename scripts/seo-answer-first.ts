// SEO 4단계 §30-32 — Answer-first 후보 탐지.
// 질문형 검색의도를 가진 글에서 첫 200자 안에 핵심 답변이 없는 경우를 찾는다.
import fs from 'fs';
import path from 'path';
import {
  loadAllPosts, AUDIT_DIR, SITE_URL, ensureAuditDir, toCsv,
  extractPlainText, ANSWER_FIRST_INTENTS, firstChars,
} from './lib/seoPhase4Shared';
import { detectSearchIntent, primaryKeyword } from '../lib/seoAudit';
import { computeFactCheckFlag } from '../lib/seoAudit';

// 답변 제공 신호: 첫 200자에 이런 패턴이 있으면 이미 answer-first로 볼 수 있음
const ANSWER_SIGNALS = [
  /결론(?:부터|은|:)/,
  /요약(?:하면|:)/,
  /한\s?마디로/,
  /짧게\s?말하면/,
  /정답은/,
  /핵심은/,
  /먼저\s?말씀드리면/,
  // 빠른 답: "가능합니다", "괜찮습니다", "좋습니다", "나쁩니다", "권장합니다"
  /[가-힣]+(?:합니다|해요|됩니다|되어요|가능합니다|괜찮습니다|권장합니다|필요합니다)[.!]/,
];

function main() {
  const posts = loadAllPosts();
  const rows: Record<string, unknown>[] = [];

  for (const post of posts) {
    const intent = detectSearchIntent(post);
    const kw = primaryKeyword(post);

    // 질문형/판단형/문제해결형/비교형이 answer-first가 더 중요한 의도
    const isAnswerCritical = ['질문형', '판단형', '문제해결형', '비교형'].includes(intent);
    if (!isAnswerCritical) continue;

    // 제목에 answer-first 의도가 있는지 확인
    const titleHasQuestion = ANSWER_FIRST_INTENTS.some(re => re.test(post.title));
    if (!kw && !titleHasQuestion) continue;

    const plain = extractPlainText(post.content);
    const opening200 = firstChars(post.content, 200);

    // 이미 answer-first인지 확인
    const hasAnswerSignal = ANSWER_SIGNALS.some(re => re.test(opening200));

    // 감성 도입부 탐지
    const hasEmotionalIntro = /퇴근\s후|지친|피곤한|힘든|막막한|불안한|걱정되는/.test(opening200);

    // 답이 늦게 나오는지: 500자 이후에야 핵심 키워드가 등장
    const kwEarlyPosition = kw ? plain.indexOf(kw) : -1;
    const answerDelayed = kwEarlyPosition > 400 || (!hasAnswerSignal && plain.length > 800);

    if (!hasAnswerSignal && (hasEmotionalIntro || answerDelayed)) {
      const hasFactcheckRisk = computeFactCheckFlag(post).flagged;

      // 안전하게 개선 가능한지 판단
      const safeToImprove = !hasFactcheckRisk && !hasEmotionalIntro;

      rows.push({
        post_id: post.slug,
        url: `${SITE_URL}/blog/${post.slug}/`,
        title: post.title,
        primary_keyword: kw ?? '',
        search_intent: intent,
        has_answer_signal: hasAnswerSignal ? 'yes' : 'no',
        emotional_intro: hasEmotionalIntro ? 'yes' : 'no',
        answer_delayed: answerDelayed ? 'yes' : 'no',
        kw_position: kwEarlyPosition >= 0 ? kwEarlyPosition : 'not_found',
        safe_to_improve: safeToImprove ? 'yes' : 'no',
        opening_snippet: opening200.replace(/,/g, '，').replace(/\n/g, ' ').slice(0, 150),
        recommended_action: safeToImprove
          ? 'answer-first candidate: 핵심 결론을 첫 문장으로 이동 검토'
          : 'REVIEW_REQUIRED: fact-check 위험 또는 도입 제거 시 맥락 손실 가능성 — 수동 판단',
      });
    }
  }

  // safe_to_improve = yes 먼저
  rows.sort((a, b) => {
    if (a.safe_to_improve === b.safe_to_improve) return 0;
    return a.safe_to_improve === 'yes' ? -1 : 1;
  });

  ensureAuditDir();
  const columns = [
    'post_id', 'url', 'title', 'primary_keyword', 'search_intent',
    'has_answer_signal', 'emotional_intro', 'answer_delayed', 'kw_position',
    'safe_to_improve', 'opening_snippet', 'recommended_action',
  ];
  fs.writeFileSync(path.join(AUDIT_DIR, 'answer-first-candidates.csv'), toCsv(columns, rows), 'utf-8');

  const safeCount = rows.filter(r => r.safe_to_improve === 'yes').length;
  console.log(`Answer-first 후보 탐지 완료 — ${posts.length}개 검사`);
  console.log(`  후보 총: ${rows.length}개 (안전하게 개선 가능: ${safeCount}개)`);
  console.log('출력: seo-audit/answer-first-candidates.csv');
}

main();
