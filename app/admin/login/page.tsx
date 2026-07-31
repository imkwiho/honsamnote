'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const inputHash = await sha256(password);
      // NEXT_PUBLIC_ADMIN_HASH: 미리 해싱된 비밀번호 (원문 노출 없음)
      // 생성: node -e "require('crypto').createHash('sha256').update('비밀번호').digest('hex') |> console.log"
      const expectedHash = process.env.NEXT_PUBLIC_ADMIN_HASH ?? '';
      if (!expectedHash) {
        setError('관리자 설정이 필요합니다. NEXT_PUBLIC_ADMIN_HASH 환경변수를 설정하세요.');
        return;
      }
      if (inputHash === expectedHash) {
        localStorage.setItem('admin_auth', inputHash);
        localStorage.setItem('admin_auth_expires', String(Date.now() + 24 * 60 * 60 * 1000));
        router.push('/admin/dashboard');
      } else {
        setError('비밀번호가 올바르지 않습니다.');
      }
    } catch {
      setError('오류가 발생했습니다.');
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
