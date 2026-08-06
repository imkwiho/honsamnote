import Link from 'next/link';
import type { Metadata } from 'next';

// 404 페이지는 검색엔진이 색인하면 안 된다. Next.js가 not-found 라우트에
// noindex 메타를 자동으로 하나 더 넣어줘서 <meta name="robots">가 중복
// 렌더링되긴 하지만(둘 다 noindex라 내용은 일치), robots를 아예 안 지정하면
// 상위 layout의 기본값(index:true)을 그대로 물려받아 "noindex"와 "index"가
// 동시에 찍히는 모순이 생긴다 — 중복이 모순보다 안전해 명시적으로 유지한다.
export const metadata: Metadata = {
  title: '페이지를 찾을 수 없습니다',
  description: '요청하신 페이지가 존재하지 않거나 이동되었습니다.',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
      <p className="text-6xl font-bold text-gray-200 mb-4">404</p>
      <h1 className="text-xl font-semibold text-gray-800 mb-2">페이지를 찾을 수 없습니다</h1>
      <p className="text-gray-400 text-sm mb-8">요청하신 페이지가 존재하지 않거나 이동되었습니다.</p>
      <Link href="/" className="px-5 py-2 text-white text-sm rounded-lg transition-colors hover:opacity-90" style={{ background: '#7c8f6e' }}>
        홈으로 돌아가기
      </Link>
    </div>
  );
}
