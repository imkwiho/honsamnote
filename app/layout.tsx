import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import Link from 'next/link';
import SiteVisitTracker from '@/components/SiteVisitTracker';
import './globals.css';

const geist = Geist({ subsets: ['latin'] });

const SITE_NAME = '1인 가구 생활백서';

export const metadata: Metadata = {
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  description: '혼자 사는 사람의 시간, 돈, 공간, 안전을 최적화하는 현실적인 생활 안내서',
};

const navLinks = [
  { label: '전체 글', href: '/blog' },
  { label: '생활비', href: '/category/cost' },
  { label: '식재료', href: '/category/food' },
  { label: '수납', href: '/category/storage' },
  { label: '청소', href: '/category/cleaning' },
  { label: '안전', href: '/category/safety' },
  { label: '주거', href: '/category/housing' },
  { label: '제품', href: '/category/products' },
  { label: '관계', href: '/category/lifestyle' },
  { label: '뉴스레터', href: '/#newsletter' },
];

const footerCategories = [
  { label: '생활비 최적화', href: '/category/cost' },
  { label: '혼밥·식재료 관리', href: '/category/food' },
  { label: '좁은 집과 수납', href: '/category/storage' },
  { label: '청소·세탁·집안일', href: '/category/cleaning' },
  { label: '안전·응급상황', href: '/category/safety' },
  { label: '주거·계약·이사', href: '/category/housing' },
  { label: '1인 가구 제품·서비스', href: '/category/products' },
  { label: '관계·고립·생활 리듬', href: '/category/lifestyle' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={`${geist.className} min-h-screen`}
        style={{ background: '#eaf3ff', color: '#1d1d1f' }}>

        <SiteVisitTracker />

        {/* 프로스티드 글래스 네비 */}
        <header className="fixed top-0 left-0 right-0 z-50 border-b border-black/[0.06]"
          style={{ backdropFilter: 'saturate(180%) blur(20px)', background: 'rgba(234,243,255,0.85)' }}>
          <nav className="max-w-6xl mx-auto px-4 sm:px-6 h-[52px] flex items-center justify-between">
            <Link href="/" className="text-[15px] font-bold tracking-tight text-[#1d1d1f] shrink-0">
              {SITE_NAME}
            </Link>
            {/* 데스크탑 메뉴 */}
            <div className="hidden lg:flex items-center gap-0.5">
              {navLinks.map(l => (
                <a key={l.href} href={l.href}
                  className="text-[13px] text-[#6e6e73] hover:text-[#1d1d1f] transition-colors px-2.5 py-1.5 rounded-lg hover:bg-black/[0.04] whitespace-nowrap">
                  {l.label}
                </a>
              ))}
            </div>
            {/* 모바일·태블릿: 뉴스레터 버튼만 */}
            <Link href="/#newsletter"
              className="lg:hidden text-[12px] font-semibold text-white px-3 py-1.5 rounded-full" style={{ background: '#0071e3' }}>
              구독
            </Link>
          </nav>
        </header>

        <main className="pt-[52px]">{children}</main>

        <footer className="mt-20 border-t border-[#c7ddfb] py-10 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-8 text-[13px]">
              <div>
                <p className="font-semibold text-[#1d1d1f] mb-3">카테고리</p>
                {footerCategories.slice(0, 4).map(c => (
                  <a key={c.href} href={c.href} className="block text-[#6e6e73] hover:text-[#1d1d1f] mb-1.5 transition-colors">{c.label}</a>
                ))}
              </div>
              <div>
                <p className="font-semibold text-[#1d1d1f] mb-3" aria-hidden>&nbsp;</p>
                {footerCategories.slice(4).map(c => (
                  <a key={c.href} href={c.href} className="block text-[#6e6e73] hover:text-[#1d1d1f] mb-1.5 transition-colors">{c.label}</a>
                ))}
              </div>
              <div>
                <p className="font-semibold text-[#1d1d1f] mb-3">블로그</p>
                {[{ label: '전체 글', href: '/blog' }, { label: '뉴스레터', href: '/#newsletter' }].map(t => (
                  <a key={t.href} href={t.href} className="block text-[#6e6e73] hover:text-[#1d1d1f] mb-1.5 transition-colors">{t.label}</a>
                ))}
              </div>
              <div>
                <p className="font-semibold text-[#1d1d1f] mb-3">정보</p>
                {['운영 정책', '개인정보 처리', '문의'].map(t => (
                  <a key={t} href="#" className="block text-[#6e6e73] hover:text-[#1d1d1f] mb-1.5 transition-colors">{t}</a>
                ))}
              </div>
            </div>
            <div className="border-t border-[#c7ddfb] pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
              <p className="text-[12px] text-[#aeaeb2]">© {new Date().getFullYear()} {SITE_NAME}. 혼자 사는 삶을 더 쉽게.</p>
              <p className="text-[12px] text-[#aeaeb2]">Powered by Gemini AI</p>
            </div>
          </div>
        </footer>

        <Link href="/admin/login" className="fixed bottom-5 right-5 w-5 h-5 opacity-[0.07] hover:opacity-20 transition-opacity" aria-label="관리자">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
          </svg>
        </Link>
      </body>
    </html>
  );
}
