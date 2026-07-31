'use client';

import { useState } from 'react';
import emailjs from '@emailjs/browser';
import { addSubscriber } from '@/lib/subscribers';

// EmailJS 설정값 (환경변수로 주입)
const EJ_SERVICE  = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID  ?? '';
const EJ_TEMPLATE = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID ?? '';
const EJ_KEY      = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY  ?? '';
const NOTIFY_TO   = 'guihol@naver.com';

export default function SubscribeForm({ dark = false }: { dark?: boolean }) {
  const [email, setEmail]   = useState('');
  const [name,  setName]    = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [msg,   setMsg]     = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus('loading');
    try {
      // 1) Firebase에 구독자 저장
      await addSubscriber(email);

      // 2) EmailJS로 guihol@naver.com에 신규 구독 알림 발송
      if (EJ_SERVICE && EJ_TEMPLATE && EJ_KEY) {
        await emailjs.send(
          EJ_SERVICE,
          EJ_TEMPLATE,
          {
            to_email:       NOTIFY_TO,
            subscriber_email: email,
            subscriber_name:  name || '(미입력)',
            subscribed_at:  new Date().toLocaleString('ko-KR'),
          },
          { publicKey: EJ_KEY },
        );
      }

      setStatus('success');
      setMsg('구독해 주셔서 감사합니다! 🎉');
      setEmail('');
      setName('');
    } catch (err: unknown) {
      // 이미 구독 중이거나 EmailJS 오류
      const message = err instanceof Error ? err.message : '오류가 발생했습니다.';
      setStatus('error');
      setMsg(message);
    }
  }

  if (status === 'success') {
    return (
      <p className={`text-sm font-medium py-3 ${dark ? 'text-green-400' : 'text-green-600'}`}>
        {msg}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="이름 (선택)"
        className={`w-full px-4 py-3 rounded-xl text-sm outline-none transition-all ${
          dark
            ? 'bg-white text-[#33302b] placeholder-[#a39c8c] border-2 border-white/80 focus:border-white focus:ring-2 focus:ring-white/50'
            : 'bg-[#f7f2e6] text-[#33302b] placeholder-[#b0a893] border border-[#ece4d6] focus:border-[#7c8f6e] focus:ring-2 focus:ring-[#eef1e6]'
        }`}
        disabled={status === 'loading'}
      />
      <div className="flex gap-2.5">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="이메일 주소 *"
          required
          className={`flex-1 px-4 py-3 rounded-xl text-sm outline-none transition-all ${
            dark
              ? 'bg-white text-[#33302b] placeholder-[#a39c8c] border-2 border-white/80 focus:border-white focus:ring-2 focus:ring-white/50'
              : 'bg-[#f7f2e6] text-[#33302b] placeholder-[#b0a893] border border-[#ece4d6] focus:border-[#7c8f6e] focus:ring-2 focus:ring-[#eef1e6]'
          }`}
          disabled={status === 'loading'}
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap ${
            dark
              ? 'bg-white text-[#4f5f45] hover:bg-[#f3f6f0] font-bold'
              : 'bg-[#7c8f6e] text-white hover:bg-[#6b7d5e]'
          }`}
        >
          {status === 'loading' ? '처리 중…' : '구독하기'}
        </button>
      </div>
      {status === 'error' && (
        <p className={`text-xs ${dark ? 'text-red-100' : 'text-red-500'}`}>{msg}</p>
      )}
      <p className={`text-[11px] ${dark ? 'text-white/40' : 'text-[#b0a893]'}`}>
        구독 신청 정보는 guihol@naver.com으로 전달됩니다. 언제든지 해지할 수 있습니다.
      </p>
    </form>
  );
}
