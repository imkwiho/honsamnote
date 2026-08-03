'use client';

// 쿠팡 파트너스 스니펫은 document.write로 동작하는 구형 광고 태그라
// React 컴포넌트 안에서 next/script로 직접 실행하면(하이드레이션 이후,
// 즉 문서 로드가 끝난 뒤 실행됨) document.write가 무시되어 아무것도
// 렌더링되지 않는다. iframe에 독립된 문서를 srcDoc으로 넣어, 그 문서가
// 처음 파싱될 때 document.write가 정상 동작하도록 우회한다.
const AD_WIDTH = 680;
const AD_HEIGHT = 140;

const IFRAME_DOC = `<!doctype html>
<html>
<head><style>body{margin:0;padding:0;}</style></head>
<body>
<script src="https://ads-partners.coupang.com/g.js"></script>
<script>
new PartnersCoupang.G({"id":992222,"template":"carousel","trackingCode":"AF1634685","width":"${AD_WIDTH}","height":"${AD_HEIGHT}","tsource":""});
</script>
</body>
</html>`;

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
        <iframe
          title="쿠팡 파트너스 광고"
          srcDoc={IFRAME_DOC}
          width={AD_WIDTH}
          height={AD_HEIGHT}
          style={{ border: 'none', display: 'block' }}
          scrolling="no"
        />
      </div>
    </div>
  );
}
