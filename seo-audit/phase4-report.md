# SEO 4단계 완료 보고서

생성일: 2026-08-18

## 작업 요약

### 0. 절대 원칙 준수 확인
- URL/slug 변경 없음
- 대량 글 삭제 없음
- 식기세척기 3쌍 재편집 없음
- 미검증 법률/가격/의료/안전 정보 수정 없음
- 추정 검색량/CTR/순위 데이터 미사용
- **정확성 우선 > SEO** 원칙 유지

---

## 1. Phase 4 분석 스크립트 생성 및 실행

### 생성 파일
| 스크립트 | 출력 | 설명 |
|---|---|---|
| `scripts/lib/seoPhase4Shared.ts` | — | 공유 유틸리티 |
| `scripts/seo-phase4-baseline.ts` | `seo-audit/phase4-baseline.json` | 시작 스냅샷 |
| `scripts/seo-factcheck-details.ts` | `seo-audit/factcheck-details.csv` | 89개 글 607건 주장 추출 |
| `scripts/seo-strong-claims.ts` | `seo-audit/strong-claim-review.csv` | 536개 글 단정 표현 탐지 |
| `scripts/seo-remaining-title-priority.ts` | `seo-audit/remaining-title-priority.csv` | 429개 제목 재등급화 |
| `scripts/seo-title-content-mismatch.ts` | `seo-audit/title-content-mismatch.csv` | 531개 제목-본문 불일치 탐지 |
| `scripts/seo-answer-first.ts` | `seo-audit/answer-first-candidates.csv` | 314개 answer-first 후보 |
| `scripts/seo-repetitive-language.ts` | `seo-audit/repetitive-language.csv` | 538개 글 반복 표현 탐지 |
| `scripts/seo-primary-page-audit.ts` | `seo-audit/primary-page-audit.csv` | 49개 클러스터 PRIMARY_AUTHORITY_SCORE |
| `scripts/seo-pillar-b-review4.ts` | `seo-audit/pillar-b-review4.md` | B등급 Pillar 재평가 |
| `scripts/import-search-console.ts` | `seo-audit/search-console-import.json` | Search Console CSV 임포터 |

---

## 2. 팩트체크 상세 추출 (§4-6)

- 대상: 91개 고위험 글 (§4에서 정의된 카테고리)
- 추출 주장: 607건
  - **P1(법률/안전/보증금)**: 219건
  - **P2(가격/수치/행정)**: 355건
  - **P3(일반 수치)**: 33건
- 모두 `NEEDS_EXTERNAL_VERIFICATION` 상태 — 외부 확인 필요
- 출력: `seo-audit/factcheck-details.csv`

> ⚠️ P1 주장 219건은 외부 검증 필요. 특히 주거법, 보증금, 안전 기준 관련 표현.

---

## 3. 강한 단정 표현 탐지 (§7)

- 564개 전체 검사
- 단정 표현 발견: 536개 글
  - HIGH (고위험 카테고리 + 다수 단정): 166개
  - MEDIUM: 230개
  - LOW: 140개
- 상위 표현: "반드시", "절대", "무조건", "100%" 등
- 출력: `seo-audit/strong-claim-review.csv`

> HIGH 166개 글은 근거 없는 단정 표현 검토 권장. 맥락에 따라 완화 또는 근거 추가.

---

## 4. 남은 제목 재우선순위화 + A-HIGH 적용 (§8-10)

- 대상: 429개 (3단계 미적용 MEDIUM/LOW)
- 등급 분포:
  - A등급: 305개
  - B등급: 56개
  - C등급: 68개
- **실제 적용 (A-HIGH만)**: 271개
- 백업: `backup/posts-before-title-phase4-20260818.json`
- 출력: `seo-audit/remaining-title-priority.csv`

> 3단계(100개) + 4단계(271개) = 누적 371개 제목 개선 완료

---

## 5. 제목-본문 불일치 탐지 (§12)

- 564개 검사
- KEYWORD_ABSENT_FROM_OPENING: 515개 (대표 키워드가 본문 앞부분 600자에 없음)
- EMOTIONAL_INTRO_DELAYS_ANSWER: 0개
- INTENT_SIGNAL_ABSENT: 16개
- 출력: `seo-audit/title-content-mismatch.csv`

> 515개는 키워드가 제목에만 있고 본문 도입부에 없음. 직접 수정은 이번 단계 범위 밖 — 개선 목록으로 관리.

---

## 6. Primary Page 감사 (§13-14)

- 49개 클러스터 평가
- **STRONG**: 36개 (authority_score ≥ 70)
- **MODERATE**: 12개
- **WEAK**: 1개
- 출력: `seo-audit/primary-page-audit.csv`

> WEAK 1개: 내부 링크·본문 보강 권고. MODERATE 12개: 제목 개선 또는 내부 링크 추가로 점수 향상 가능.

---

## 7. Answer-first 후보 탐지 (§30-32)

- 314개 후보 (질문형/판단형/문제해결형/비교형 + 첫 200자에 핵심 답변 없음)
- **안전하게 개선 가능**: 62개 (fact-check 위험 없음 + 감성 도입 없음)
- 출력: `seo-audit/answer-first-candidates.csv`

---

## 8. 반복 표현 분석 (§29)

- 564개 검사
- 반복 발견: 538개 글
  - HIGH (6회 이상): 63개
  - MEDIUM (3-5회): 234개
- **사이트 전체 최다 반복 표현**:
  - "퇴근 후": 763회
  - "혼자 사는 직장인": 418회
  - "혼자 사는 당신": 254회
- 출력: `seo-audit/repetitive-language.csv`, `seo-audit/repetitive-language-summary.csv`

> HIGH 63개 글은 다양한 표현으로 분산 권고. "퇴근 후"가 763회로 가장 과다 — AI 생성 패턴.

---

## 9. B등급 Pillar 재평가 (§16-17)

### 기존 B등급 Pillar 3개 평가
| Pillar | 멤버 수 | 평균 인링크 | 결정 |
|---|---|---|---|
| emergency-response | 실측값 | 실측값 | HOLD |
| kitchen-cleaning | 실측값 | 실측값 | HOLD |
| bathroom-cleaning | 실측값 | 실측값 | HOLD |

### 신규 Pillar 후보
- 10개 클러스터 검토 (멤버 8개 이상 + 평균 인링크 1.5 이상)
- PROMOTE_NEW 조건 충족 시 B등급 Pillar 페이지 자동 생성 (최대 2-3개)
- 세부 결과: `seo-audit/pillar-b-review4.md`, `seo-audit/pillar-b-review4.csv`

---

## 10. 코드 변경

### 신규 모듈
- `lib/factcheckGate.ts` — 자동 발행 전 P1/P2 위험 카테고리 탐지
  - P1(housing/safety/legal): `HIGH_RISK_HOLD` → front matter 기록, 발행 보류 권고
  - P2(finance/appliances/health): `FACTCHECK_REQUIRED` → 경고만

### generate-post.ts 변경
- 팩트체크 게이트 추가: `runFactcheckGate()` → `reportFactcheckGate()`
- 고위험 글에 `factcheckStatus`/`factcheckReason` front matter 자동 기록

### admin/seo/page.tsx 변경
- 검색 데이터 미연결 배너 추가 (`검색 데이터 미연결 — Google Search Console...`)
- 4단계 신뢰 상태 배지 추가:
  - `HIGH-RISK`: factcheckStatus = HIGH_RISK_HOLD
  - `검증필요`: factcheckStatus = FACTCHECK_REQUIRED
  - `대표글`: isPrimaryPage
  - `권위낮음`: authorityScore < 30

### eslint.config.mjs 변경
- `.wrangler/**` 무시 추가 (Wrangler 자동 생성 번들 파일)

### seo-verify.ts 강화 (§35)
- 4단계 추가 검사:
  - Primary Page가 없는 규모 큰 클러스터 탐지 (≥8개 멤버)
  - Primary Page가 내부 링크 없는 경우 경고
  - 대표 키워드가 본문 첫 300자에 없는 글 요약
  - wrangler.toml vs redirect-map.csv 일치 검증

---

## 11. Search Console 임포터 (§20)

- `scripts/import-search-console.ts` 생성
- 사용법: `npx tsx scripts/import-search-console.ts <query.csv> [page.csv]`
- 플레이스홀더 생성: `seo-audit/search-console-import.json`
- 현재 상태: **검색 데이터 미연결** (Google Search Console CSV 필요)

---

## 12. 검증 결과

| 검사 | 결과 |
|---|---|
| `npx tsc --noEmit` | ✅ 오류 0 |
| `npx vitest run` | ✅ 22 파일 205 테스트 통과 |
| `npx eslint . --max-warnings=0` | ✅ 경고 0 |
| `npx tsx scripts/seo-verify.ts` | ✅ 오류 0, 경고 9 (정보성) |
| `npm run build` | ✅ 빌드 성공 |

---

## 13. 4단계 이후 수동 작업 권고

| 우선순위 | 항목 | 세부 |
|---|---|---|
| 🔴 P1 최우선 | 팩트체크 P1 219건 | `factcheck-details.csv` P1 행 — 법률/보증금/안전 표현 외부 확인 |
| 🟠 P2 우선 | 팩트체크 P2 355건 | 가격/수치 현행화 확인 |
| 🟡 중 | HIGH 강한 단정 166개 | 맥락 확인 후 완화 또는 근거 추가 |
| 🟡 중 | Answer-first 62개 | 핵심 결론을 첫 문장으로 이동 |
| 🟢 낮음 | 반복 표현 HIGH 63개 | "퇴근 후" 등 다양화 |
| 🟢 낮음 | Primary WEAK 1개 | 내부 링크 추가 |
| 🔵 정보 | Google Search Console 연결 | `import-search-console.ts` 사용 |
