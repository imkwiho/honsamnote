// 2단계 SEO metadata layer. content/blog/*.mdx의 원본 front matter(title,
// description, tags, keywords, category, categoryName)와 본문에서 매번
// 빌드 타임에 계산해 내는 파생 데이터다 — 파일로 영속화하지 않는다. 그래야
// 원본 콘텐츠와 SEO 데이터가 절대 뒤섞이지 않고, 원본이 바뀌면 항상 최신
// 값을 돌려준다. 유일한 예외: title/description을 실제로 고치기로(HIGH
// confidence) 승인된 경우에만 scripts/seo-apply-titles.ts가 원본 mdx의
// 해당 필드 자체를 바꾼다 — 그 이후에는 이 계산 결과가 원본과 같아진다.
import {
  type AuditPost,
  type SearchIntent,
  classifyCluster,
  detectSearchIntent,
  primaryKeyword,
  secondaryKeywords,
  suggestTitle,
  suggestDescription,
} from './seoAudit';

export type TitleConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export interface SeoMetadata {
  slug: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  clusterId: string;
  clusterName: string;
  searchIntent: SearchIntent;
  seoTitleSuggestion: string;
  seoDescriptionSuggestion: string;
  titleConfidence: TitleConfidence;
  titleConfidenceReason: string;
}

// 제목에 서로 다른 검색의도/주제가 섞여 있으면(실제 사례: "마트에서 산 감자
// 싹 나고 양파 물러질 때, 버릴까 말까?" — 감자와 양파라는 별개 주제가 하나의
// 제목에 묶여 있음) 자동 제목 변경 대상에서 제외하고 role-split candidate로
// 표시한다. 완벽한 감지는 아니라서(형태소 분석 없음) 보수적으로만 잡는다.
function isRoleSplitCandidate(post: AuditPost): boolean {
  const title = post.title;
  const questionMarks = (title.match(/\?/g) ?? []).length;
  if (questionMarks >= 2) return true;
  // "A나 B" / "A 또는 B"처럼 명사 두 개를 나열한 뒤 하나의 질문/처리로
  // 묶는 패턴.
  if (/[가-힣]+\s*(나|또는|혹은)\s*[가-힣]+.*(때|경우)/.test(title) && /\?|까\s*$/.test(title)) return true;
  return false;
}

const EXPLICIT_INTENT_RULES = [
  /\?|까요\??$|될까|괜찮을까/,
  /체크리스트|점검/,
  /vs\.?|비교|어떤 것이|어느 쪽/,
  /비용|얼마|요금|가격/,
  /기준|판단|해도 될까|버려야/,
  /방법|법$|하는 법|고르는 법/,
];

/** 제목 자체에 명확한 검색의도 신호(물음표, "비교", "방법" 등)가 있는지. */
function hasExplicitIntentSignal(title: string): boolean {
  return EXPLICIT_INTENT_RULES.some(re => re.test(title));
}

function computeTitleConfidence(post: AuditPost, kw: string): { confidence: TitleConfidence; reason: string } {
  if (isRoleSplitCandidate(post)) {
    return { confidence: 'LOW', reason: 'role-split candidate — 제목에 서로 다른 검색의도/주제가 섞여 있어 보임(자동 분리하지 않음)' };
  }
  if (!kw) {
    return { confidence: 'LOW', reason: '대표 키워드(primary keyword)를 찾을 수 없음' };
  }
  const titleHasKeyword = post.title.includes(kw);
  if (titleHasKeyword && hasExplicitIntentSignal(post.title)) {
    return { confidence: 'HIGH', reason: '원제목에 대표 키워드가 이미 포함되어 있고, 검색의도가 명확함' };
  }
  if (titleHasKeyword) {
    return { confidence: 'MEDIUM', reason: '대표 키워드는 있으나 검색의도가 제목만으로는 애매함(추가 검토 필요)' };
  }
  return { confidence: 'MEDIUM', reason: '대표 키워드가 원제목에 없어 새 제목이 원래 의미와 달라질 수 있음(추가 검토 필요)' };
}

/** 게시글 하나의 SEO metadata를 원본 front matter로부터 계산한다. 순수 함수. */
export function computeSeoMetadata(post: AuditPost): SeoMetadata {
  const { clusterSlug, clusterName } = classifyCluster(post);
  const kw = primaryKeyword(post);
  const intent = detectSearchIntent(post);
  const { confidence, reason } = computeTitleConfidence(post, kw);

  return {
    slug: post.slug,
    primaryKeyword: kw,
    secondaryKeywords: secondaryKeywords(post),
    clusterId: clusterSlug,
    clusterName,
    searchIntent: intent,
    seoTitleSuggestion: suggestTitle(post),
    seoDescriptionSuggestion: suggestDescription(post),
    titleConfidence: confidence,
    titleConfidenceReason: reason,
  };
}

export function computeAllSeoMetadata(posts: AuditPost[]): Map<string, SeoMetadata> {
  return new Map(posts.map(post => [post.slug, computeSeoMetadata(post)]));
}
