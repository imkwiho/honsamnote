import Link from 'next/link';
import ViewCounter from '@/components/ViewCounter';

interface ArticleHeaderProps {
  title: string;
  description: string;
  date: string;
  slug: string;
  category?: string;
  categoryName?: string;
  tags: string[];
}

export default function ArticleHeader({ title, description, date, slug, category, categoryName, tags }: ArticleHeaderProps) {
  return (
    <header className="mb-8 sm:mb-10">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {category && categoryName && (
          <Link
            href={`/category/${category}`}
            className="text-[11px] font-bold uppercase tracking-wide text-white px-3 py-1 rounded-full hover:opacity-90 transition-opacity"
            style={{ background: '#0071e3' }}
          >
            {categoryName}
          </Link>
        )}
        {tags.slice(0, 3).map(tag => (
          <span key={tag} className="text-[11px] font-semibold text-[#3a6fc4] bg-[#eaf3ff] px-2.5 py-1 rounded-full">
            #{tag}
          </span>
        ))}
      </div>

      <h1 className="text-[1.75rem] sm:text-[2.5rem] font-bold tracking-tight leading-[1.28] sm:leading-[1.22] text-[#1d1d1f] mb-4">
        {title}
      </h1>

      <p className="text-[#5b5f66] text-[16px] sm:text-[18px] leading-relaxed mb-5">
        {description}
      </p>

      <div className="flex items-center gap-3 text-[13px] text-[#8e8e93] border-t border-[#e5e5ea] pt-4">
        <time>{date}</time>
        <span aria-hidden>·</span>
        <ViewCounter slug={slug} />
      </div>
    </header>
  );
}
