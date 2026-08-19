# Phase 5B — Google Search Console 현황 보고

생성일: 2026-08-19

## 상태: GSC_DATA_REQUIRED

Google Search Console 실제 CSV 데이터가 제공되지 않았습니다.

§10 원칙에 따라 다음 행위를 하지 않습니다:
- 검색량 추정 금지
- impressions 추정 금지
- CTR 추정 금지
- ranking 추정 금지

## Importer 검증 결과 (scripts/import-search-console.ts)

### 지원 형식
- Google Search Console → 성과 → 쿼리별/페이지별 보고서 CSV
- 인코딩: UTF-8 (BOM 자동 제거)
- 컬럼 자동 감지 (쿼리/클릭수/노출수/CTR/평균 게재순위)
- 한국어 컬럼명 지원 ("쿼리", "클릭수", "노출수", "클릭률", "평균 게재순위")

### URL 정규화 처리
- trailing slash 일치 확인 필요 (`/blog/slug/` 형식)
- https://honsamnote.co.kr 도메인 일치 확인

### 실행 방법
```bash
# 쿼리 보고서만
npx tsx scripts/import-search-console.ts gsc-queries.csv

# 쿼리 + 페이지 보고서 동시 임포트
npx tsx scripts/import-search-console.ts gsc-queries.csv gsc-pages.csv
```

### 내보내기 방법 (Google Search Console)
1. Search Console → 실적 → 전체 기간 선택
2. 쿼리 탭 → 내보내기 → CSV
3. 페이지 탭 → 내보내기 → CSV
4. 두 파일을 위 명령으로 임포트

## GSC 연결 후 분석할 항목 (§12)

| 유형 | 설명 | 후보 작업 |
|---|---|---|
| TYPE A | 고노출 + 저CTR | title/description 개선 |
| TYPE B | Position 5~20 | 본문 답변 강화, 내부링크 |
| TYPE C | 동일 query → 복수 URL | cannibalization 분석 |
| TYPE D | 고클릭 / 건강한 CTR | PROTECTED_PERFORMER — 변경 금지 |
| TYPE E | 고노출 / Position 20+ | 검색 의도 확인, 내용 깊이 |
| TYPE F | 노출 없음 | 색인 여부, 수요 확인 |

## 다음 단계

GSC 데이터가 연결되면 자동으로 다음 분석이 실행됩니다:
- `seo-audit/gsc-opportunities.csv` 생성
- SEARCH_OPPORTUNITY_SCORE 계산
- PROTECTED_PERFORMER 페이지 지정
- Answer-first + 제목 개선 우선순위 GSC 기반 재조정
