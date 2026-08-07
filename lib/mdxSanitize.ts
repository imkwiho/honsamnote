// Gemini가 생성한 원문에 MDX(엄격한 JSX 파서) 기준으로 깨진 구문이 섞이면
// 빌드 자체가 실패한다. 여기서 실제로 확인된 두 가지 패턴을 정리해서
// 생성 직후(scripts/generate-post.ts) 자동으로 안전하게 고친다.

// (1) "자주 <-> 거의 안 씀", "<5분 소요", "**<비울 옷 판단 기준>**"처럼
// '<' 뒤에 실제 JSX 태그명으로 못 쓰는 문자가 오면 MDX는 이를 깨진 태그
// 시작으로 해석한다(실제 사례 3건: "<->", "<br>"(닫힘 없음), 그리고
// "<비울 옷 판단 기준>" — 한글도 유니코드 글자라 처음엔 "글자면 안전"으로
// 허용했다가 실패했다. 우리가 실제로 쓰는 컴포넌트/HTML 태그명은 항상
// 영문(SummaryBox, CoupangPartnersCarousel, h2, br...)이므로, ASCII 영문자로
// 시작하는 경우만 "진짜 태그일 수 있다"고 보고, 그 외(한글 포함 전부)는
// 안전하게 HTML 엔티티로 이스케이프한다.
export function escapeInvalidLessThan(content: string): string {
  return content.replace(/<(?![a-zA-Z/!$_>])/g, '&lt;');
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

// (3) Gemini가 가끔 응답 하나에 완전한 글 두 개를 이어붙여 반환한다(실제
// 사례: 2026-08-06-cleaning-auto-467d7f.mdx — 첫 글이 정상적으로 끝난 뒤,
// "---"와 "title: ..."로 시작하는 두 번째 완전한 글(자체 front matter
// 포함)이 그대로 본문 뒤에 붙어 나옴). matter()는 맨 앞 front matter만
// 인식하고 나머지는 전부 본문으로 취급하기 때문에, 이 오염된 두 번째
// 글이 그대로 저장돼 MDX 태그 구조를 깨뜨렸다. 정상적인 본문 줄 맨
// 앞에는 "title:" 같은 YAML 키가 나올 이유가 없으므로, 그 패턴이 다시
// 나타나면 그 지점부터는 전부 버린다.
const DUPLICATE_TITLE_RE = /\ntitle\s*:\s*["']/i;

export function stripDuplicateArticle(content: string): string {
  const match = DUPLICATE_TITLE_RE.exec(content);
  if (!match) return content;
  return content
    .slice(0, match.index)
    .replace(/[\s`-]+$/, '')
    .trimEnd();
}

/** 생성된 글을 파일로 저장하기 전에 항상 거치는 종합 정리 함수. */
export function sanitizeMdxContent(content: string): string {
  return escapeInvalidLessThan(selfCloseVoidElements(stripDuplicateArticle(content)));
}
