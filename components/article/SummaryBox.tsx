import type { ReactNode } from 'react';

export default function SummaryBox({ id, title, children }: { id?: string; title?: string; children: ReactNode }) {
  return (
    <div id={id} className="not-prose my-8 scroll-mt-20 rounded-2xl border border-[#e3ddc9] bg-[#f7f2e6] p-6">
      <p className="mb-2 flex items-center gap-2 text-[12px] font-bold uppercase tracking-wide text-[#a9822f]">
        <span aria-hidden>✦</span> {title ?? '먼저 확인할 결론'}
      </p>
      <div className="prose prose-sm sm:prose-base max-w-none text-[#33302b] prose-p:my-2 prose-strong:text-[#8a6a1f]">
        {children}
      </div>
    </div>
  );
}
