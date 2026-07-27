'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const router = useRouter();
  useEffect(() => {
    const auth = localStorage.getItem('admin_auth');
    const expires = Number(localStorage.getItem('admin_auth_expires') ?? 0);
    if (auth && Date.now() < expires) {
      router.push('/admin/dashboard');
    } else {
      router.push('/admin/login');
    }
  }, [router]);
  return null;
}
