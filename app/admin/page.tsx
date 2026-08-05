'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const router = useRouter();
  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/session')
      .then(res => {
        if (cancelled) return;
        router.push(res.ok ? '/admin/dashboard' : '/admin/login');
      })
      .catch(() => {
        if (!cancelled) router.push('/admin/login');
      });
    return () => {
      cancelled = true;
    };
  }, [router]);
  return null;
}
