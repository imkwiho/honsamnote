import type { ReactNode } from 'react';

export default function WarningBox({ id, title, children }: { id?: string; title?: string; children: ReactNode }) {
  return (
    <div id={id} className="not-prose my-8 scroll-mt-20 rounded-2xl border border-amber-200 bg-amber-50/70 p-6">
      <p className="mb-2 flex items-center gap-2 text-[12px] font-bold uppercase tracking-wide text-amber-700">
        <span aria-hidden>⚠️</span> {title ?? '주의'}
      </p>
      <div className="prose prose-sm sm:prose-base max-w-none text-[#1d1d1f] prose-p:my-2">
        {children}
      </div>
    </div>
  );
}
