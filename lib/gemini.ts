import { GoogleGenerativeAI } from '@google/generative-ai';
import type { TopicType } from './topics';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const PERSONA = `혼자 산 지 1~5년 된 25~45세 직장인. 시간과 돈을 아끼면서 집안일과 생활 문제를 효율적으로 해결하고 싶어 한다. 구매력이 있고 검색을 자주 한다.`;

const BLOG_IDENTITY = `이 블로그는 "혼자 사는 사람의 시간, 돈, 공간, 안전을 최적화하는 현실적인 생활 안내서"다. 혼자 사는 삶을 멋있게 포장하지 않는다. 대신 혼자이기 때문에 더 어렵고 번거로운 문제를 실제로 해결해 준다.`;

const STRUCTURE = `1. 문제 상황 — 독자가 겪는 장면을 3~5문장으로 구체적으로 묘사한다.
2. 먼저 확인할 결론 — 핵심 답을 글 초반에 바로 제시한다.
3. 원인 또는 판단 기준 — 왜 이런 문제가 생기는지, 무엇을 기준으로 판단해야 하는지 설명한다.
4. 해결 순서 — 독자가 그대로 따라 할 수 있도록 단계별로 작성한다.
5. 비용·시간·주의사항 — 실제 생활에 필요한 수치와 현실적인 제약을 넣는다.
6. 실패하기 쉬운 방법 — 많이 시도하지만 효과가 없거나 오히려 문제를 악화시키는 방법을 설명한다.
7. 최종 체크리스트 — 글을 읽은 뒤 바로 행동할 수 있도록 정리한다.`;

const TYPE_GUIDE: Record<TopicType, string> = {
  foundation: '검색 수요가 꾸준한 기반 주제다. 위 7단계 구조를 충실히 따르되, 독자가 처음 이 문제를 마주했다고 가정하고 기초부터 설명한다.',
  problem: '독자가 갑자기 검색하는 구체적인 문제 상황이다. 1번 "문제 상황"은 지금 당장 곤란한 장면으로 시작하고, 2번 "결론"에서 가장 빠른 조치를 먼저 제시한 뒤 나머지 단계로 이어간다.',
  comparison: '제품·서비스를 비교하되 광고처럼 보이지 않게 쓴다. 특정 제품을 무조건 추천하지 말고, 3번 "판단 기준"에 "사야 하는 사람"과 "사지 않아도 되는 경우"를 모두 나열해 독자가 스스로 결정하게 만든다.',
};

const REVIEW_CATEGORIES = new Set(['cost', 'housing', 'safety']);

export interface TopicInput {
  seed: string;
  categorySlug: string;
  categoryName: string;
  type: TopicType;
}

export async function generateBlogPost(topic: TopicInput): Promise<string> {
  
  const needsDisclaimer = REVIEW_CATEGORIES.has(topic.categorySlug);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const prompt = `
당신은 "1인 가구 생활 최적화" 블로그의 전문 작가입니다.

## 핵심 독자
${PERSONA}

## 블로그 정체성
${BLOG_IDENTITY}

## 이번 글의 소재
- 카테고리: ${topic.categoryName}
- 소재 키워드: ${topic.seed}
- 글 유형: ${topic.type} — ${TYPE_GUIDE[topic.type]}

이 소재를 그대로 제목으로 쓰지 말고, "대상 + 상황 + 문제 + 해결 행동" 공식으로 구체적인 생활 장면이 드러나는 제목으로 바꾸세요.
예: "원룸 청소법"(약함) → "퇴근 후 15분으로 원룸을 유지하는 청소 순서"(좋음).

## 글 구조 (반드시 이 7단계를 본문에 자연스러운 소제목으로 녹여낼 것)
${STRUCTURE}

## 출력 형식 (반드시 준수, 이 형식 외의 텍스트는 출력하지 말 것)
---
title: "제목"
description: "150자 이내 메타 설명"
date: "${new Date().toISOString().split('T')[0]}"
tags: [태그1, 태그2, 태그3]
keywords: [키워드1, 키워드2]
---

## 문제 상황
...

## 먼저 확인할 결론
...

## 원인과 판단 기준
...

## 해결 순서
...

## 비용·시간·주의사항
...

## 이렇게 하면 오히려 악화됩니다
...

## 체크리스트
...

## 요구사항
- 한국어로 작성, 2000자 이상
- 정보를 나열하지 말고 독자가 "사야 하는지/해야 하는지" 스스로 판단할 수 있는 기준을 제시할 것
- AI 느낌이 나지 않는 자연스럽고 담백한 문체
- 실제 존재하지 않는 법령·구체적 수치·특정 업체명을 단정적으로 지어내지 말 것. 정확한 수치나 법률 확인이 필요한 부분은 "관리비 고지서에서 직접 확인하세요", "지자체 홈페이지에서 최신 공고를 확인하세요"처럼 독자가 직접 확인할 방법을 안내할 것${needsDisclaimer ? '\n- 이 글은 비용/법률/안전 정보를 다루므로, 체크리스트 마지막에 "※ 이 글의 수치와 절차는 작성일 기준이며, 실제 적용 전 관련 공식 자료로 다시 확인하세요."라는 문장을 반드시 추가할 것' : ''}
`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}
