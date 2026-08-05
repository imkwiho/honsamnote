interface AnalyticsMetaProps {
  contentType: 'home' | 'post' | 'category' | 'blog-list' | 'page';
  category?: string;
  postSlug?: string;
  postId?: string;
  title?: string;
}

// 현재 페이지의 실제 카테고리/글 정보를 VisitorTracker(클라이언트)에 전달하기
// 위한 순수 서버 컴포넌트. JS를 전혀 싣지 않고 JSON을 담은 <script> 태그만
// 렌더링한다 — VisitorTracker가 라우트가 바뀔 때마다 이 태그를 다시 읽는다.
// (카테고리는 URL 문자열 추측이 아니라 이 컴포넌트를 렌더링하는 서버
// 컴포넌트가 실제 글 front matter에서 받은 값을 그대로 싣는다.)
export default function AnalyticsMeta({ contentType, category, postSlug, postId, title }: AnalyticsMetaProps) {
  const payload = { contentType, category, postSlug, postId, title };
  // </script> 시퀀스가 데이터 안에 들어있어도 태그가 조기 종료되지 않도록 이스케이프한다.
  const json = JSON.stringify(payload).replace(/</g, '\\u003c');

  return (
    // 사용자 입력 HTML이 아닌 JSON 직렬화 데이터만 담는다.
    <script type="application/json" id="__analytics_meta__" dangerouslySetInnerHTML={{ __html: json }} />
  );
}
