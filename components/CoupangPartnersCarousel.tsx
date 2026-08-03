'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { coupangAdSettings } from '@/config/coupangAds';
import { COUPANG_CATEGORY_PRESENTATION } from '@/data/coupangCategoryPresentation';
import { normalizeCategory } from '@/lib/coupangCategory';

interface Props {
  category?: string;
  categoryName?: string;
  // AI 콘텐츠 분석이 이 글에 맞춰 고른 제목/상품 키워드. 있으면 카테고리
  // 기본 문구 대신 이 값을 우선 사용한다 (없는 글은 카테고리 기본값으로 대체).
  aiTitle?: string;
  aiKeywords?: string[];
}

// 쿠팡 파트너스 스니펫은 document.write로 동작하는 구형 광고 태그라, React
// 컴포넌트 안에서 직접(하이드레이션 이후) 실행하면 document.write가 조용히
// 무시되어 아무것도 렌더링되지 않는다. 독립된 문서를 가진 iframe(srcDoc)에
// 최초 파싱 시점으로 실행시켜 이 문제를 우회한다.
function buildIframeDoc(): string {
  const { widgetId, template, trackingCode, width, height } = coupangAdSettings;
  return `<!doctype html>
<html>
<head><style>body{margin:0;padding:0;overflow:hidden;}</style></head>
<body>
<script src="https://ads-partners.coupang.com/g.js"></script>
<script>
new PartnersCoupang.G({"id":${widgetId},"template":"${template}","trackingCode":"${trackingCode}","width":"${width}","height":"${height}","tsource":""});
</script>
</body>
</html>`;
}

export default function CoupangPartnersCarousel({ category, categoryName, aiTitle, aiKeywords }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [failed, setFailed] = useState(false);

  const { width, height } = coupangAdSettings;

  // 컨테이너 실측 폭에 맞춰 광고 전체(iframe)를 CSS transform으로 축소한다.
  // 쿠팡 캐러셀은 680x140 고정 크리에이티브라, 자르거나 내부 레이아웃을
  // 바꾸지 않으면서 모바일에서 가로 스크롤 없이 전체가 보이게 하는 방법이다.
  useLayoutEffect(() => {
    if (!wrapRef.current) return;
    const el = wrapRef.current;

    function updateScale() {
      const containerWidth = el.offsetWidth;
      if (containerWidth > 0) {
        setScale(Math.min(1, containerWidth / width));
      }
    }

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(el);
    return () => observer.disconnect();
  }, [width]);

  if (!coupangAdSettings.enabled || !coupangAdSettings.postBottomEnabled) return null;

  const presentationKey = normalizeCategory(category, categoryName);
  const presentation = COUPANG_CATEGORY_PRESENTATION[presentationKey] ?? COUPANG_CATEGORY_PRESENTATION.all;
  if (!presentation.enabled || failed) return null;

  const title = aiTitle ?? presentation.title;
  const description = aiKeywords && aiKeywords.length > 0
    ? `이 글과 관련해 참고할 수 있는 상품: ${aiKeywords.slice(0, 3).join(', ')}`
    : presentation.description;

  return (
    <section className="not-prose my-10" aria-label="쿠팡 파트너스 추천 상품">
      <div className="mb-3 rounded-xl border border-[#ece4d6] bg-[#f7f2e6] px-4 py-3">
        <p className="flex items-center gap-2 text-[13px] font-semibold text-[#8a6a1f]">
          <span aria-hidden>💡</span> 광고·제휴 안내
        </p>
        <p className="mt-1 text-[12px] text-[#6b6558] leading-relaxed">
          이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.
        </p>
      </div>

      <div className="mb-3">
        <p className="text-[14px] font-bold text-[#2f2c26]">{title}</p>
        <p className="mt-1 text-[13px] text-[#6b6558] leading-relaxed">{description}</p>
        {presentation.caution && (
          <p className="mt-1 text-[11.5px] text-[#a08f6a] leading-relaxed">{presentation.caution}</p>
        )}
      </div>

      <div
        ref={wrapRef}
        style={{ width: '100%', maxWidth: `${width}px`, margin: '0 auto', height: height * scale, overflow: 'hidden' }}
      >
        <iframe
          title="쿠팡 파트너스 추천 상품 캐러셀"
          srcDoc={buildIframeDoc()}
          loading="lazy"
          width={width}
          height={height}
          scrolling="no"
          style={{ border: 0, display: 'block', transform: `scale(${scale})`, transformOrigin: 'top left' }}
          onError={() => setFailed(true)}
        />
      </div>
    </section>
  );
}
