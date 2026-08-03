'use client';

import Script from 'next/script';

export default function CoupangBanner() {
  return (
    <div className="not-prose my-10">
      <div className="mb-3 rounded-xl border border-[#ece4d6] bg-[#f7f2e6] px-4 py-3">
        <p className="flex items-center gap-2 text-[13px] font-semibold text-[#8a6a1f]">
          <span aria-hidden>💡</span> 광고·제휴 안내
        </p>
        <p className="mt-1 text-[12px] text-[#6b6558] leading-relaxed">
          이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.
        </p>
      </div>
      <div className="flex justify-center overflow-x-auto">
        <Script src="https://ads-partners.coupang.com/g.js" strategy="afterInteractive" />
        <Script id="coupang-partners-init" strategy="afterInteractive">
          {`new PartnersCoupang.G({"id":992222,"template":"carousel","trackingCode":"AF1634685","width":"680","height":"140","tsource":""});`}
        </Script>
      </div>
    </div>
  );
}
