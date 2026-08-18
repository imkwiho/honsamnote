# 혼삶노트 SEO 검증 보고서 (2단계 + 4단계 강화)

생성일: 2026-08-18
out/ 산출물 표본 검사: 건너뜀(out/ 없음 — 직전에 npm run build 필요)

## 요약

- 전체 게시글: 566개
- 오류(error): 0건
- 경고(warning): 9건
- cluster 미지정: 126개 (정보성, 오류 아님)
- orphan 페이지: 37개

## 항목별 상세

### possible-duplicate-h1 (2건, warning)
- guide-food-waste: 본문에 "# " 최상위 제목이 남아 있어 H1이 2개가 될 수 있음
- guide-general-living-cost: 본문에 "# " 최상위 제목이 남아 있어 H1이 2개가 될 수 있음

### primary-page-missing (5건, warning)
- 클러스터 'cleaning-general' (15개 글) — Primary Page 없음
- 클러스터 'food-general' (15개 글) — Primary Page 없음
- 클러스터 'housing-general' (11개 글) — Primary Page 없음
- 클러스터 'products-general' (62개 글) — Primary Page 없음
- 클러스터 'safety-general' (8개 글) — Primary Page 없음

### title-content-mismatch (1건, warning)
- 546개 글에서 대표 키워드가 본문 첫 300자에 없음 — seo-audit/title-content-mismatch.csv 참조

### redirect-missing-wrangler (1건, warning)
- redirect-map.csv의 301 리다이렉트(/blog/2026-08-10-safety-auto-46a836/ → /blog/2026-08-10-safety-auto-e68c91/)가 wrangler.toml에 없음
