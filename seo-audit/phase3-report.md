# 혼삶노트 SEO 3단계 완료 보고서

생성일: 2026-08-18
기준 커밋: `830c82e`(2단계 완료) 이후 — 3단계 신규 변경분만 기록.

## Before → After (누적 기준)

| 지표 | 2단계 완료 시점 | 3단계 완료 시점 |
|---|---|---|
| 실제 적용된 제목 수정 | 41개 (HIGH confidence) | 141개 (41 + 3단계 추가 100개) |
| 실제 적용된 meta description 수정 | 41개 | 141개 |
| Pillar 페이지 수 | 3개 (A등급만) | 6개 (A등급 3개 + B등급 상위 3개 추가) |
| Pillar 커버 URL | /guide/oneroom-storage·laundry·loneliness | +/guide/emergency·kitchen-cleaning·bathroom-cleaning |
| 실제 MERGE 실행 | 0쌍 | 1쌍 (바퀴벌레 퇴치 중복 쌍) |
| redirect 등록 | 0건 | 1건 (wrangler.toml) |
| 총 게시글 수 | 565개 | 564개 (MERGE로 1개 제거) |
| Primary Page 개념 | 없음 | 42개 클러스터 × 1개 대표 콘텐츠 (lib/primaryPages.ts) |
| 자동 발행 시 Primary Page 경고 | 없음 | checkPrimaryPageInfringement() 추가(scripts/generate-post.ts) |

## 3단계 세부 항목

### §1-5 MEDIUM 제목 재판정 + 상위 100개 적용 (seo-title-phase3-top100.ts)

- 2단계에서 MEDIUM으로 남겨둔 457개 전체에 대해 TITLE_OPTIMIZATION_SCORE 계산.
- 가중치: 의도명확성(×2) + keyword 구체성(×2) + 클러스터 중요도(×2) + 내부링크 중심성(×2) + Pillar 연결(×1) + 현재 제목 심각도(×2) − 역할분리 위험(×2) − factcheck 위험(×1)
- 상위 100개를 개별 재판정 → 제안 제목이 (a) 대표 키워드 포함, (b) role-split 후보 아님, (c) 원제목과 다름, (d) 다른 글 제목과 충돌 없음을 모두 만족하면 HIGH 승격 후 파일 적용.
- **최종 적용: 상위 100개 전부 HIGH 승격 → 실제 적용** (충돌 0건 / role-split 위험 0건). description 동반 적용.
- 백업: `backup/posts-before-title-phase3-20260817.json`
- 결과 CSV: `seo-audit/title-phase3-top100.csv`

### §5-6 Pillar 3개 추가 (lib/pillars.ts, pillar3-decisions.md)

2단계에서 B등급으로 남겼던 10개 클러스터를 5가지 기준으로 재검토:
- 뭘 먼저 알아야 하는지 / 뭘 먼저 해결해야 하는지 / 상황별로 어느 글을 봐야 하는지 / 초보가 흔히 하는 실수 / 다음에 뭘 봐야 하는지

채택 3개(정량 점수 상위, 다음 순위 대비 명확한 격차):
1. **응급상황 대처(emergency-response)** — 53.8점, 42개 글, `/guide/emergency/`
2. **주방 청소(kitchen-cleaning)** — 52.4점, 12개 글, `/guide/kitchen-cleaning/`
3. **욕실 청소(bathroom-cleaning)** — 49.4점, 14개 글, `/guide/bathroom-cleaning/`

보류 7개(seo-audit/pillar3-decisions.md 참고): 화재 예방·식재료 보관·보증금·전월세 계약·도어락·이사 준비·관계 관리.

### §9-12 역할분리 HIGH 17쌍 심층 분석 (cannibalization-deep-review.md)

17쌍 전부 분석 결과 **실행 0건**:
- already-distinct(이미 분리됨): 11쌍 — 추가 편집 불필요
- too-similar-defer(보류): 5쌍 — 억지 분리는 없는 차이를 지어내는 셈. 보수적 보류.
- pending-merge-decision(통합 선결): 1쌍 — `2026-08-10-safety-auto-46a836`은 MERGE 대상으로 이미 결정됨(아래 참고).

결론: HIGH 등급 쌍도 실제 본문 수준에서 대부분 이미 다른 질문에 답하고 있었다. 점수(제목 유사도)가 높다고 내용까지 같은 건 아니었음을 확인.

### §7-8 MERGE 1쌍 실행 (merge-final-review.md → wrangler.toml)

4쌍 분석 결과:
- 3쌍 KEEP+ROLE-SPLIT: 식기세척기 3중 쌍 — 모두 검색의도가 다름(방법형/판단형/비교형). 실행 안 함.
- 1쌍 MERGE 실행:
  - **대표 페이지(유지)**: `2026-08-10-safety-auto-e68c91` ("바퀴벌레 방법｜바퀴벌레 퇴치")
  - **흡수 페이지(삭제)**: `2026-08-10-safety-auto-46a836` ("갑자기 집에 바퀴벌레나 쥐가 출몰했을 때…") — Jaccard 유사도 0.75, 같은 클러스터·검색의도
  - 들어오는 내부링크 재배선: 해당 없음(흡수 페이지 → 대표 페이지 internal link 0건 확인됨)
  - 301 redirect 등록: `wrangler.toml [[redirects]]`에 추가
  - `seo-audit/redirect-map.csv` 업데이트

### §22-25 Primary Page 개념 도입 (lib/primaryPages.ts, scripts/generate-post.ts)

- `lib/primaryPages.ts`: 42개 클러스터 각각에서 대표 콘텐츠 1개를 자동 선정하는 `computePrimaryPages()`. 선정 기준: ① 클러스터 matchScore ② 들어오는 내부링크 수 ③ 본문 충실도 ④ 최신순.
- `scripts/generate-post.ts`: 새 글 생성 시 `checkPrimaryPageInfringement()`로 경고 로그 추가. 대표 콘텐츠와 검색의도가 겹치면 "새 글 생성보다 기존 글 업데이트 권장" 경고를 출력(차단은 아님 — 무인 CI에서 사람이 로그를 보고 다음 소재 조정용).

## 실행하지 않은 것

- 식기세척기 3쌍 역할분리: KEEP+ROLE-SPLIT 권장이지만 실제 제목/내용 수정 안 함. 각 글이 이미 다른 검색의도(방법형/판단형/비교형)를 갖고 있어 현재로선 충분.
- too-similar-defer 5쌍 역할분리: 본문 수준 차이가 없어서 보류. 나중에 글 내용 자체를 보강한 뒤 재검토.
- MEDIUM/LOW 제목 357개(3단계 top100 이후 남은 것): 파일 미수정. `seo-audit/title-changes.csv` 추천안 참고.
- fact-check 91개(비용·법령 수치 언급 글): 내용 임의 수정 안 함.
- B등급 보류 Pillar 7개: 글이 더 쌓이거나 품질이 개선되면 `seo-audit/pillar3-decisions.md`의 기준으로 재검토.

## 검증 결과

`scripts/seo-verify.ts` 전수 검사 — 오류 0건, 경고 0건(MERGE 후 재실행 기준).
`npx tsc --noEmit`(app + scripts), `npx vitest run`(205개 테스트), `npx eslint --max-warnings=0` 전부 통과.
- broken internal link / self-link: 0건
- 빈 title/description: 0건
- 중복 title / description: 0건
- 관련 글 중복 추천: 0건
- MERGE 이후 흡수 페이지를 향하는 내부링크: 0건(삭제 전 확인됨)
