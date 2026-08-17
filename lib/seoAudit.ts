// SEO 전면 재구축 1단계(백업 + Dry Run 감사 보고서)의 분석 로직.
// 전부 순수 함수 — content/blog/*.mdx를 읽거나 쓰지 않는다(그건 scripts/seo-audit.ts의 몫).
// scripts/seo-audit.ts가 ts-node(commonjs)로 실행되므로, 이 파일 및 이 파일이
// 참조하는 모든 것은 상대 경로만 사용한다(@/ 별칭은 ts-node에서 해석되지 않음).

export interface AuditPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  updatedAt?: string;
  tags: string[];
  keywords: string[];
  category?: string; // 카테고리 slug (예: 'cleaning')
  categoryName?: string; // 카테고리 한글명 (예: '청소·세탁·집안일')
  content: string; // 본문 원문(MDX)
}

// ────────────────────────────────────────────────────────────────────────
// 1. 클러스터 taxonomy
//
// 8개 대분류는 그대로 유지하고, 그 아래에 실제 489개 글의 keywords 빈도를
// 집계해서 뽑은 검색 의도 클러스터를 정의한다(카테고리당 5~7개, 총 약
// 45~51개). matchTerms는 실제로 등장한 keyword/제목 표현들이다.
// ────────────────────────────────────────────────────────────────────────

export interface ClusterDef {
  slug: string;
  name: string;
  matchTerms: string[];
}

export const CLUSTER_TAXONOMY: Record<string, ClusterDef[]> = {
  cleaning: [
    { slug: 'bathroom-cleaning', name: '욕실 청소', matchTerms: ['욕실', '곰팡이', '변기', '배수구', '수챗구멍', '타일'] },
    { slug: 'kitchen-cleaning', name: '주방 청소', matchTerms: ['주방 청소', '기름때', '후드', '가스레인지', '싱크대'] },
    { slug: 'laundry-clothing', name: '세탁·옷관리', matchTerms: ['세탁', '빨래', '세탁기 냄새', '건조', '옷 정리', '헌 옷'] },
    { slug: 'odor-removal', name: '냄새 제거', matchTerms: ['냄새 제거', '냉장고 냄새', '음식물 쓰레기 냄새', '탈취'] },
    { slug: 'appliance-cleaning', name: '가전제품 청소', matchTerms: ['에어컨 청소', '건조기 청소', '전자레인지', '식기세척기 청소'] },
    { slug: 'cleaning-tools-time', name: '청소도구·시간절약', matchTerms: ['효율적인 청소', '청소 시간 절약', '청소 도구', '청소 루틴'] },
    { slug: 'trash-disposal', name: '쓰레기·폐기', matchTerms: ['분리배출', '종량제', '대형폐기물', '쓰레기 처리'] },
  ],
  food: [
    { slug: 'ingredient-storage', name: '식재료 보관', matchTerms: ['식재료 보관', '냉장 보관', '보관법', '신선도 유지'] },
    { slug: 'food-waste', name: '식재료 낭비 줄이기', matchTerms: ['식재료 낭비', '음식물 쓰레기', '상한 음식', '유통기한'] },
    { slug: 'solo-meal-recipe', name: '혼밥 레시피·식단', matchTerms: ['혼밥 레시피', '혼밥 식단', '1인 가구 식단', '간편식'] },
    { slug: 'grocery-shopping', name: '장보기·식비절약', matchTerms: ['장보기', '식비 절약', '식재료 절약', '1인 가구 장보기'] },
    { slug: 'solo-cooking-tips', name: '자취요리 팁', matchTerms: ['자취 요리', '1인 가구 밥', '간단 요리', '요리 초보'] },
    { slug: 'freeze-portion', name: '냉동·소분', matchTerms: ['냉동 보관', '소분', '대용량 식재료', '1인분'] },
  ],
  storage: [
    { slug: 'oneroom-storage', name: '원룸 전체 수납', matchTerms: ['원룸 수납', '좁은 집 수납', '1인 가구 수납', '원룸 정리'] },
    { slug: 'kitchen-storage', name: '주방 수납', matchTerms: ['주방 수납', '1인 가구 주방 수납', '싱크대 수납'] },
    { slug: 'closet-clothing', name: '옷장·옷정리', matchTerms: ['옷장 수납', '좁은 옷장', '옷 정리', '옷장 최적화'] },
    { slug: 'entryway-storage', name: '현관 수납', matchTerms: ['현관 정리', '현관 수납', '신발 정리'] },
    { slug: 'cable-small-items', name: '케이블·소형물품 정리', matchTerms: ['케이블 정리', '충전기 정리', '소형 물품', '전선 정리'] },
    { slug: 'bathroom-storage', name: '욕실 수납', matchTerms: ['욕실 수납', '욕실 정리'] },
    { slug: 'appliance-layout', name: '가전 배치·공간활용', matchTerms: ['가전 배치', '공간 활용', '좁은 집 공구 수납'] },
  ],
  cost: [
    { slug: 'electricity-bill', name: '전기요금', matchTerms: ['전기세', '전기요금', '전기세 절약'] },
    { slug: 'gas-bill', name: '가스요금', matchTerms: ['가스비', '가스요금', '가스비 절약'] },
    { slug: 'telecom-bill', name: '통신비', matchTerms: ['통신비', '1인 가구 통신비', '휴대폰 요금'] },
    { slug: 'general-living-cost', name: '생활비 절약 전반', matchTerms: ['생활비 절약', '생활비 최적화', '생활비 줄이기', '생활비 아끼기'] },
    { slug: 'subscription-cost', name: '구독·정기결제', matchTerms: ['구독 서비스', '정기결제', '스마트 쇼핑'] },
    { slug: 'furniture-rental-cost', name: '가구·렌탈비용', matchTerms: ['가구 렌탈', '렌탈 비용'] },
  ],
  safety: [
    { slug: 'pest-control', name: '해충 퇴치', matchTerms: ['바퀴벌레', '해충', '쥐 퇴치', '해충 예방'] },
    { slug: 'fire-prevention', name: '화재 예방', matchTerms: ['화재', '주방 화재', '전기 화재'] },
    { slug: 'electrical-safety', name: '전기 안전', matchTerms: ['전기 안전', '누전', '콘센트 안전'] },
    { slug: 'gas-safety', name: '가스 안전', matchTerms: ['가스 안전', '가스 밸브'] },
    { slug: 'leak-accident', name: '누수·생활사고', matchTerms: ['누수', '아파트 누수', '생활 사고'] },
    { slug: 'lock-security', name: '도어락·보안', matchTerms: ['도어락', '열쇠공', '원룸 보안', '현관 보안'] },
    { slug: 'emergency-response', name: '응급상황 대처', matchTerms: ['비상 대처', '응급상황', '1인 가구 비상'] },
  ],
  housing: [
    { slug: 'finding-oneroom', name: '원룸 구하기', matchTerms: ['원룸 구하기', '자취방 구하기', '방 구하기'] },
    { slug: 'lease-contract', name: '전월세 계약', matchTerms: ['전월세 계약', '임대차 계약', '계약 해지'] },
    { slug: 'deposit', name: '보증금', matchTerms: ['보증금', '보증금 지키기', '보증금 반환'] },
    { slug: 'moving-prep', name: '이사 준비', matchTerms: ['이사 준비', '이사 체크리스트', '1인 가구 이사'] },
    { slug: 'management-fee', name: '관리비', matchTerms: ['관리비'] },
    { slug: 'move-out-registration', name: '전입신고·퇴실', matchTerms: ['전입신고', '퇴실', '원상복구'] },
    { slug: 'landlord-issues', name: '집주인 문제', matchTerms: ['집주인', '집주인 동의', '집주인 문제'] },
  ],
  products: [
    { slug: 'kitchen-appliances', name: '주방가전', matchTerms: ['식기세척기', '에어프라이어', '미니 밥솥', '전자레인지'] },
    { slug: 'cleaning-appliances', name: '청소가전', matchTerms: ['청소기', '무선 청소기', '1인 가구 청소'] },
    { slug: 'air-environment', name: '공기청정기·환경가전', matchTerms: ['공기청정기', '제습기', '가습기'] },
    { slug: 'storage-products', name: '수납용품', matchTerms: ['리빙박스', '수납용품', '압축팩', '옷걸이'] },
    { slug: 'safety-products', name: '생활안전용품', matchTerms: ['셀프 방역', '방역 제품', '안전용품'] },
    { slug: 'living-services', name: '생활서비스', matchTerms: ['생활서비스', '이사 서비스', '청소 대행'] },
  ],
  lifestyle: [
    { slug: 'neighbor-noise', name: '이웃·층간소음', matchTerms: ['층간소음', '이웃', '이웃 관계'] },
    { slug: 'relationship-management', name: '관계 관리', matchTerms: ['관계 관리', '관계 최적화', '혼자 사는 사람 관계', '인간관계'] },
    { slug: 'loneliness-isolation', name: '외로움·고립감', matchTerms: ['외로움', '고립감', '1인 가구 외로움'] },
    { slug: 'daily-rhythm', name: '생활리듬·시간관리', matchTerms: ['생활 리듬', '주말 무기력', '시간관리'] },
    { slug: 'solo-travel-hobby', name: '혼자여행·취미', matchTerms: ['혼자 여행', '1인 가구 여행', '취미'] },
  ],
};

const GENERAL_CLUSTER_SUFFIX = '-general';

export interface ClusterClassification {
  clusterSlug: string;
  clusterName: string;
  matchScore: number; // 몇 개의 서로 다른 matchTerm이 실제로 걸렸는지 — Pillar 적합도(topic coherence) 판단에 사용
}

export function classifyClusterDetailed(post: AuditPost): ClusterClassification {
  const category = post.category ?? '';
  const defs = CLUSTER_TAXONOMY[category] ?? [];
  const haystack = [post.title, ...post.keywords, ...post.tags].join(' ');

  let best: ClusterDef | undefined;
  let bestScore = 0;
  for (const def of defs) {
    const score = def.matchTerms.reduce((acc, term) => (haystack.includes(term) ? acc + 1 : acc), 0);
    if (score > bestScore) {
      bestScore = score;
      best = def;
    }
  }

  if (best) return { clusterSlug: best.slug, clusterName: best.name, matchScore: bestScore };
  return {
    clusterSlug: `${category || 'uncategorized'}${GENERAL_CLUSTER_SUFFIX}`,
    clusterName: `${post.categoryName ?? '미분류'} 기타`,
    matchScore: 0,
  };
}

export function classifyCluster(post: AuditPost): { clusterSlug: string; clusterName: string } {
  const { clusterSlug, clusterName } = classifyClusterDetailed(post);
  return { clusterSlug, clusterName };
}

// ────────────────────────────────────────────────────────────────────────
// 2. 검색 의도 추정 (규칙 기반 — 완벽하지 않음, "추정"으로 표기해서 사용)
// ────────────────────────────────────────────────────────────────────────

export type SearchIntent = '판단형' | '비교형' | '방법형' | '비용형' | '체크형' | '문제해결형' | '질문형';

const INTENT_RULES: [RegExp, SearchIntent][] = [
  [/\?|까요\??$|될까|괜찮을까/, '질문형'],
  [/체크리스트|점검/, '체크형'],
  [/vs\.?|비교|어떤 것이|어느 쪽/, '비교형'],
  [/비용|얼마|요금|가격/, '비용형'],
  [/기준|판단|해도 될까|버려야/, '판단형'],
  [/방법|법$|하는 법|고르는 법/, '방법형'],
];

export function detectSearchIntent(post: AuditPost): SearchIntent {
  const haystack = `${post.title} ${post.keywords.join(' ')}`;
  for (const [re, intent] of INTENT_RULES) {
    if (re.test(haystack)) return intent;
  }
  return '문제해결형';
}

// ────────────────────────────────────────────────────────────────────────
// 3. 대표/보조 검색어
// ────────────────────────────────────────────────────────────────────────

// 사이트 전체에 보일러플레이트처럼 반복되는 표현("1인 가구", "혼자 사는" 등)은
// AI가 keywords 필드 맨 앞에 붙여놓는 경우가 있다(실제 사례: "주말 무기력증
// 탈출" 글의 keywords[0]가 "혼자 사는 직장인"이었음 — 이걸 그대로 대표
// 키워드로 쓰면 제목 생성 결과가 "혼자 사는 직장인 해결 방법"처럼 원래
// 없애려던 상투어를 그대로 되살리는 정반대 결과가 난다). 대표 키워드를
// 고를 때는 이런 범용 표현을 건너뛴다.
export const GENERIC_PHRASES = new Set([
  '1인 가구', '혼자 사는', '자취', '직장인', '1인 가구 직장인', '혼자 사는 당신', '1인가구',
  '혼자 사는 직장인', // 실제 코퍼스에서 keywords[0]로 15회 등장 — 인물 묘사일 뿐 검색어가 아님
]);

export function primaryKeyword(post: AuditPost): string {
  const specific = post.keywords.find(k => !GENERIC_PHRASES.has(k)) ?? post.tags.find(t => !GENERIC_PHRASES.has(t));
  if (specific) return specific;
  // 전부 범용 표현뿐이라면(드묾) 그래도 뭔가는 반환한다 — 없는 것보다는 낫다.
  return post.keywords[0] ?? post.tags[0] ?? '';
}

export function secondaryKeywords(post: AuditPost): string[] {
  const pk = primaryKeyword(post);
  const pool = post.keywords.length > 0 ? post.keywords : post.tags;
  return pool.filter(k => k !== pk);
}

// ────────────────────────────────────────────────────────────────────────
// 4. 제목/meta 수정 필요 여부
// ────────────────────────────────────────────────────────────────────────

const CLICHE_OPENERS = ['혼자 사는 당신,', '1인 가구 직장인,', '혼자 사는 직장인,'];
const TITLE_LENGTH_THRESHOLD = 45;
const META_LENGTH_THRESHOLD = 155;
const CLICHE_META_PHRASES = ['현실적인 방법을 알려드립니다', '혼자 사는 당신', '1인 가구 직장인'];

export function needsTitleFix(post: AuditPost): boolean {
  if (post.title.length > TITLE_LENGTH_THRESHOLD) return true;
  if (CLICHE_OPENERS.some(opener => post.title.startsWith(opener))) return true;
  const kw = primaryKeyword(post);
  if (kw && !post.title.includes(kw)) return true;
  return false;
}

export function needsMetaFix(post: AuditPost, duplicateDescriptionSlugs: Set<string>): boolean {
  if (post.description.length > META_LENGTH_THRESHOLD) return true;
  if (CLICHE_META_PHRASES.some(phrase => post.description.includes(phrase))) return true;
  if (duplicateDescriptionSlugs.has(post.slug)) return true;
  return false;
}

/** description이 완전히 동일한 글들의 slug 집합을 찾는다(2개 이상 겹치는 description만). */
export function findDuplicateDescriptionSlugs(posts: AuditPost[]): Set<string> {
  const byDescription = new Map<string, string[]>();
  for (const post of posts) {
    if (!post.description) continue;
    const list = byDescription.get(post.description) ?? [];
    list.push(post.slug);
    byDescription.set(post.description, list);
  }
  const result = new Set<string>();
  for (const slugs of byDescription.values()) {
    if (slugs.length > 1) slugs.forEach(s => result.add(s));
  }
  return result;
}

// ────────────────────────────────────────────────────────────────────────
// 5. 카니벌라이제이션(중복 검색의도) 탐지 — 같은 카테고리 내에서만 비교
// ────────────────────────────────────────────────────────────────────────

// GENERIC_PHRASES(위 3번 섹션에서 정의)만으로는 부족하다 — 손으로 하나씩
// 블랙리스트에 추가해도 끝이 없다(실측: "생활비 절약"/"생활비 최적화"처럼
// 카테고리 이름과 거의 같은 keyword가 그 카테고리 글 절반 가까이에 붙어
// 있어, 블랙리스트 몇 개로는 못 막고 3,900쌍 이상의 가짜 후보가 나왔다).
// 대신 코퍼스 기반으로: **같은 카테고리 안에서** 특정 keyword/tag가 등장하는
// 글의 비율이 임계값을 넘으면("그 카테고리에서는 흔한 말") 자동으로 노이즈로
// 취급한다 — 카테고리마다 다시 튜닝할 필요가 없다.
const CATEGORY_COMMON_RATIO = 0.08; // 카테고리 내 글의 8% 이상에서 등장하면 노이즈로 취급

/** category 그룹 안에서 각 keyword/tag가 몇 개 글에 등장하는지 센다. */
function buildDocFrequency(group: AuditPost[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const post of group) {
    const seen = new Set([...post.keywords, ...post.tags]);
    for (const term of seen) freq.set(term, (freq.get(term) ?? 0) + 1);
  }
  return freq;
}

/**
 * 카테고리별로 "그 카테고리에서는 흔해서 신호가 안 되는" keyword/tag 집합을
 * 한 번에 계산한다. findDuplicateCandidates(중복 탐지)와 computeRelevanceScore
 * (관련 글 추천)가 똑같은 기준을 공유한다 — 한쪽만 고쳐서 기준이 어긋나는
 * 일을 방지한다.
 */
export function computeCommonTermsByCategory(posts: AuditPost[]): Map<string, Set<string>> {
  const byCategory = new Map<string, AuditPost[]>();
  for (const post of posts) {
    const cat = post.category ?? '(없음)';
    const list = byCategory.get(cat) ?? [];
    list.push(post);
    byCategory.set(cat, list);
  }
  const result = new Map<string, Set<string>>();
  for (const [cat, group] of byCategory) {
    const docFreq = buildDocFrequency(group);
    const commonThreshold = Math.max(4, Math.ceil(group.length * CATEGORY_COMMON_RATIO));
    result.set(cat, new Set([...docFreq.entries()].filter(([, count]) => count >= commonThreshold).map(([term]) => term)));
  }
  return result;
}

function postTokenSet(post: AuditPost, commonTerms: Set<string>): Set<string> {
  const tokens = new Set<string>();
  for (const k of post.keywords) if (!GENERIC_PHRASES.has(k) && !commonTerms.has(k)) tokens.add(k);
  for (const t of post.tags) if (!GENERIC_PHRASES.has(t) && !commonTerms.has(t)) tokens.add(t);
  return tokens;
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const x of a) if (b.has(x)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export interface MergeCandidate {
  mainPost: string;
  duplicatePost: string;
  similarity: number;
  similarityReason: string;
  recommendedAction: 'B. 역할 분리 검토' | 'C. 통합 후보';
  expectedPrimaryKeyword: string;
  redirectRequired: string;
}

const MERGE_THRESHOLD = 0.75;
const SPLIT_THRESHOLD = 0.5;
// 같은 세부 클러스터라는 사실 하나만으로는 절대 부족하다 — 클러스터는 원래
// 여러 개의 서로 다른 글을 묶으라고 만든 것이라(Pillar 후보 조건이 8개 이상),
// "클러스터가 같다"만 신호로 쓰면 그 클러스터의 모든 글 쌍이 통째로 중복
// 후보가 되어버린다(실측: 이 가드 없이 시험해보니 3,900쌍이 잡혀 사실상
// 무의미했다). 그래서 클러스터 일치는 "실제로 공유하는 keyword/tag가 하나
// 이상 있을 때"만 보너스로 얹는 보조 신호로 쓴다 — 실제 사례로 검증됨:
// "주방이나 거실에 바퀴벌레가 갑자기 보일 때" vs "갑자기 집에 바퀴벌레나
// 쥐가 출몰했을 때"는 keyword Jaccard만으로는 0.09에 불과하지만(조사·문체
// 차이로 keyword 표현이 달라짐), 둘 다 "해충 퇴치" 클러스터이고 최소 1개
// keyword("1인 가구 바퀴벌레")를 공유하므로 보너스를 받아 0.5를 넘긴다.
const CLUSTER_BONUS = 0.42;

export function findDuplicateCandidates(posts: AuditPost[]): MergeCandidate[] {
  const byCategory = new Map<string, AuditPost[]>();
  for (const post of posts) {
    const cat = post.category ?? '(없음)';
    const list = byCategory.get(cat) ?? [];
    list.push(post);
    byCategory.set(cat, list);
  }

  const commonTermsByCategory = computeCommonTermsByCategory(posts);

  const candidates: MergeCandidate[] = [];
  for (const [cat, group] of byCategory) {
    const commonTerms = commonTermsByCategory.get(cat) ?? new Set<string>();
    const tokenSets = group.map(p => postTokenSet(p, commonTerms));
    const clusters = group.map(p => classifyCluster(p).clusterSlug);
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const tokenSim = jaccardSimilarity(tokenSets[i], tokenSets[j]);
        if (tokenSim === 0) continue; // 공유 keyword/tag가 전혀 없으면 아무리 클러스터가 같아도 무의미.

        // general(미분류) 클러스터끼리는 "같은 클러스터"로 쳐주지 않는다 —
        // 둘 다 아무 세부 주제에도 안 걸렸을 뿐, 실제로 관련 있다는 신호가 아니다.
        const sameCluster = clusters[i] === clusters[j] && !clusters[i].endsWith('-general');
        const sim = Math.min(1, tokenSim + (sameCluster ? CLUSTER_BONUS : 0));
        if (sim < SPLIT_THRESHOLD) continue;

        const shared = [...tokenSets[i]].filter(t => tokenSets[j].has(t)).slice(0, 6);
        const a = group[i];
        const b = group[j];
        // 더 짧고 대표 키워드가 있는 쪽을 main으로 둔다(원본 유지 우선, 임의 선택은 아님).
        const [main, dup] = a.title.length <= b.title.length ? [a, b] : [b, a];

        const reasonParts: string[] = [];
        if (sameCluster) reasonParts.push(`같은 세부 클러스터(${clusters[i]})`);
        if (shared.length > 0) reasonParts.push(`공통 표현: ${shared.join(', ')}`);
        if (reasonParts.length === 0) reasonParts.push('제목 구조 유사');

        candidates.push({
          mainPost: main.slug,
          duplicatePost: dup.slug,
          similarity: Math.round(sim * 100) / 100,
          similarityReason: reasonParts.join(' / '),
          recommendedAction: sim >= MERGE_THRESHOLD ? 'C. 통합 후보' : 'B. 역할 분리 검토',
          expectedPrimaryKeyword: primaryKeyword(main) || primaryKeyword(dup),
          redirectRequired: sim >= MERGE_THRESHOLD ? '예(통합 승인 시)' : '아니오',
        });
      }
    }
  }
  return candidates;
}

// ────────────────────────────────────────────────────────────────────────
// 6. 관련 글 점수 — 2단계 내부링크 시스템(lib/relatedPosts.ts)이 실제로
// 사용하는 핵심 함수. 가중치 철학(지시서 6번): sameCluster/primaryKeyword
// 일치는 높은 가중치, keyword/tag overlap은 중간, **category 일치는 절대
// 핵심 판단 기준이 되면 안 되므로 항상 최하위 가중치**. "1인 가구" 같은
// 범용 keyword가 겹친다고 관련 글로 치지 않도록, 카테고리 내 흔한 keyword는
// commonTerms로 걸러낸다(computeCommonTermsByCategory, 중복 탐지와 동일 기준).
// ────────────────────────────────────────────────────────────────────────

export function computeRelevanceScore(
  a: AuditPost,
  b: AuditPost,
  clusterOf: (post: AuditPost) => string,
  commonTerms: Set<string> = new Set()
): number {
  const isNoise = (term: string) => GENERIC_PHRASES.has(term) || commonTerms.has(term);

  // "-general"(미분류 폴백) 클러스터는 둘 다 아무 세부 주제에도 안 걸렸을
  // 뿐이라 실제로 관련 있다는 신호가 아니다(findDuplicateCandidates와 동일 원칙).
  const aCluster = clusterOf(a);
  const bCluster = clusterOf(b);
  const clusterMatch = aCluster === bCluster && !aCluster.endsWith('-general') ? 1 : 0;
  const aPrimary = primaryKeyword(a);
  const bPrimary = primaryKeyword(b);
  const primaryKeywordMatch = aPrimary && aPrimary === bPrimary && !isNoise(aPrimary) ? 1 : 0;
  const keywordOverlap = a.keywords.filter(k => !isNoise(k) && b.keywords.includes(k)).length;
  const tagOverlap = a.tags.filter(t => !isNoise(t) && b.tags.includes(t)).length;
  const categoryMatch = a.category && a.category === b.category ? 1 : 0;

  return clusterMatch * 6 + primaryKeywordMatch * 5 + keywordOverlap * 2 + tagOverlap * 2 + categoryMatch * 1;
}

export function topRelatedSlugs(
  post: AuditPost,
  allPosts: AuditPost[],
  clusterOf: (post: AuditPost) => string,
  n = 5,
  commonTerms: Set<string> = new Set()
): string[] {
  return allPosts
    .filter(p => p.slug !== post.slug)
    .map(p => ({ slug: p.slug, score: computeRelevanceScore(post, p, clusterOf, commonTerms) }))
    .filter(p => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map(p => p.slug);
}

// ────────────────────────────────────────────────────────────────────────
// 7. 제목/description 규칙 기반 추천안 — 반드시 사람 검토 필요. 적용은 안 함.
// ────────────────────────────────────────────────────────────────────────

const INTENT_TEMPLATE_SUFFIX: Record<SearchIntent, string> = {
  판단형: '기준',
  비교형: '비교',
  방법형: '방법',
  비용형: '비용 정리',
  체크형: '체크리스트',
  문제해결형: '해결 방법',
  질문형: '알아보기',
};

export function suggestTitle(post: AuditPost): string {
  let stripped = post.title;
  for (const opener of CLICHE_OPENERS) {
    if (stripped.startsWith(opener)) {
      stripped = stripped.slice(opener.length).trim();
      break;
    }
  }
  const kw = primaryKeyword(post);
  const intent = detectSearchIntent(post);
  const suffix = INTENT_TEMPLATE_SUFFIX[intent];
  if (!kw) return stripped; // 대표 키워드가 없으면 상투 도입부만 제거한 원제목을 그대로 제안.

  // "｜" 뒤에는 카테고리명 같은 두루뭉술한 값이 아니라, 그 글만의 구체적인
  // 보조 설명이 와야 한다(사용자 예시: "전자레인지 냄새 제거｜찌든 때까지
  // 10분 청소법"). 범용 표현이 아닌 두 번째 keyword가 있으면 그걸 쓰고,
  // 없으면 억지로 채우지 않는다. 정확히 일치하는 것뿐 아니라 "혼자 사는
  // 직장인 식기세척기"처럼 범용 표현을 포함만 하는 경우도 걸러낸다(실제
  // 사례로 발견됨 — 부분 일치라 Set.has()로는 못 잡음).
  const containsGenericPhrase = (text: string) => [...GENERIC_PHRASES].some(phrase => text.includes(phrase));
  const secondary = secondaryKeywords(post).find(k => k !== kw && !containsGenericPhrase(k));
  const base = `${kw} ${suffix}`;
  return secondary ? `${base}｜${secondary}` : base;
}

const CONCLUSION_HEADING_RE = /^##\s*(먼저 확인할 결론|결론|지금 할 일|핵심 결론)\s*$/m;

export function suggestDescription(post: AuditPost): string {
  const match = CONCLUSION_HEADING_RE.exec(post.content);
  let candidate = post.description;
  if (match) {
    const rest = post.content.slice(match.index + match[0].length);
    const nextHeadingIdx = rest.search(/^##\s/m);
    const section = (nextHeadingIdx === -1 ? rest : rest.slice(0, nextHeadingIdx)).trim();
    const firstSentence = section.split(/(?<=[.!?요다])\s/)[0]?.trim();
    if (firstSentence && firstSentence.length >= 10) candidate = firstSentence;
  }
  for (const phrase of CLICHE_META_PHRASES) candidate = candidate.split(phrase).join('').trim();
  return candidate.length > META_LENGTH_THRESHOLD ? candidate.slice(0, META_LENGTH_THRESHOLD - 1).trim() + '…' : candidate;
}

// ────────────────────────────────────────────────────────────────────────
// 8. Fact-check 필요 여부 — lib/gemini.ts의 REVIEW_CATEGORIES와 동일 기준.
// ────────────────────────────────────────────────────────────────────────

export const FACTCHECK_CATEGORIES = new Set(['cost', 'housing', 'safety']);

const FACTCHECK_PATTERNS: [RegExp, string][] = [
  [/\d[\d,]*\s?원/, '금액'],
  [/\d+(\.\d+)?\s?%/, '퍼센트'],
  [/제\s?\d+\s?조|\d+조\s?\d*항?|시행령|시행규칙/, '법령 조항'],
  [/보증금|전입신고|과태료|임대차보호법/, '법률·행정 용어'],
];

export interface FactCheckResult {
  flagged: boolean;
  matches: { pattern: string; snippet: string }[];
}

export function computeFactCheckFlag(post: AuditPost): FactCheckResult {
  if (!post.category || !FACTCHECK_CATEGORIES.has(post.category)) {
    return { flagged: false, matches: [] };
  }
  const matches: { pattern: string; snippet: string }[] = [];
  for (const [re, label] of FACTCHECK_PATTERNS) {
    const m = re.exec(post.content);
    if (m) {
      const start = Math.max(0, m.index - 15);
      const end = Math.min(post.content.length, m.index + m[0].length + 15);
      matches.push({ pattern: label, snippet: post.content.slice(start, end).replace(/\s+/g, ' ').trim() });
    }
  }
  return { flagged: matches.length > 0, matches };
}

// ────────────────────────────────────────────────────────────────────────
// 9. SEO_PRIORITY 점수 — Search Console 데이터는 아직 없으므로 null로 비워둠.
// ────────────────────────────────────────────────────────────────────────

export interface SeoPriorityInputs {
  titleNeedsFix: boolean;
  hasPrimaryKeyword: boolean;
  contentLength: number;
  clusterPostCount: number;
  isDuplicateCandidate: boolean;
  internalLinkCount: number; // 현재는 항상 0 (지시서 데이터 기준)
}

/** 0~25 원점수(항목당 0~5) → 0~100로 정규화해서 반환한다. */
export function computeSeoPriority(inputs: SeoPriorityInputs): number {
  const searchIntentClarity = inputs.titleNeedsFix ? 1 : 5;
  const keywordQuality = inputs.hasPrimaryKeyword ? 5 : 1;
  const contentDepth = Math.min(5, Math.floor(inputs.contentLength / 800));
  const clusterImportance = Math.min(5, Math.round(inputs.clusterPostCount / 4));
  const duplicateRisk = inputs.isDuplicateCandidate ? 1 : 5; // 중복 위험이 높으면 우선순위를 낮춘다(먼저 정리부터 필요).
  const internalLinkNeed = inputs.internalLinkCount === 0 ? 5 : Math.max(0, 5 - inputs.internalLinkCount);

  const raw = searchIntentClarity + keywordQuality + contentDepth + clusterImportance + duplicateRisk + internalLinkNeed;
  const max = 5 * 6;
  return Math.round((raw / max) * 100);
}

export interface SearchConsoleMetrics {
  impressions: number | null;
  clicks: number | null;
  ctr: number | null;
  averagePosition: number | null;
}

/** Search Console 연동 전에는 값을 지어내지 않고 전부 null로 둔다(스키마만 준비). */
export function emptySearchConsoleMetrics(): SearchConsoleMetrics {
  return { impressions: null, clicks: null, ctr: null, averagePosition: null };
}
