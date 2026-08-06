// 순수 JSON-LD <script> 렌더러. undefined 값을 가진 속성은 JSON.stringify가
// 자동으로 빼주므로, 호출하는 쪽에서 조건부로 필드를 넣기만 하면 "undefined"
// 문자열이 결과에 섞이는 문제가 생기지 않는다.
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
