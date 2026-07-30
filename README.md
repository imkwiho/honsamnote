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

`content/topics.json`에 8개 생활 영역(생활비/식재료/수납/청소/안전/주거/제품/관계)과 약 80개의 소재가 미리 정리되어 있습니다. 각 소재는 `status: pending → published`로 관리되며, 발행 워크플로를 실행할 때마다 자동으로 다음 소재를 골라 글을 씁니다. 소재가 다 떨어지면 이 파일에 새 항목을 추가하면 됩니다.

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
