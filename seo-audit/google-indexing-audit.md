# Google 크롤링·색인 감사 보고서

생성일: 2026-08-19  
감사 기준: 배포된 사이트 (https://honsamnote.co.kr) + 로컬 코드

---

## 1. 현재 상태 요약

| 항목 | 배포본(Phase 2b) | 로컬 코드(Phase 5) |
|---|---|---|
| 공개 URL 수 | 578개 (GSC 확인) | 566+22=588+ 예정 |
| 사이트맵 URL 수 | 578개 | 코드 재빌드 시 갱신 |
| 색인된 URL 수 | 1개 (GSC) | — |
| HTTP 200 (테스트) | 정상 (전 표본) | — |
| noindex | 없음 | 없음 |
| robots 차단 | 없음(Googlebot) | 없음 |
| canonical 오류 | 없음 | 없음 |
| orphan (실제) | 37개 (SEO verify 기준) | — |
| crawl depth 4+ | 없음 (최대 depth 3) | — |

---

## 2. 주요 발견 사항

### ✅ 정상 항목

| 항목 | 결과 |
|---|---|
| robots.txt | Googlebot 차단 없음 |
| noindex | 전 페이지 `robots: {index: true, follow: true}` |
| canonical | 모든 게시글 자기 자신 (self-canonical) |
| HTTP 상태 | 표본 18개 모두 200 |
| X-Robots-Tag | 없음 (차단 없음) |
| Googlebot vs 일반 UA | 동일한 응답 (cloaking 없음) |
| 초기 HTML 본문 포함 | 게시글 H1, 제목, 본문 텍스트 초기 HTML에 포함 |
| H1 수 | 게시글당 정확히 1개 |
| Breadcrumb JSON-LD | 존재, 파싱 정상 |
| Article JSON-LD | BlogPosting 스키마 정상 |
| Pillar 내부 링크 | `<a href>` 형태 (크롤 가능) |
| Cloudflare robots 추가 | `Google-Extended` 차단 = AI 훈련용 크롤러만 차단, Googlebot 자체는 허용 |

---

### ❌ 발견된 문제 및 조치

#### 문제 1: 클라이언트 JS 페이지네이션 — 초기 HTML에 10개 링크만 존재

**증거**: `/blog/` 초기 HTML에서 게시글 링크 수 = **10개** (566개 중)

- `PaginatedPostList` 컴포넌트가 `'use client'` + `useState(page=1)`로 구현됨
- 정적 export에서는 page=1 상태만 서버 프리렌더링됨
- 페이지 2~57은 JavaScript 클릭 후에만 링크가 나타남
- 카테고리 페이지도 동일: 각 카테고리 초기 HTML에 10개 링크만 있음

**조치**: URL 기반 페이지네이션 추가
- `app/blog/page/[page]/page.tsx` — /blog/page/2/ ~ /blog/page/57/ 정적 HTML 생성
- `app/category/[slug]/page/[page]/page.tsx` — 카테고리별 페이지네이션
- 기존 클라이언트 UI는 유지 (UX 변경 없음) + 서버 렌더 URL 링크 섹션 추가
- 빌드 결과: /blog/page/ 56개, /category/*/page/ 각 카테고리별 정적 HTML 생성 확인

**수정 파일**: `app/blog/page/[page]/page.tsx` (신규), `app/blog/page.tsx`, `app/category/[slug]/page/[page]/page.tsx` (신규), `app/category/[slug]/page.tsx`

---

#### 문제 2: 사이트맵 lastmod — 매 빌드마다 갱신

**증거**: 배포된 sitemap.xml에서 홈/카테고리/가이드 lastmod = `2026-08-17T03:57:58.825Z` (빌드 타임)

- `app/sitemap.ts`에서 `const now = new Date()`를 homepage, /blog/, categories, guides에 모두 사용
- 새 빌드 시마다 이 URL들의 lastmod가 오늘 날짜로 갱신됨
- Google이 내용 변경 없이도 매일 다시 크롤해야 하는 것으로 오해

**조치**: `newestPostDate` (가장 최근 게시글 날짜) 사용
- 홈, /blog/: 가장 최근 게시글 날짜
- 카테고리: 해당 카테고리 최신 글 날짜
- 가이드: 사이트 전체 최신 글 날짜 (클러스터 분류 비용 대비 근사)
- 게시글: 기존대로 `updatedAt ?? date` 유지 (이미 정상)

**수정 파일**: `app/sitemap.ts`

---

#### 문제 3: Phase 3~5 코드 GitHub 미push

**증거**: `git log origin/main --oneline -1` = `830c82e (SEO Phase 2b)`

- 배포 사이트는 Phase 2b 코드 (3개 Pillar만 포함)
- Phase 3에서 추가한 3개 Pillar (emergency, kitchen-cleaning, bathroom-cleaning) → **배포본 404**
- Phase 3~5의 제목 개선(271개), Answer-first 개선(54개) 등 미반영
- Sitemap도 Phase 2b 기준이므로 3개 Pillar URL 없음 → GSC 문제 없음

**조치**: 코드 변경 없음. **사람이 GitHub에 push 필요**
```bash
git push origin main
```
이후 Cloudflare Pages가 자동 재빌드·배포.

---

#### 문제 4: 내비게이션 링크 trailing slash 없음 — 불필요한 308 redirect

**증거**: `/blog` → 308 → `/blog/`, `/category/cost` → 308 → `/category/cost/`

- 홈페이지 카테고리 링크: `/category/cost` (trailing slash 없음)
- ArticleFooter: `/blog`, `/category/${category}` (trailing slash 없음)
- 가이드 링크: `/guide/${pillar.slug}` (trailing slash 없음)
- `next.config.ts`에 `trailingSlash: true`이므로 실제 파일은 슬래시 포함 URL

**조치**: trailing slash 추가
- `app/page.tsx` CATEGORIES 배열 href
- `app/page.tsx` Pillar Link
- `app/category/[slug]/page.tsx` Pillar Link
- `components/article/ArticleFooter.tsx` /blog/, /category/${category}/

**수정 파일**: 위 4개 파일

---

## 3. Sitemap 상태

| 항목 | 배포본 | 로컬 코드 |
|---|---|---|
| 상태 | GSC에서 성공 | — |
| URL 수 | 578개 | 588+개 (Phase 3+ 포함 시) |
| 잘못된 URL | 없음 (3개 Pillar는 sitemap에 없음) | — |
| lastmod 이상 | 정적/카테고리/가이드 = 빌드 타임 | 수정 완료 |
| 중복 URL | 없음 | — |
| 404 URL in sitemap | 없음 (배포본 기준) | — |

---

## 4. 내부 링크 현황

| 항목 | 값 |
|---|---|
| 링크 그래프 orphan (MDX 기준) | 502개 |
| 링크 그래프 orphan (실제 — ArticleFooter 포함) | 37개 (seo-verify 기준) |
| Pillar 페이지 정적 링크 | 23개 (laundry 기준) — 모든 클러스터 글 포함 |
| 카테고리 페이지 초기 HTML 링크 | 10개 (JS 필요) → URL 페이지네이션으로 개선 |
| 내부 링크 형식 | 모두 `<a href>` — JavaScript-only 없음 |

---

## 5. Googlebot 테스트 결과

| URL | 일반 UA | Googlebot UA |
|---|---|---|
| / | 200 | 200 |
| /blog/ | 200 | 200 |
| /category/cost/ | 200 | 200 |
| /guide/laundry/ | 200 | 200 |
| /guide/emergency/ | 404 | 404 (Phase 3 미배포) |
| 게시글 16개 표본 | 모두 200 | 모두 200 |

**결론**: Googlebot과 일반 UA 응답 동일. Cloaking 없음.

---

## 6. Cloudflare 점검

### 코드에서 확인된 사항
- `app/robots.ts`: `/admin`, `/api/` 차단 — 공개 콘텐츠 차단 없음
- CSS/JS 렌더링 리소스: 차단 없음

### 실제 robots.txt에서 확인된 Cloudflare 관리 섹션
- `User-agent: Google-Extended Disallow: /` — AI 훈련용 크롤러 차단 (정상, 의도적)
- `Googlebot`: 별도 규칙 없음 → `User-agent: *` 규칙 적용 → `Allow: /` ✅
- `ClaudeBot`, `GPTBot` 등 AI 크롤러 차단 — 의도적 Cloudflare 설정

### MANUAL_CLOUDFLARE_CHECK_REQUIRED (Dashboard에서만 확인 가능)
- Bot Fight Mode 활성화 여부
- WAF 규칙 (IP 범위 차단, 국가 차단 등)
- Rate limiting 설정
- Challenge 페이지 조건
- Googlebot IP 범위가 WAF에서 허용되어 있는지

> Google이 단 1개만 색인했고 실시간 URL 테스트는 정상이므로, Cloudflare에서 Googlebot을 차단하고 있을 가능성은 낮다. 단, 확인이 필요하다면 Cloudflare Dashboard → Security → Bots → Bot Fight Mode OFF 여부 확인 권장.

---

## 7. 자동발행 분석

→ `seo-audit/publishing-crawl-analysis.md` 참조

**결론**: 발행 빈도 자체가 크롤링을 막는 수준은 아님. 신규 사이트 크롤 예산 제한이 주 원인.

---

## 8. 수동 색인 요청 우선 목록

→ `seo-audit/manual-index-priority.csv` 참조

**이미 색인 요청 완료**: `https://honsamnote.co.kr/blog/2026-08-14-storage-auto-fcf546/`

**다음 추천 순서**:
1. `https://honsamnote.co.kr/` (홈페이지)
2. Guide 3개 (oneroom-storage, laundry, loneliness)
3. 대형 카테고리 3개 (cleaning, products, safety)

---

## 9. 실제 코드 수정 내역

| 파일 | 수정 이유 | 수정 내용 |
|---|---|---|
| `app/blog/page/[page]/page.tsx` | 클라이언트 JS 페이지네이션 → 정적 URL 페이지 | 신규 생성 — 56개 페이지 정적 HTML 생성 |
| `app/blog/page.tsx` | URL 페이지 링크 추가 | 서버렌더 페이지 번호 링크 섹션 추가 |
| `app/category/[slug]/page/[page]/page.tsx` | 카테고리 클라이언트 페이지네이션 | 신규 생성 |
| `app/category/[slug]/page.tsx` | URL 페이지 링크 추가 | 서버렌더 페이지 번호 링크 섹션 추가 |
| `app/sitemap.ts` | lastmod 매 빌드 갱신 문제 | now → newestPostDate 사용 |
| `app/page.tsx` | trailing slash 없음 | 카테고리/가이드 링크 `/category/cost/` 형식 |
| `app/category/[slug]/page.tsx` | trailing slash 없음 | Pillar 링크 수정 |
| `components/article/ArticleFooter.tsx` | trailing slash 없음 | /blog/, /category/${cat}/ 수정 |

---

## 10. 최종 판정

### **판정 B: 기술 구조는 정상이나 Google이 아직 크롤링하지 않음**

**근거:**
1. robots.txt — Googlebot 차단 없음 (직접 확인)
2. noindex — 없음 (코드 직접 확인)
3. canonical — 올바른 self-canonical (직접 확인)
4. HTTP 상태 — 18개 표본 모두 200, 배포본 포스트 정상
5. 초기 HTML — 본문 텍스트, H1, JSON-LD 포함 (직접 확인)
6. 실시간 URL 테스트 — "URL을 Google에 등록할 수 있음" (사용자 GSC 확인)
7. Googlebot vs 일반 UA — 동일 응답 (직접 확인)

**현재 상태**: 신규 사이트의 정상적인 초기 단계. Google이 578개 URL을 발견(sitemap)했지만 크롤 예산 부족으로 대기 중.

**일부 기술 문제 존재 (C 요소)**:
- 클라이언트 JS 페이지네이션 → **수정 완료**
- lastmod 매 빌드 갱신 → **수정 완료**
- trailing slash 불일치 → **수정 완료**
- Phase 3~5 미배포 (Pillar 3개 404) → **GitHub push 필요**

**Phase 3~5 코드 push 후 개선 기대:**
- Pillar 3개 추가 → 허브 강화
- 제목 271개 + Answer-first 54개 개선 반영
- URL 페이지네이션으로 크롤 가능 페이지 수 증가

**Google 색인은 최종적으로 Google이 결정한다. 이번 작업은 크롤 가능한 최상의 구조를 만드는 것으로 한정.**

---

## 11. 다음 단계 (사람 작업)

1. **즉시**: `git push origin main` → Cloudflare Pages 자동 재빌드
2. **GSC**: 홈페이지 + Guide 3개 + 대형 카테고리 수동 색인 요청
3. **Cloudflare Dashboard**: Bot Fight Mode 확인 (MANUAL_CLOUDFLARE_CHECK_REQUIRED)
4. **4주 후**: GSC 재확인 — 크롤링 진행 여부 확인
