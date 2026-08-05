// 대시보드 전체에서 재사용하는 카드 셸. 기존 관리자 화면의 톤(둥근 카드,
// 옅은 테두리, 과한 그림자 없음, 세이지/베이지 톤)을 그대로 따른다.
export default function AnalyticsCard({
  title,
  children,
  right,
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-[#e7e2d6] rounded-2xl p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h2 className="text-[15px] font-semibold text-[#33302b]">{title}</h2>
        {right}
      </div>
      {children}
    </div>
  );
}

export function CardErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="py-6 text-center">
      <p className="text-[13px] text-[#b0745a]">통계를 불러오지 못했습니다.</p>
      <p className="text-[11px] text-[#a8a196] mt-1">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-3 text-[12px] font-medium text-[#6b7d5e] hover:underline">
          다시 시도
        </button>
      )}
    </div>
  );
}

export function CardEmptyState({ message = '아직 데이터가 없습니다.' }: { message?: string }) {
  return <p className="py-6 text-center text-[13px] text-[#a8a196]">{message}</p>;
}

export function CardLoadingState() {
  return (
    <div className="py-6 flex justify-center">
      <div className="w-5 h-5 border-2 border-[#c9d4bd] border-t-[#6b7d5e] rounded-full animate-spin" />
    </div>
  );
}
