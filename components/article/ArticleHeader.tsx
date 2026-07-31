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
            style={{ background: '#7c8f6e' }}
          >
            {categoryName}
          </Link>
        )}
        {tags.slice(0, 3).map(tag => (
          <span key={tag} className="text-[11px] font-semibold text-[#5f7052] bg-[#eef1e6] px-2.5 py-1 rounded-full">
            #{tag}
          </span>
        ))}
      </div>

      <h1 className="text-[1.75rem] sm:text-[2.5rem] leading-[1.32] sm:leading-[1.26] text-[#2f2c26] mb-4"
        style={{ fontFamily: 'var(--font-serif)' }}>
        {title}
      </h1>

      <p className="text-[#6b6558] text-[16px] sm:text-[18px] leading-relaxed mb-5">
        {description}
      </p>

      <div className="flex items-center gap-3 text-[13px] text-[#a39c8c] border-t border-[#ece4d6] pt-4">
        <time>{date}</time>
        <span aria-hidden>·</span>
        <ViewCounter slug={slug} />
      </div>
    </header>
  );
}
