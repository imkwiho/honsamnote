import type { ReactNode } from 'react';

export default function ChecklistBox({ id, title, children }: { id?: string; title?: string; children: ReactNode }) {
  return (
    <div id={id} className="not-prose my-8 scroll-mt-20 rounded-2xl border border-[#dde5d2] bg-[#eef1e6] p-6">
      <p className="mb-3 flex items-center gap-2 text-[12px] font-bold uppercase tracking-wide text-[#5f7052]">
        <span aria-hidden>✓</span> {title ?? '체크리스트'}
      </p>
      <div
        className="prose prose-sm sm:prose-base max-w-none text-[#33302b] prose-p:my-2
          [&_ul]:list-none [&_ul]:pl-0 [&_ul]:space-y-2 [&_ul]:my-0
          [&_li]:relative [&_li]:pl-7 [&_li]:my-0
          [&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:top-0.5
          [&_li]:before:flex [&_li]:before:h-5 [&_li]:before:w-5 [&_li]:before:items-center [&_li]:before:justify-center
          [&_li]:before:rounded-full [&_li]:before:bg-[#7c8f6e] [&_li]:before:text-[11px] [&_li]:before:font-bold
          [&_li]:before:text-white [&_li]:before:content-['✓']"
      >
        {children}
      </div>
    </div>
  );
}
