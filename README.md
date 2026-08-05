# 1인 가구 생활백서

혼자 사는 사람의 시간·돈·공간·안전을 최적화하는 생활 정보 블로그. Next.js 16 + Firebase + Gemini AI 기반이며, Cloudflare Pages에 정적 배포됩니다.

배포는 GitHub Actions가 아니라 **Cloudflare Pages 자체의 Git 연동**이 담당합니다. `main` 브랜치에 푸시가 생기면(글 발행 워크플로가 커밋하는 것 포함) Cloudflare가 자동으로 감지해 빌드·배포합니다.

글 발행은 **자동 스케줄 없이, GitHub Actions를 수동으로 실행할 때만** 이루어집니다. 원하는 시간에 Actions 탭에서 버튼을 눌러 발행하세요.

## 기술 스택

- **프레임워크**: Next.js 16 (Static Export)
- **스타일**: Tailwind CSS v4
- **데이터베이스**: Firebase Firestore (조회수, 구독자)
- **AI**: Google Gemini 2.5 Flash (콘텐츠 자동 생성)
- **배포**: Cloudflare Pages (Cloudflare 자체 Git 연동, push 시 자동 빌드·배포)

## 콘텐츠 전략

`content/topics.json`에 8개 생활 영역(생활비/식재료/수납/청소/안전/주거/제품/관계)과 약 80개의 소재가 미리 정리되어 있습니다. 각 소재는 `status: pending → published`로 관리되며, 발행 워크플로를 실행할 때마다 자동으로 다음 소재를 골라 글을 씁니다.

**소재가 바닥난 카테고리는 AI가 스스로 새 소재를 골라 씁니다.** 정해진 소재 풀에서 카테고리당 필요한 개수를 못 채우면, 부족한 만큼 AI가 그 카테고리 안에서 아직 다루지 않은 새로운 생활 문제를 직접 브레인스토밍합니다 (이미 발행된 글 제목들을 참고해 중복을 피합니다). 그래서 소재 풀이 전부 소진되어도 매번 카테고리별로 지정한 개수만큼 항상 글이 나옵니다 — `content/topics.json`에 새 항목을 직접 추가할 필요는 없습니다.

## 글 발행하기 (수동)

1. GitHub 저장소 → **Actions** 탭 → **"블로그 글 수동 발행"** 워크플로 선택
2. **Run workflow** 클릭
3. 입력값 (모두 선택 사항, 비워두면 기본값 사용)
   - `per_category`: 카테고리당 생성할 글 개수 (기본 3개)
   - `category`: 특정 카테고리만 쓰고 싶으면 지정, 비워두면 `auto`로 **8개 카테고리 전부**에 위 개수만큼씩 생성 (기본값 기준 8 × 3 = 24개)
4. 실행하면 AI가 각 카테고리에서 주제를 스스로 정하고, `content/blog/`에 글을 커밋·푸시합니다 → Cloudflare Pages의 Git 연동이 이 푸시를 감지해 자동으로 빌드·배포합니다.
   - Gemini API 요청 한도를 보호하기 위해 최대 4개씩 동시에 생성합니다 (전체가 한 번에 요청되지 않음).

즉, **"Run workflow"를 누르는 순간이 곧 발행 시점**입니다. 정해진 시간에 자동으로 올라가지 않습니다.

로컬에서 직접 생성해보고 싶다면:

```bash
npx ts-node --project tsconfig.scripts.json scripts/generate-post.ts 3 auto
# 인자: [카테고리당 개수] [카테고리 슬러그 또는 auto]
```

### 주의: 비용·법률·안전 관련 글

`cost`, `housing`, `safety` 카테고리 글은 AI가 본문 끝에 "정보 확인 필요" 안내 문구를 자동으로 넣도록 프롬프트가 구성되어 있습니다. 다만 AI가 생성한 수치나 절차는 실제 발행 전에 한 번 훑어보는 것을 권장합니다.

## 로컬 개발

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 설정
cp .env.local.example .env.local
# .env.local 파일을 편집하여 실제 값 입력

# 3. 개발 서버 실행
npm run dev
```

## 빌드 & 배포

```bash
# 빌드
npm run build

# Cloudflare Pages 수동 배포
npm run deploy
```

## GitHub Secrets 설정

GitHub 저장소 → Settings → Secrets and variables → Actions 에서 아래 Secrets 등록. 이 값들은 "블로그 글 수동 발행" 워크플로(글 생성)에서만 쓰입니다 — 배포는 Cloudflare 자체 Git 연동이 담당하므로 `CLOUDFLARE_API_TOKEN` 같은 배포용 시크릿은 GitHub에 등록할 필요가 없습니다 (대신 아래 "Cloudflare Pages 초기 설정"에서 Cloudflare 대시보드에 직접 입력합니다).

| Secret 이름 | 설명 | 발급처 |
|-------------|------|--------|
| `GEMINI_API_KEY` | Gemini API 키 | [Google AI Studio](https://aistudio.google.com) |
| `NEXT_PUBLIC_ADMIN_HASH` | 관리자 비밀번호 SHA-256 해시 | `node -e "const c=require('crypto');console.log(c.createHash('sha256').update('비밀번호').digest('hex'))"` |
| `ADMIN_PASSWORD` | (참고값) | 직접 설정 |
| `ADMIN_SECRET_TOKEN` | 관리자 세션 토큰 | `openssl rand -base64 32` |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase API 키 | Firebase 프로젝트 설정 |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth 도메인 | Firebase 프로젝트 설정 |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase 프로젝트 ID | Firebase 프로젝트 설정 |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase Storage | Firebase 프로젝트 설정 |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase Sender ID | Firebase 프로젝트 설정 |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase App ID | Firebase 프로젝트 설정 |
| `NEXT_PUBLIC_SITE_URL` | 사이트 URL | `https://honsamnote.co.kr` |
| `NEXT_PUBLIC_SITE_NAME` | 블로그 이름 | 직접 설정 (예: `1인 가구 생활백서`) |

Cloudflare 대시보드에서 프로젝트 → Settings → Environment variables 에 위 `NEXT_PUBLIC_*` 값들과 `CLOUDFLARE_ANALYTICS_TOKEN`(선택)을 동일하게 등록해야 실제 빌드에 반영됩니다.

## Firebase Firestore 보안 규칙

Firebase 콘솔 → Firestore → Rules 에서 아래 규칙 적용:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /views/{slug} {
      allow read, write: if true;
    }
    match /analytics/{id} {
      allow read, write: if true;
    }
    match /subscribers/{id} {
      allow read: if false;
      allow write: if true;
    }
  }
}
```

`analytics/site` 문서에 전체 방문자 수(세션당 1회 집계)가 누적되고, 관리자 대시보드(`/admin/dashboard`)에서 확인할 수 있습니다.

## Cloudflare Pages 초기 설정

1. Cloudflare 대시보드 → Pages → Create a project
2. GitHub 저장소 연결
3. 빌드 설정:
   - Build command: `npm run build`
   - Build output directory: `out`
4. Environment variables: 위 Secrets 목록 참고하여 동일하게 입력

## 도메인 연결

1. Cloudflare Pages → 프로젝트 → Custom domains
2. 도메인 입력 후 DNS 설정 안내 따르기
3. 이미 Cloudflare에서 관리 중인 도메인이라면 자동 설정됨

## 콘텐츠 구조

MDX 파일이 `content/blog/`에 있으면 자동으로 블로그에 반영됩니다. 워크플로가 생성하는 파일은 아래 형식입니다.

```mdx
---
title: "퇴근 후 15분으로 원룸을 유지하는 청소 순서"
description: "150자 이내 설명"
date: "2026-07-27"
tags: ["청소", "원룸", "루틴"]
keywords: ["원룸 청소", "청소 루틴"]
category: "cleaning"
categoryName: "청소·세탁·집안일"
---

## 문제 상황
...
## 먼저 확인할 결론
...
```

수동으로 글을 추가할 때도 `category`(topics.json의 slug)와 `categoryName`을 넣어주면 카테고리 페이지(`/category/[slug]`)에 자동으로 노출됩니다.

## AI 기반 쿠팡 상품 추천 시스템

글마다 쿠팡 캐러셀을 넣을지, 어떤 문맥으로 보여줄지, 본문 어디에 배치할지를 AI가 자동으로 판단합니다. **캐러셀 ID는 992222 하나뿐**이라 "상품군마다 다른 캐러셀"을 매칭하는 게 아니라, "이 글에 광고가 어울리는가 + 어떤 제목/키워드로 보여줄까 + 본문 어디에 넣을까"를 AI가 결정합니다.

### 동작 방식

1. `scripts/generate-post.ts`가 글을 생성한 직후, `lib/affiliateAnalysis.ts`가 **같은 글의 제목·본문**을 Gemini로 한 번 더 분석합니다.
2. 분석 결과(구체적 상품 키워드 최대 5개, 신뢰도, 검색의도, 제외 상품군, 광고 삽입 여부·개수·위치·슬롯별 제목)를 아래처럼 front matter에 저장합니다. **이 값은 글이 생성될 때 한 번만 계산되고 그대로 굳습니다** — DB나 캐시가 없어도 "재분석 방지"가 자연히 성립합니다.

```yaml
affiliateKeywords: ["침대 밑 수납함", "압축팩"]
affiliateProductGroup: "수납용품"
affiliateConfidence: 0.86
affiliateShouldInsert: true
affiliateInsertAfterHeadings: ["문제 상황", "해결 순서"]
affiliateAdTitles: ["침대 밑 공간을 활용하는 수납용품", "계절옷 보관에 참고할 상품"]
```

3. 렌더링 시(`app/blog/[slug]/page.tsx`) `lib/affiliateAnalysis.ts`의 `shouldShowAffiliateAd()`가 신뢰도(기본 임계값 0.72)와 `affiliateShouldInsert`를 보고 광고 표시 여부를 정합니다. **이 필드가 아예 없는 글(이 기능 이전에 생성된 기존 글)은 항상 표시** — 기존 동작을 그대로 유지합니다.
4. `affiliateInsertAfterHeadings`의 각 소제목이 본문의 실제 소제목과 일치하면 `lib/article.ts`가 그 섹션들 바로 뒤에 캐러셀을 각각 삽입합니다(슬롯마다 다른 제목). 하나도 못 넣으면 글 맨 끝(관련 글 위)에 기본 1개를 배치합니다.
5. 글당 광고 개수는 본문 길이에 따라 코드에서 강제로 제한합니다(`config/coupangAds.ts`의 `getMaxSlotsForLength`) — AI가 이보다 많이 추천해도 잘라냅니다.

| 본문 길이 | 최대 슬롯 |
|---|---|
| 1,200자 미만 | 1 |
| 1,200~2,500자 | 2 |
| 2,500~4,500자 | 3 |
| 4,500자 이상 | 4 |

### AI 분석이 광고를 넣지 않는 경우

- 관계·감정(외로움/갈등/이별/직장 스트레스) 중심 글 — `contentIntent: "emotional"`
- 법률·행정 절차만 설명하는 글 — `contentIntent: "administrative"`
- 안전 카테고리에서 무기류·호신용품에 해당하는 키워드
- 전체 신뢰도가 0.72 미만인 글

### 지연 로딩 (IntersectionObserver)

광고 iframe은 처음부터 로드하지 않습니다. `CoupangPartnersCarousel`이 뷰포트 약 400px 앞에서 `IntersectionObserver`로 감지한 뒤에만 실제 `srcDoc`(쿠팡 SDK 요청)을 렌더링합니다. 그 전에는 실측 높이만큼 스켈레톤(펄스 애니메이션)을 보여줘 CLS를 막습니다. `IntersectionObserver`를 지원하지 않는 아주 오래된 브라우저에서는 즉시 로드로 대체됩니다.

### 위젯 설정 검증

`lib/coupangValidation.ts`가 `widgetId`(양의 정수)·`trackingCode`("AF..." 패턴)·`width`·`height` 형식을 검사합니다. `config/coupangAds.ts`가 로드될 때(빌드 시점) 바로 검증하므로, 앞으로 값을 잘못 바꾸면 배포 전에 에러로 바로 드러납니다.

### 설정 관리

- `config/coupangAds.ts`: 광고 on/off, 위치별 활성화, 슬롯 개수 규칙, `id`(992222)·`trackingCode`(AF1634685) — **id/trackingCode는 바꾸지 마세요**
- `data/coupangCategoryPresentation.ts`: AI 분석이 없는 글(기존 글)에 쓰이는 카테고리별 기본 제목·설명
- `lib/coupangCategory.ts`: 카테고리 슬러그/이름이 달라도 8개 카테고리로 매칭하는 정규화 함수
- `lib/affiliateAnalysis.ts`: Gemini 분석 프롬프트, zod 스키마 검증(`contentIntent` enum·`excludedProductGroups` 포함), 신뢰도 임계값(`MIN_RECOMMENDATION_CONFIDENCE`)
- `lib/coupangValidation.ts`: 위젯 설정 형식 검증

### 테스트

```bash
npm run test
```

`shouldShowAffiliateAd`(신뢰도 임계값), `normalizeCategory`(카테고리 매칭), `processArticleBody`(본문 다중 슬롯 삽입 위치·제목), `getMaxSlotsForLength`(길이별 슬롯 상한), 위젯 설정 검증에 대한 단위 테스트 25개가 있습니다.

### 현재 구조상 구현하지 않은 것

- **관리자 페이지에서 추천 결과 수정/캐러셀 등록 UI, 추천 로그 DB 저장**: 이 사이트는 서버·DB가 없는 완전 정적 사이트(Cloudflare Pages)라 서버 인증이 필요한 CRUD·로그 저장을 만들 수 없습니다. 대신 front matter 필드를 직접 열어 고치면 됩니다(git 자체가 변경 이력).
- **여러 캐러셀 ID 레지스트리**: 등록된 캐러셀이 992222 하나뿐이라 매칭할 대상이 없습니다. 상품군별로 다른 캐러셀을 쓰려면 쿠팡 파트너스 대시보드에서 캐러셀을 추가로 만들어 `config/coupangAds.ts`에 등록해야 합니다.
- **다크모드**: 사이트 전체에 다크모드 자체가 없어서(디자인 토큰 미구현) 광고 영역만 별도로 지원할 대상이 없습니다.
- **Lighthouse 자동 비교**: 배포 후 `npx lighthouse https://honsamnote.co.kr/blog/... `로 직접 측정해야 합니다 (이 환경엔 Lighthouse 실행 도구가 없습니다).
