import type { ReactNode } from 'react';

export default function WarningBox({ id, title, children }: { id?: string; title?: string; children: ReactNode }) {
  return (
    <div id={id} className="not-prose my-8 scroll-mt-20 rounded-2xl border border-[#e8d2c4] bg-[#f8ede3] p-6">
      <p className="mb-2 flex items-center gap-2 text-[12px] font-bold uppercase tracking-wide text-[#a9683f]">
        <span aria-hidden>⚠</span> {title ?? '주의'}
      </p>
      <div className="prose prose-sm sm:prose-base max-w-none text-[#33302b] prose-p:my-2">
        {children}
      </div>
    </div>
  );
}
