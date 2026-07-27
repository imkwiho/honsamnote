'use client';

import { useEffect, useState } from 'react';
import { incrementViewCount } from '@/lib/views';

export default function ViewCounter({ slug }: { slug: string }) {
  const [views, setViews] = useState<number | null>(null);

  useEffect(() => {
    incrementViewCount(slug).then(setViews).catch(() => setViews(null));
  }, [slug]);

  if (views === null) return null;
  return <span className="text-gray-400 text-sm">{views.toLocaleString()}회 조회</span>;
}
