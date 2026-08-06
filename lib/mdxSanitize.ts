// Gemini가 생성한 원문에 MDX(엄격한 JSX 파서) 기준으로 깨진 구문이 섞이면
// 빌드 자체가 실패한다. 여기서 실제로 확인된 두 가지 패턴을 정리해서
// 생성 직후(scripts/generate-post.ts) 자동으로 안전하게 고친다.

// (1) "자주 <-> 거의 안 씀", "<5분 소요"처럼 '<' 뒤에 글자가 아닌 문자를
// 붙여 쓰면, MDX는 이를 깨진 JSX 태그 시작으로 해석한다
// (실제 사례: 2026-08-06-products-auto-9bb85c.mdx, "<->" 때문에 빌드 실패).
// 우리가 실제로 쓰는 컴포넌트/HTML 태그는 이 시점 이후(lib/article.ts)에
// 별도 블록으로 삽입되므로, 생성 직후 원문에서는 '<' 뒤에 글자/$/_/!/>(닫는
// 태그·프래그먼트)가 오지 않는 경우 전부 안전하게 HTML 엔티티로 이스케이프한다.
export function escapeInvalidLessThan(content: string): string {
  return content.replace(/<(?![\p{L}/!$_>])/gu, '&lt;');
}

// (2) 표 안에서 줄바꿈을 위해 "<br>"처럼 HTML5식 void 요소를 닫지 않고 쓰면,
// MDX(JSX)는 이를 "닫는 태그가 없다"는 오류로 처리한다(실제 사례:
// 2026-08-06-housing-auto-849c13.mdx, 표 셀 안의 "<br>" 때문에 빌드 실패).
// 자주 등장하는 void 요소를 전부 자동으로 자기 닫힘(<br />) 형태로 고친다.
const VOID_ELEMENTS = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'];
const VOID_TAG_RE = new RegExp(`<(${VOID_ELEMENTS.join('|')})\\b([^>]*?)\\s*/?>`, 'gi');

export function selfCloseVoidElements(content: string): string {
  return content.replace(VOID_TAG_RE, (_match, tag: string, attrs: string) => {
    const cleanAttrs = attrs.trim();
    return cleanAttrs ? `<${tag} ${cleanAttrs} />` : `<${tag} />`;
  });
}

/** 생성된 글을 파일로 저장하기 전에 항상 거치는 종합 정리 함수. */
export function sanitizeMdxContent(content: string): string {
  return escapeInvalidLessThan(selfCloseVoidElements(content));
}
