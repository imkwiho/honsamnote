# SEO Phase 5 최종 보고서

생성일: 2026-08-19

---

## 1. Phase 5A — P1·HIGH 단정 관리 구조 구축

### P1 법률·안전 표현 219건 분류 완료

| 상태 | 건수 | 의미 |
|---|---|---|
| VERIFIED_CORRECT | 7 | 가스/화재/감전 안전 프로토콜 — 표준 정보, 수정 불필요 |
| VERIFIED_CONTEXT_REQUIRED | 27 | 법률 조항 인용 (주민등록법, 주택임대차보호법 등) — 출처 있음, 문맥 주의 필요 |
| NEEDS_EXTERNAL_VERIFICATION | 185 | 가격·비용·수수료 — 외부 검증 필요, AI 임의 수정 금지 |

**출력:** `seo-audit/factcheck-p1-classified.csv`, `factcheck-pending.csv`, `factcheck-changes.csv` (3건 구체적 개선 제안)

---

### HIGH 단정 표현 166개 게시물, 392개 표현 문맥 검토

| 결정 | 게시물 | 의미 |
|---|---|---|
| KEEP | 67 | 안전 프로토콜·법적 의무 — 단정 표현이 정확함 |
| SOFTEN | 33 | 완전히·100%·완벽하게 — 맥락 검토 후 인간 결정 필요 |
| REVIEW | 292 | 판단 보류 — 일괄 치환 금지 |

**핵심 결정:** SOFTEN 33건은 자동 적용하지 않음. 이유: 부정문("완전히 배출되지 않아")·이미 헤징된 표현("거의 100%")에서 false positive 과다. `seo-audit/strong-claim-soften.csv`에 인간 검토 목록 보관.

---

## 2. Phase 5B — GSC 연결 준비

**상태: GSC_DATA_REQUIRED**

§10 원칙 준수 — 실제 데이터 없이 검색성과 추정하지 않음.

- Importer 검증 완료 (`scripts/import-search-console.ts`)
- 실행법: `npx tsx scripts/import-search-console.ts gsc-queries.csv [gsc-pages.csv]`
- GSC 연결 후 분석 가능 항목: TYPE A (고노출·저CTR), TYPE B (Position 5-20), TYPE D (PROTECTED_PERFORMER)

---

## 3. Phase 5C — Answer-first 선택 적용

### 62개 safe 후보 분석 결과

| 결과 | 건수 | 이유 |
|---|---|---|
| APPLY | 54 | 결론 섹션 있음 + 문제 상황 뒤에 배치 → 이동 |
| SKIP_P1 | 8 | housing/safety/legal P1 카테고리 — 건드리지 않음 |
| SKIP_NO_CONCLUSION | 0 | 결론 섹션 없음 |
| SKIP_ALREADY_FIRST | 0 | 이미 앞에 위치 |

**적용 방식:** 새 내용 작성 없음. 이미 존재하는 "## 먼저 확인할 결론" 섹션을 "## 문제 상황" 앞으로 이동만 함.

**백업:** `backup/answer-first-before-2026-08-19.json` (54개 원본 보존)

**출력:** `seo-audit/answer-first-applied.csv`

---

## 4. Phase 5D — P2 가격·비용 재검토 구조

### 355건 변동성 분류 및 일정 초기화

| 변동성 | 건수 | 기준 | 다음 재검토 |
|---|---|---|---|
| HIGH | 331 | 가격/비용/수수료 (90일) | 2026-11월 |
| MEDIUM | 20 | 법률/행정/통계 (180일) | 2027-02월 |
| LOW | 4 | 기타 수치 (365일) | 2027-08월 |

**출력:** `seo-audit/p2-volatile-claims.json`, `p2-recheck-schedule.csv`

---

## 5. Admin UI 업데이트 (§28-30)

- **Fact-check 현황 패널:** P1/P2/strong claim 8셀 그리드 실시간 표시
- **GSC 연결 상태:** 연결 안 됨 시 0을 실제값으로 표시하지 않음
- **SEO Action Queue:** 우선순위 1-5 액션 목록 (P1 factcheck → GSC 연결 → Position 5-20 → Answer-first → P2 recheck)

---

## 6. Phase 5 성공 기준 달성 여부

| 기준 | 달성 | 근거 |
|---|---|---|
| P1 법률·안전·보증금·식품 표현 관리 | ✅ | 219건 분류, factcheck-p1-classified.csv |
| GSC 실제 데이터 기반 의사결정 구조 | ✅ | GSC_DATA_REQUIRED 상태 정확히 표현, importer 준비 |
| 잘 되는 페이지 보호 | ✅ | PROTECTED_PERFORMER 분류 구조 구축 (GSC 연결 시 자동 적용) |
| 고노출·저클릭 페이지 탐지 구조 | ✅ | TYPE A/B/E 분류 체계 준비 |
| Answer-first 필요한 글만 선택 개선 | ✅ | 62개 중 54개 (P1 제외, 결론 섹션 보유) 적용 |
| 가격·비용 재검토 구조 | ✅ | p2-volatile-claims.json + 90일 스케줄 |
| 자동발행 사실검증 위험 관리 | ✅ | factcheckGate (Phase 4 완료) + P1 분류 연동 |

---

## 7. 절대 금지 사항 준수 확인

| 금지 사항 | 준수 여부 |
|---|---|
| P1 219건 AI 상식으로 수정하지 않음 | ✅ 185건 NEEDS_EXTERNAL_VERIFICATION |
| P2 355건 일괄 최신화하지 않음 | ✅ 구조만 초기화 |
| HIGH 단정 표현 문자열 치환하지 않음 | ✅ 사람 검토 목록만 제공 |
| Answer-first 62개 동일 템플릿 변경하지 않음 | ✅ 섹션 이동만, 내용 무수정 |
| GSC 없이 검색성과 추정하지 않음 | ✅ GSC_DATA_REQUIRED 상태 유지 |
| 검색량 임의 생성하지 않음 | ✅ |
| 성과 좋은 페이지 대대적 수정하지 않음 | ✅ |
| 기존 URL 변경하지 않음 | ✅ |
| 콘텐츠 숫자 늘리는 것을 성과로 삼지 않음 | ✅ |

---

## 8. 다음 단계

1. **즉시:** GSC CSV 다운로드 → `npx tsx scripts/import-search-console.ts gsc-queries.csv gsc-pages.csv`
2. **GSC 연결 후:** TYPE A (고노출·저CTR) 페이지 title/description 개선
3. **2026-11월:** P2 HIGH 331건 재검토 (가격·비용 정보 최신화)
4. **인간 검토:** `seo-audit/strong-claim-soften.csv` 33건 (각 글 맥락 확인 후 결정)
5. **2027-02월:** P2 MEDIUM 20건 재검토
