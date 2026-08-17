// SEO 2단계 §9 — 본문 문맥 내부링크. A등급 Pillar 클러스터에 속한 글에
// 한해서만, 가장 관련도 높은 글로 가는 자연스러운 문장 하나를 본문에
// 추가한다. 순수 함수만 여기 두고, 실제 파일 적용은
// scripts/seo-insert-contextual-links.ts가 한다.

// 매번 같은 문장을 쓰면 안 되므로(지시서 원칙: "모든 글에 동일 문장 사용
// 금지") 여러 템플릿을 순환시킨다. 앵커 텍스트는 항상 문장 안에 자연스럽게
// 녹아들도록 대상 글의 "짧고 구체적인 표현"을 넣는다(원래 제목이 아니라
// primaryKeyword 기반 표현 — 원 제목은 대개 너무 길고 상투적이라 문장에
// 넣으면 부자연스러움).
const SENTENCE_TEMPLATES: ((anchor: string) => string)[] = [
  anchor => `${anchor}도 함께 확인해보면 도움이 됩니다.`,
  anchor => `${anchor}가 궁금하다면 이어서 살펴보세요.`,
  anchor => `비슷한 고민이라면 ${anchor}도 참고해보세요.`,
  anchor => `${anchor} 역시 함께 정리해두었으니 확인해보시길 권합니다.`,
  anchor => `${anchor}에 대해서도 더 자세히 다루고 있습니다.`,
  anchor => `이 문제와 자주 함께 겪는 ${anchor}도 살펴보세요.`,
];

export function buildContextualSentence(anchorText: string, targetSlug: string, templateIndex: number): string {
  const template = SENTENCE_TEMPLATES[((templateIndex % SENTENCE_TEMPLATES.length) + SENTENCE_TEMPLATES.length) % SENTENCE_TEMPLATES.length];
  const linked = `[${anchorText}](/blog/${targetSlug}/)`;
  return template(linked);
}

const HEADING_RE = /^##\s.+$/gm;

export interface InsertionResult {
  content: string;
  inserted: boolean;
  reason?: string;
}

/**
 * 문서의 마지막 "## 소제목" 바로 앞에 새 문단으로 문장을 끼워 넣는다.
 * 기존 문장을 쪼개서 그 사이에 넣는 방식은 MDX 구문을 깨뜨릴 위험이 커서
 * (1단계에서 겪은 trailing-noise 버그류) 택하지 않는다 — 블록 사이에
 * 온전한 새 문단을 추가하는 것이 훨씬 안전하다. 삽입할 만한 위치가 없으면
 * (소제목이 아예 없는 등) 건너뛴다.
 */
// 1단계 감사에서 확인했듯 현재 어떤 글의 본문에도 "/blog/..." 형태의
// 마크다운 링크가 전혀 없다(internal_links 전수 0개). 그래서 본문 어디에서든
// 이 패턴이 발견되면 이 스크립트가 이미 삽입한 것으로 보고 재실행 시
// 중복 삽입을 막는다.
const EXISTING_LINK_RE = /\]\(\/blog\/[a-zA-Z0-9_-]+\/\)/;

export function hasContextualLinkAlready(content: string): boolean {
  return EXISTING_LINK_RE.test(content);
}

export function insertBeforeLastHeading(content: string, sentence: string): InsertionResult {
  const matches = [...content.matchAll(HEADING_RE)];
  if (matches.length === 0) {
    return { content, inserted: false, reason: '본문에 "## " 소제목이 없어 안전한 삽입 지점을 찾지 못함' };
  }
  const lastHeading = matches[matches.length - 1];
  const insertPos = lastHeading.index ?? 0;
  const before = content.slice(0, insertPos).trimEnd();
  const after = content.slice(insertPos);

  if (before.length === 0) {
    return { content, inserted: false, reason: '마지막 소제목이 문서 맨 앞이라 삽입 지점 없음' };
  }

  return { content: `${before}\n\n${sentence}\n\n${after}`, inserted: true };
}
