import Link from 'next/link';

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
