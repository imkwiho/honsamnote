import type { ReactNode } from 'react';

export default function SummaryBox({ id, title, children }: { id?: string; title?: string; children: ReactNode }) {
  return (
    <div id={id} className="not-prose my-8 scroll-mt-20 rounded-2xl border border-blue-100 bg-blue-50/70 p-6">
      <p className="mb-2 flex items-center gap-2 text-[12px] font-bold uppercase tracking-wide text-blue-600">
        <span aria-hidden>💡</span> {title ?? '먼저 확인할 결론'}
      </p>
      <div className="prose prose-sm sm:prose-base max-w-none text-[#1d1d1f] prose-p:my-2 prose-strong:text-blue-700">
        {children}
      </div>
    </div>
  );
}
