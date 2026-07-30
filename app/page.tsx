import { getAllPosts } from '@/lib/mdx';
import Link from 'next/link';
import SubscribeForm from '@/components/SubscribeForm';
import QuickStats from '@/components/QuickStats';

// 밝은 블루 팔레트
const BLUE = '#2f6fed';
const BLUE_DARK = '#0a3d91';
const BLUE_LIGHT = '#e3edfc';
// 강조 파랑 (바, 칩 등 소형 엑센트)
const ACCENT = '#0071e3';

const CATEGORY_ICON: Record<string, string> = {
  cost: '💸',
  food: '🍱',
  storage: '📦',
  cleaning: '🧺',
  safety: '🚨',
  housing: '🏠',
  products: '🛒',
  lifestyle: '🌤️',
};

const CATEGORIES = [
  { label: '생활비 최적화', href: '/category/cost', color: 'bg-blue-50 text-blue-600' },
  { label: '혼밥·식재료 관리', href: '/category/food', color: 'bg-sky-50 text-sky-600' },
  { label: '좁은 집과 수납', href: '/category/storage', color: 'bg-cyan-50 text-cyan-600' },
  { label: '청소·세탁·집안일', href: '/category/cleaning', color: 'bg-indigo-50 text-indigo-600' },
  { label: '안전·응급상황', href: '/category/safety', color: 'bg-rose-50 text-rose-600' },
  { label: '주거·계약·이사', href: '/category/housing', color: 'bg-teal-50 text-teal-600' },
  { label: '1인 가구 제품·서비스', href: '/category/products', color: 'bg-emerald-50 text-emerald-600' },
  { label: '관계·고립·생활 리듬', href: '/category/lifestyle', color: 'bg-violet-50 text-violet-600' },
];

export default async function HomePage() {
  const posts = await getAllPosts();
  const [p0, p1, p2, p3, p4] = posts;

  return (
    <div>

      {/* ══ ① 최상단 뉴스레터 배너 ══ */}
      <section className="px-4 sm:px-6 pt-8 pb-2 max-w-6xl mx-auto">
        <div className="rounded-3xl overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${BLUE} 0%, ${BLUE_DARK} 100%)` }}>
          <div className="flex flex-col lg:flex-row items-center gap-8 px-10 sm:px-14 py-10">
            <div className="flex-1 text-center lg:text-left">
              <p className="text-[11px] font-semibold tracking-widest uppercase text-white/50 mb-2">뉴스레터</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight mb-2">
                혼자 사는 삶의 문제 해결법,<br className="hidden sm:block"/>
                매주 받아보세요.
              </h2>
              <p className="text-[14px] text-white/70 leading-relaxed">
                생활비·집안일·안전까지, 혼자 살 때만 겪는<br className="hidden sm:block"/>
                번거로운 문제를 정리해서 보내드립니다.
              </p>
            </div>
            <div className="w-full lg:w-[420px] shrink-0">
              <SubscribeForm dark />
            </div>
          </div>
        </div>
      </section>

      {/* ══ ② 히어로 ══ */}
      <section className="text-center px-6 pt-12 pb-10 max-w-3xl mx-auto">
        <h1 className="text-[2.6rem] sm:text-[3.4rem] font-bold tracking-tight leading-[1.1] text-[#1d1d1f] mb-4">
          혼자 사는 삶,<br />더 쉽게 만드는 생활 안내서.
        </h1>
        <p className="text-[#6e6e73] text-[17px] leading-relaxed max-w-xl mx-auto">
          혼자 사는 삶을 멋있게 포장하지 않습니다.<br className="hidden sm:block"/>
          혼자이기 때문에 더 번거로운 문제를, 실제로 해결해 드립니다.
        </p>
      </section>

      {/* ══ ③ 피처 카드 3열 — 시간·돈·공간·안전 ══ */}
      <section className="px-4 sm:px-6 mb-5 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          {/* 카드 1 — 실제 최신 글 4편 */}
          <div className="bento-card rounded-3xl flex flex-col" style={{ background: `linear-gradient(160deg, ${BLUE} 0%, ${BLUE_DARK} 100%)` }}>
            <div className="flex-1 p-7 pb-4">
              <div className="space-y-2.5">
                {posts.length > 0 ? (
                  posts.slice(0, 4).map(post => (
                    <Link key={post.slug} href={`/blog/${post.slug}`}
                      className="flex items-center gap-3 rounded-2xl px-4 py-3 hover:bg-white/[0.08] transition-colors"
                      style={{ background: 'rgba(255,255,255,0.12)' }}>
                      <span className="text-lg leading-none shrink-0">{(post.category && CATEGORY_ICON[post.category]) || '📝'}</span>
                      <span className="text-[13px] text-white font-medium line-clamp-1">{post.title}</span>
                    </Link>
                  ))
                ) : (
                  <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.12)' }}>
                    <span className="text-[13px] text-white/70 font-medium">첫 글이 발행되면 여기에 표시됩니다.</span>
                  </div>
                )}
              </div>
            </div>
            <div className="px-7 pb-8 pt-2">
              <p className="text-[16px] font-bold text-white mb-1">생활 장면 중심</p>
              <p className="text-[13px] leading-snug" style={{ color: 'rgba(255,255,255,0.65)' }}>
                막연한 정보가 아니라<br />지금 겪는 문제의 답을 먼저 드립니다.
              </p>
            </div>
          </div>

          {/* 카드 2 — 4대 원칙 */}
          <div className="flex flex-col gap-4">
            <div className="bento-card rounded-3xl bg-white p-7 flex-1 flex flex-col justify-between">
              <div className="flex flex-col gap-2 mb-4">
                {['시간', '돈', '공간', '안전'].map((step) => (
                  <div key={step} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 text-white"
                      style={{ background: ACCENT }}>
                      ✓
                    </div>
                    <span className="text-[13px] text-[#1d1d1f] font-medium">{step} 최적화</span>
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-green-400" />
                  </div>
                ))}
              </div>
              <div>
                <p className="text-[16px] font-bold text-[#1d1d1f] mb-0.5">4가지 기준</p>
                <p className="text-[13px] text-[#6e6e73] leading-snug">이 글이 넷 중 하나를 실제로 개선하는가.</p>
              </div>
            </div>
            <div className="bento-card rounded-3xl bg-white p-7">
              <div className="flex items-end gap-1.5 mb-4">
                <span className="text-[2.2rem] font-bold leading-none" style={{ color: ACCENT }}>8</span>
                <span className="text-[#6e6e73] text-[14px] mb-1.5">개 생활 영역</span>
              </div>
              <p className="text-[16px] font-bold text-[#1d1d1f] mb-0.5">필요할 때 발행</p>
              <p className="text-[13px] text-[#6e6e73] leading-snug">정해진 스케줄 없이, 준비된 순간에 직접 발행합니다.</p>
            </div>
          </div>

          {/* 카드 3 — 실제 발행 현황 */}
          <div className="flex flex-col gap-4">
            <div className="bento-card rounded-3xl bg-white p-7 flex-1">
              <div className="mb-5 space-y-3">
                {[
                  { label: '발행된 글', val: `${posts.length}편` },
                  { label: '다루는 생활 영역', val: `${CATEGORIES.length}개` },
                  { label: '최근 발행일', val: posts[0]?.date ?? '-' },
                ].map(({ label, val }) => (
                  <div key={label} className="flex items-center justify-between text-[13px] py-1.5 border-b border-[#f2f2f7] last:border-0">
                    <span className="text-[#6e6e73]">{label}</span>
                    <span className="font-bold" style={{ color: ACCENT }}>{val}</span>
                  </div>
                ))}
              </div>
              <p className="text-[16px] font-bold text-[#1d1d1f] mb-0.5">정보보다 판단 기준</p>
              <p className="text-[13px] text-[#6e6e73] leading-snug">사야 하는지, 사지 않아도 되는지까지 알려드립니다.</p>
            </div>
            <div className="bento-card rounded-3xl bg-white p-7">
              <div className="flex gap-3 mb-4">
                {['🏠', '⏱️', '🛡️'].map(e => (
                  <div key={e} className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl"
                    style={{ background: BLUE_LIGHT }}>{e}</div>
                ))}
              </div>
              <p className="text-[16px] font-bold text-[#1d1d1f] mb-0.5">공식정보 + 실행 방법</p>
              <p className="text-[13px] text-[#6e6e73] leading-snug">확인된 자료를 생활 언어로 정리합니다.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ══ ④ 카테고리 칩 ══ */}
      <section className="px-4 sm:px-6 mb-5 max-w-6xl mx-auto">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(c => (
            <a key={c.label} href={c.href}
              className={`text-[12px] font-semibold px-4 py-2 rounded-full transition-opacity hover:opacity-70 ${c.color}`}>
              {c.label}
            </a>
          ))}
        </div>
      </section>

      {/* ══ ⑤ 블로그 포스트 벤토 그리드 ══ */}
      {posts.length > 0 && (
        <section className="px-4 sm:px-6 mb-10 max-w-6xl mx-auto space-y-4">
          <p className="text-[13px] font-semibold tracking-widest uppercase text-[#aeaeb2]">최신 글</p>

          {p0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Link href={`/blog/${p0.slug}`}
                className="bento-card lg:col-span-2 rounded-3xl text-white p-8 flex flex-col justify-between min-h-[220px] group"
                style={{ background: `linear-gradient(135deg, ${BLUE} 0%, ${BLUE_DARK} 100%)` }}>
                <div className="flex flex-wrap gap-2 mb-4">
                  {p0.tags.slice(0, 2).map(tag => (
                    <span key={tag} className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full"
                      style={{ background: 'rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.85)' }}>{tag}</span>
                  ))}
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold leading-snug mb-2 group-hover:text-white/80 transition-colors">{p0.title}</h3>
                  <p className="text-[13px] line-clamp-2 leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>{p0.description}</p>
                </div>
                <div className="flex items-center gap-2 mt-5 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  <time>{p0.date}</time><span>·</span>
                  <span className="group-hover:text-white/80 transition-colors">읽기 →</span>
                </div>
              </Link>
              {p1 && (
                <Link href={`/blog/${p1.slug}`}
                  className="bento-card rounded-3xl bg-white p-7 flex flex-col justify-between min-h-[220px] group">
                  <div>
                    {p1.tags.slice(0, 1).map(tag => (
                      <span key={tag} className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#f2f2f7] text-[#6e6e73]">{tag}</span>
                    ))}
                    <h3 className="text-[16px] font-bold text-[#1d1d1f] mt-3 mb-2 leading-snug group-hover:text-[#3a3a3c] transition-colors line-clamp-3">{p1.title}</h3>
                    <p className="text-[13px] text-[#6e6e73] line-clamp-2 leading-relaxed">{p1.description}</p>
                  </div>
                  <time className="text-xs text-[#aeaeb2] mt-4 block">{p1.date}</time>
                </Link>
              )}
            </div>
          )}

          {(p2 || p3 || p4) && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[p2, p3, p4].filter(Boolean).map(post => post && (
                <Link key={post.slug} href={`/blog/${post.slug}`}
                  className="bento-card rounded-3xl bg-white p-7 flex flex-col justify-between min-h-[180px] group">
                  <div>
                    {post.tags.slice(0, 1).map(tag => (
                      <span key={tag} className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#f2f2f7] text-[#6e6e73]">{tag}</span>
                    ))}
                    <h3 className="text-[15px] font-bold text-[#1d1d1f] mt-3 leading-snug group-hover:text-[#3a3a3c] transition-colors line-clamp-2">{post.title}</h3>
                    <p className="text-[12px] text-[#6e6e73] mt-1.5 line-clamp-2 leading-relaxed">{post.description}</p>
                  </div>
                  <time className="text-xs text-[#aeaeb2] mt-4 block">{post.date}</time>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {posts.length === 0 && (
        <section className="px-4 sm:px-6 mb-10 max-w-6xl mx-auto text-center py-16">
          <p className="text-[#6e6e73] text-[14px]">
            아직 발행된 글이 없습니다. GitHub Actions → &ldquo;블로그 글 수동 발행&rdquo; 워크플로를 실행해 첫 글을 만들어 보세요.
          </p>
        </section>
      )}

      <QuickStats />
    </div>
  );
}
