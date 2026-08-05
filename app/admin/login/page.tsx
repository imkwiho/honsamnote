'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // 비밀번호는 클라이언트에서 해싱하거나 저장하지 않는다. HTTPS로 서버에
  // 그대로 전달하면, 서버(Cloudflare Pages Function)가 해시로 바꿔 시크릿과
  // 비교하고, 성공 시 HttpOnly 세션 쿠키를 내려준다 — 그 쿠키는 이 페이지의
  // JS도 읽을 수 없다.
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.ok) {
        router.push('/admin/dashboard');
      } else if (res.status === 503) {
        setError('관리자 비밀번호가 아직 설정되지 않았습니다. Cloudflare 환경변수 ADMIN_AUTH_HASH를 설정하세요.');
      } else {
        setError(json?.error ?? '비밀번호가 올바르지 않습니다.');
      }
    } catch {
      setError('오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-10 w-full max-w-sm">
        <h1 className="text-xl font-bold text-gray-900 mb-6 text-center">관리자 로그인</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="비밀번호"
            className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7c8f6e]"
            required
            autoFocus
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {loading ? '확인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  );
}
