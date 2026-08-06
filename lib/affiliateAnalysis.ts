import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import { getMaxSlotsForLength } from '../config/coupangAds';

export const MIN_RECOMMENDATION_CONFIDENCE = 0.72;

// 카테고리별로 AI가 참고할 상품군 힌트. 실제 채택 여부는 본문 내용에 달려 있다 —
// 카테고리명만 보고 뭉뚱그린 키워드를 뽑지 않도록 예시만 제공한다.
const CATEGORY_PRODUCT_HINTS: Record<string, string> = {
  cost: '절전 멀티탭, 스마트 플러그, 단열용품, 식재료 소분/보관용기, 보온용품',
  food: '소분/밀폐용기, 진공포장용품, 소용량 조리도구, 계량도구, 라벨',
  storage: '리빙박스, 압축팩, 행거, 틈새선반, 침대 밑 수납함',
  cleaning: '무선청소기, 곰팡이 제거제, 배수구 청소용품, 세탁조 클리너',
  safety: '가스감지기, 화재감지기, 보조잠금장치, 도어스토퍼, 미끄럼방지용품 (무기류·호신용품 금지)',
  housing: '제습기, 가습기, 암막커튼, 단열/방음용품, 소형 가구',
  products: '1인용 소형가전(전기밥솥/에어프라이어/제습기 등)과 관련 소모품',
  lifestyle: '집들이·손님맞이 용품, 명확히 언급된 취미용품 (연결 불분명하면 추천하지 않음)',
};

const CONTENT_INTENTS = [
  'informational', // 정보 탐색형
  'problem-solving', // 문제 해결형
  'comparison', // 비교형
  'commercial', // 구매 검토형
  'transactional', // 구매 직전형
  'administrative', // 행정·법률 정보형
  'emotional', // 정서·관계형
] as const;

const RecommendedKeywordSchema = z.object({
  keyword: z.string().min(1),
  productGroup: z.string().min(1),
  purchaseIntentScore: z.number().min(0).max(1),
  relevanceScore: z.number().min(0).max(1),
  reason: z.string(),
});

const RecommendationAnalysisSchema = z.object({
  contentIntent: z.enum(CONTENT_INTENTS),
  problemSummary: z.string(),
  hasCommercialIntent: z.boolean(),
  overallConfidence: z.number().min(0).max(1),
  keywords: z.array(RecommendedKeywordSchema).max(5),
  excludedProductGroups: z.array(z.string()).default([]),
  shouldInsertAds: z.boolean(),
  recommendedSlotCount: z.number().int().min(0).max(4),
  // 본문의 "## 소제목" 중 광고를 배치할 위치들, 순서대로. recommendedSlotCount와 길이가 같아야 이상적이지만
  // 실제 삽입 개수는 본문 길이 규칙(getMaxSlotsForLength)으로 다시 한번 코드에서 제한한다.
  insertAfterHeadings: z.array(z.string()).max(4),
  // insertAfterHeadings와 같은 순서·개수. 슬롯마다 다른 제목을 써서 한 글에서
  // 같은 광고 제목이 반복되지 않게 한다.
  adTitles: z.array(z.string()).max(4),
});

export type RecommendedKeyword = z.infer<typeof RecommendedKeywordSchema>;
export type ContentIntent = (typeof CONTENT_INTENTS)[number];
export type RecommendationAnalysis = z.infer<typeof RecommendationAnalysisSchema>;

function buildPrompt(title: string, content: string, categorySlug: string | undefined, categoryName: string | undefined): string {
  const hints = (categorySlug && CATEGORY_PRODUCT_HINTS[categorySlug]) ?? '카테고리 정보 없음 — 본문 내용만으로 판단';
  const contentLength = content.length;
  const maxSlots = getMaxSlotsForLength(contentLength);

  return `
당신은 "혼삶 – 1인 가구 생활백서" 블로그의 제휴 상품 추천 분석기입니다.
아래 글을 분석해서, 이 글에 쿠팡 상품 캐러셀을 넣을지와 어떤 문맥·위치로 보여줄지 JSON으로만 답하세요.

## 카테고리
${categoryName ?? '(없음)'} (참고 상품군: ${hints})

## 글 제목
${title}

## 본문 (길이: 약 ${contentLength}자)
${content.slice(0, 8000)}

## 판단 기준
- 본문에서 실제로 다루는 구체적 문제와 직결된 상품군만 고른다. "생활용품", "청소" 같은 뭉뚱그린 키워드는 금지 — "원룸용 무선 청소기"처럼 구체적으로.
- 제목에 단어가 한 번 등장했다는 이유만으로 상품을 추천하지 않는다. 본문 전체의 핵심 주제를 우선한다.
- "관계" 카테고리는 기본적으로 광고를 넣지 않는다. 집들이·손님맞이·이웃 소음 예방처럼 명확히 상품과 연결된 경우에만 예외로 넣는다.
- 외로움, 우울감, 갈등, 이별, 직장 스트레스 등 감정 위주 글에는 광고를 넣지 않는다.
- 법률·행정 절차만 설명하는 글(전입신고, 확정일자, 임대차 분쟁 등), 상품과 무관한 정보성 글에는 광고를 넣지 않는다.
- 안전 카테고리에서 무기류·호신용품은 추천하지 않는다. 긴급 행동지침보다 상품을 앞세우지 않는다.
- contentIntent를 다음 중 하나로 분류한다: informational(정보 탐색형), problem-solving(문제 해결형), comparison(비교형), commercial(구매 검토형), transactional(구매 직전형), administrative(행정·법률 정보형), emotional(정서·관계형). commercial/transactional일수록 상품 키워드를 구체적으로, administrative/emotional은 광고를 넣지 않는다.
- excludedProductGroups에는 이 글과 헷갈릴 수 있지만 실제로는 관련 없어서 제외한 상품군을 적는다 (예: "원룸 수납" 글이면 ["주방가전"] 등). 없으면 빈 배열.
- adTitles의 각 항목에는 "무조건 사야 하는", "기적의", "최고의", "실사용자 추천", "오늘 인기상품", "판매량 1위"처럼 과장되거나 검증되지 않은 표현을 쓰지 않는다. 담백한 문구로.
- 이 글은 약 ${contentLength}자이므로 광고는 최대 ${maxSlots}개까지만 배치한다 (recommendedSlotCount는 0~${maxSlots} 사이).
- insertAfterHeadings는 본문의 "## 소제목" 중 recommendedSlotCount개를 정확히 그대로 골라, 각 섹션 바로 뒤에 광고를 배치할 위치로 지정한다. 서로 인접한 소제목을 연달아 고르지 말고 본문 전체에 고르게 분산한다. 목록·인용문 중간, 결론 바로 앞뒤, 체크리스트 중간, 긴급 행동지침 중간은 피한다. 적절한 위치가 부족하면 recommendedSlotCount를 줄이고 배열도 그만큼만 채운다.
- adTitles는 insertAfterHeadings와 같은 개수·순서로, 슬롯마다 그 위치의 문맥에 맞는 서로 다른 제목을 짓는다. 한 글 안에서 같은 제목을 반복하지 않는다.
- overallConfidence는 상품 추천이 이 글에 실제로 도움이 되는 정도를 0~1로 평가한다.

## 출력 형식 (JSON만 출력, 다른 텍스트·코드블록 금지)
{
  "contentIntent": "informational|problem-solving|comparison|commercial|transactional|administrative|emotional",
  "problemSummary": "독자가 해결하려는 문제 한 문장",
  "hasCommercialIntent": true 또는 false,
  "overallConfidence": 0.0~1.0,
  "keywords": [
    { "keyword": "구체적 상품 키워드", "productGroup": "상품군", "purchaseIntentScore": 0~1, "relevanceScore": 0~1, "reason": "이유" }
  ],
  "excludedProductGroups": ["제외한 상품군", "..."],
  "shouldInsertAds": true 또는 false,
  "recommendedSlotCount": 0~${maxSlots},
  "insertAfterHeadings": ["본문 소제목 그대로", "..."],
  "adTitles": ["과장 없는 짧은 광고 제목(슬롯 1)", "..."]
}
`;
}

function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (fenced ? fenced[1] : raw).trim();
}

async function requestAnalysis(title: string, content: string, categorySlug?: string, categoryName?: string): Promise<RecommendationAnalysis | null> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const prompt = buildPrompt(title, content, categorySlug, categoryName);

  const result = await model.generateContent(prompt);
  const text = extractJson(result.response.text());

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }

  const validated = RecommendationAnalysisSchema.safeParse(parsed);
  if (!validated.success) return null;

  // 코드 레벨에서 한 번 더 본문 길이 규칙을 강제한다 (AI가 지시를 어겨도 안전).
  const maxSlots = getMaxSlotsForLength(content.length);
  const data = validated.data;
  const slotCount = Math.min(data.recommendedSlotCount, maxSlots);
  return {
    ...data,
    recommendedSlotCount: slotCount,
    insertAfterHeadings: data.insertAfterHeadings.slice(0, slotCount),
    adTitles: data.adTitles.slice(0, slotCount),
  };
}

// AI 응답 형식이 잘못되면 한 번만 재시도하고, 계속 실패하면 null을 반환한다.
// 이 함수의 실패가 글 생성/발행 자체를 막지 않도록 항상 예외를 삼킨다.
export async function analyzePostForAffiliates(input: {
  title: string;
  content: string;
  categorySlug?: string;
  categoryName?: string;
}): Promise<RecommendationAnalysis | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const analysis = await requestAnalysis(input.title, input.content, input.categorySlug, input.categoryName);
      if (analysis) return analysis;
    } catch {
      // 다음 시도로 넘어가거나, 마지막 시도라면 아래에서 null 반환
    }
  }
  return null;
}

export function shouldShowAffiliateAd(params: {
  shouldInsertAds?: boolean | null;
  confidence?: number | null;
}): boolean {
  // AI 분석 데이터가 아예 없는 글(이 기능 도입 전에 생성된 기존 글 등)은
  // 항상 표시하던 기존 동작을 그대로 유지한다 — 카테고리 기본값으로 대체됨.
  if (params.shouldInsertAds == null && params.confidence == null) return true;
  if (params.shouldInsertAds === false) return false;
  if (params.confidence != null && params.confidence < MIN_RECOMMENDATION_CONFIDENCE) return false;
  return true;
}
