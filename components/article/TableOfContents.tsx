import type { TocItem } from '@/lib/article';

export default function TableOfContents({ items }: { items: TocItem[] }) {
  if (items.length < 2) return null;

  return (
    <details
      className="not-prose mb-10 rounded-2xl border border-[#ece4d6] bg-[#fffdf9]"
      open
    >
      <summary className="cursor-pointer select-none list-none px-5 py-3.5 flex items-center justify-between text-[13px] font-bold text-[#2f2c26]">
        <span className="flex items-center gap-2">
          <span aria-hidden>✦</span> 목차
        </span>
        <span className="text-[#b0a893] text-[11px] font-medium">{items.length}개 섹션</span>
      </summary>
      <ol className="px-5 pb-4 space-y-1.5">
        {items.map((item, i) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="flex items-baseline gap-2 text-[13px] text-[#5c5749] hover:text-[#4f5f45] transition-colors"
            >
              <span className="text-[#b0a893] tabular-nums">{String(i + 1).padStart(2, '0')}</span>
              {item.text}
            </a>
          </li>
        ))}
      </ol>
    </details>
  );
}
