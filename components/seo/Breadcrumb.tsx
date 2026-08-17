import Link from 'next/link';
import type { BreadcrumbNode } from '@/lib/seo';

interface BreadcrumbProps {
  items: BreadcrumbNode[];
}

// 화면에 실제로 보이는 Breadcrumb UI. lib/seo.ts:buildBreadcrumbJsonLd가 만드는
// JSON-LD와 반드시 같은 항목·순서를 써야 한다(각 페이지에서 동일한 items
// 배열을 두 곳에 나눠 넘기는 방식으로 어긋나지 않게 한다).
export default function Breadcrumb({ items }: BreadcrumbProps) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="현재 위치" className="mb-4 -mx-1 overflow-x-auto">
      <ol className="flex items-center gap-1.5 whitespace-nowrap px-1 text-[12px] text-[#a39c8c]">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={`${item.name}-${i}`} className="flex items-center gap-1.5">
              {i > 0 && <span aria-hidden="true">›</span>}
              {isLast || !item.href ? (
                <span className="text-[#8a8377] font-medium" aria-current={isLast ? 'page' : undefined}>
                  {item.name}
                </span>
              ) : (
                <Link href={item.href} className="hover:text-[#5f7052] hover:underline transition-colors">
                  {item.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
