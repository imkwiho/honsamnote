import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { Geist, Gowun_Batang } from 'next/font/google';
import Link from 'next/link';
import SiteVisitTracker from '@/components/SiteVisitTracker';
import VisitorTracker from '@/components/analytics/VisitorTracker';
import { getAllPosts, getCategoryCounts } from '@/lib/mdx';
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, SITE_LOCALE, DEFAULT_OG_IMAGE, DEFAULT_OG_IMAGE_DIMENSIONS } from '@/lib/seo';
import './globals.css';

const geist = Geist({ subsets: ['latin'] });
const serif = Gowun_Batang({ subsets: ['latin'], weight: ['700'], variable: '--font-serif' });

const HOME_TITLE = `${SITE_NAME} | 1인 가구 생활비·주거·생활정보`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: HOME_TITLE, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  creator: SITE_NAME,
  publisher: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  category: '생활정보',
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
  manifest: '/manifest.webmanifest',
  openGraph: {
    type: 'website',
    locale: SITE_LOCALE,
    url: SITE_URL,
    siteName: SITE_NAME,
    title: HOME_TITLE,
    description: SITE_DESCRIPTION,
    images: [{ url: DEFAULT_OG_IMAGE, ...DEFAULT_OG_IMAGE_DIMENSIONS, alt: SITE_NAME }],
  },
  twitter: {
    card: 'summary_large_image',
    title: HOME_TITLE,
    description: SITE_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    other: process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION
      ? { 'naver-site-verification': process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION }
      : undefined,
  },
};

export const viewport: Viewport = {
  themeColor: '#7c8f6e',
};

const navLinks = [
  { label: '전체 글', href: '/blog', countKey: 'all' },
  { label: '생활비', href: '/category/cost', countKey: 'cost' },
  { label: '식재료', href: '/category/food', countKey: 'food' },
  { label: '수납', href: '/category/storage', countKey: 'storage' },
  { label: '청소', href: '/category/cleaning', countKey: 'cleaning' },
  { label: '안전', href: '/category/safety', countKey: 'safety' },
  { label: '주거', href: '/category/housing', countKey: 'housing' },
  { label: '제품', href: '/category/products', countKey: 'products' },
  { label: '관계', href: '/category/lifestyle', countKey: 'lifestyle' },
  { label: '뉴스레터', href: '/#newsletter', countKey: null },
];

const footerCategories = [
  { label: '생활비 최적화', href: '/category/cost', countKey: 'cost' },
  { label: '혼밥·식재료 관리', href: '/category/food', countKey: 'food' },
  { label: '좁은 집과 수납', href: '/category/storage', countKey: 'storage' },
  { label: '청소·세탁·집안일', href: '/category/cleaning', countKey: 'cleaning' },
  { label: '안전·응급상황', href: '/category/safety', countKey: 'safety' },
  { label: '주거·계약·이사', href: '/category/housing', countKey: 'housing' },
  { label: '1인 가구 제품·서비스', href: '/category/products', countKey: 'products' },
  { label: '관계·고립·생활 리듬', href: '/category/lifestyle', countKey: 'lifestyle' },
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [allPosts, categoryCounts] = await Promise.all([getAllPosts(), getCategoryCounts()]);
  const counts: Record<string, number> = { ...categoryCounts, all: allPosts.length };

  return (
    <html lang="ko" className={serif.variable}>
      <body className={`${geist.className} min-h-screen`}
        style={{ background: '#faf6f0', color: '#33302b' }}>

        <SiteVisitTracker />
        {/* useSearchParams를 쓰는 클라이언트 컴포넌트라 정적 내보내기(output: 'export')에서
            빌드 오류가 나지 않도록 Suspense로 감싼다. 화면엔 아무것도 렌더링하지 않는다. */}
        <Suspense fallback={null}>
          <VisitorTracker />
        </Suspense>

        {/* 미니멀 헤더 */}
        <header className="fixed top-0 left-0 right-0 z-50 border-b border-[#33302b]/[0.06]"
          style={{ backdropFilter: 'saturate(160%) blur(20px)', background: 'rgba(250,246,240,0.85)' }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <nav className="h-[52px] flex items-center justify-between">
              <Link href="/" className="flex items-center gap-1.5 text-[15px] font-bold tracking-tight text-[#2f2c26] shrink-0"
                style={{ fontFamily: 'var(--font-serif)' }}>
                <span aria-hidden className="text-[#8a9a7a]">✦</span>
                {SITE_NAME}
              </Link>
              {/* 데스크탑 메뉴 */}
              <div className="hidden lg:flex items-center gap-0.5">
                {navLinks.map(l => (
                  <a key={l.href} href={l.href}
                    className="flex items-center gap-1 text-[13px] text-[#8a8377] hover:text-[#33302b] transition-colors px-2.5 py-1.5 rounded-lg hover:bg-[#33302b]/[0.04] whitespace-nowrap">
                    {l.label}
                    {l.countKey && counts[l.countKey] > 0 && (
                      <span className="text-[10px] tabular-nums text-[#b0a893]">{counts[l.countKey]}</span>
                    )}
                  </a>
                ))}
              </div>
              {/* 모바일·태블릿: 뉴스레터 버튼만 */}
              <Link href="/#newsletter"
                className="lg:hidden text-[12px] font-semibold text-white px-3 py-1.5 rounded-full shrink-0" style={{ background: '#7c8f6e' }}>
                구독
              </Link>
            </nav>
            {/* 모바일·태블릿: 맨 위에 오는 가로 스크롤 메뉴 */}
            <div className="no-scrollbar lg:hidden flex items-center gap-1.5 overflow-x-auto pb-2.5 -mx-1 px-1">
              {navLinks.map(l => (
                <a key={l.href} href={l.href}
                  className="shrink-0 flex items-center gap-1 whitespace-nowrap text-[12.5px] font-medium text-[#5c5749] px-3 py-1.5 rounded-full bg-[#33302b]/[0.045] hover:bg-[#33302b]/[0.08] transition-colors">
                  {l.label}
                  {l.countKey && counts[l.countKey] > 0 && (
                    <span className="text-[10.5px] tabular-nums text-[#a39c8c]">{counts[l.countKey]}</span>
                  )}
                </a>
              ))}
            </div>
          </div>
        </header>

        <main className="pt-[100px] lg:pt-[52px]">{children}</main>

        <footer className="mt-20 border-t border-[#e6ddd0] py-10 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-8 text-[13px]">
              <div>
                <p className="font-semibold text-[#2f2c26] mb-3">카테고리</p>
                {footerCategories.slice(0, 4).map(c => (
                  <a key={c.href} href={c.href} className="flex items-center justify-between text-[#8a8377] hover:text-[#33302b] mb-1.5 transition-colors">
                    <span>{c.label}</span>
                    <span className="text-[11px] tabular-nums text-[#b0a893]">{counts[c.countKey] ?? 0}</span>
                  </a>
                ))}
              </div>
              <div>
                <p className="font-semibold text-[#2f2c26] mb-3" aria-hidden>&nbsp;</p>
                {footerCategories.slice(4).map(c => (
                  <a key={c.href} href={c.href} className="flex items-center justify-between text-[#8a8377] hover:text-[#33302b] mb-1.5 transition-colors">
                    <span>{c.label}</span>
                    <span className="text-[11px] tabular-nums text-[#b0a893]">{counts[c.countKey] ?? 0}</span>
                  </a>
                ))}
              </div>
              <div>
                <p className="font-semibold text-[#2f2c26] mb-3">블로그</p>
                {[{ label: '전체 글', href: '/blog' }, { label: '뉴스레터', href: '/#newsletter' }].map(t => (
                  <a key={t.href} href={t.href} className="block text-[#8a8377] hover:text-[#33302b] mb-1.5 transition-colors">{t.label}</a>
                ))}
              </div>
              <div>
                <p className="font-semibold text-[#2f2c26] mb-3">정보</p>
                {['운영 정책', '개인정보 처리', '문의'].map(t => (
                  <a key={t} href="#" className="block text-[#8a8377] hover:text-[#33302b] mb-1.5 transition-colors">{t}</a>
                ))}
              </div>
            </div>
            <div className="border-t border-[#e6ddd0] pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
              <p className="text-[12px] text-[#a39c8c]">© {new Date().getFullYear()} {SITE_NAME}. 혼자 사는 삶을 더 쉽게.</p>
              <p className="text-[12px] text-[#a39c8c]">Powered by Gemini AI</p>
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
