# 혼삶노트 SEO 2단계 완료 보고서

생성일: 2026-08-17
기준 커밋 이전: `b1e7a17`(2단계 1부: 클러스터/Pillar/Breadcrumb/내부링크 인프라) → 이 보고서는 그 이후 title/meta 적용까지 포함한 2단계 전체 결과.

## Before → After

| 지표 | Before(1단계 감사 시점) | After(2단계 완료 시점) |
|---|---|---|
| 내부링크 보유 글 | 0개 (전수 확인됨) | 517개 / 565개 (91.5%) |
| orphan 페이지(들어오는 내부링크 없음) | 565개(사실상 전체, 링크 시스템 자체가 없었음) | 48개 |
| 평균 outgoing 내부링크 수 | 0 | 4.91개 |
| 검색 클러스터 적용 글 수 | 0(클러스터 개념 없음) | 442개 / 565개 (78.2%) — 나머지 123개는 세부 클러스터에 못 걸려 카테고리 "기타"로 남음 |
| 정의된 검색 클러스터 수 | 47개(1단계에서 taxonomy만 정의) | 47개 taxonomy 그대로, 그중 18개가 Pillar 후보로 재평가되어 A/B/C 등급 부여 |
| 실제 생성된 Pillar 페이지 수 | 0 | 3개(`/guide/oneroom-storage`, `/guide/laundry`, `/guide/loneliness`) — A등급만, B(10개)·C(4개)는 보고서만 |
| 제목 실제 변경 수 | 0 | 41개 (HIGH confidence만 자동 적용) |
| meta description 실제 변경 수 | 0 | 41개 |
| 본문 문맥 내부링크(§9) | 0 | 98개(A등급 Pillar 클러스터 소속 글 전체) |
| 통합 후보 | 4쌍(보고만) | 4쌍(그대로 — 실행 안 함) |
| 역할분리 검토 후보 | 113쌍(등급 없음) | 113쌍, HIGH 17 / MEDIUM 27 / LOW 69로 재분류 |
| fact-check 필요 | 91개(보고만) | 91개(그대로 — 내용 임의 수정 안 함) |

## 제목/meta 개선 상세

- 판정 시점(적용 직전) 기준: HIGH(자동 적용) 41개, MEDIUM(추가 검토 필요) 457개, LOW(자동 변경 금지) 67개.
- **HIGH 41개만 실제로 `content/blog/*.mdx`의 title/description 필드에 적용**했다. MEDIUM 457개, LOW 67개는 파일을 전혀 건드리지 않았다 — `seo-audit/title-changes.csv`에 추천안만 기록되어 있고, 사람이 검토 후 다음 단계에서 처리할 수 있다.
- 적용 과정에서 실제 버그 2건을 발견해 고쳤다: (1) 대표 키워드가 "혼자 사는 직장인" 같은 범용 표현일 때 제목 생성 결과가 상투어를 되살리는 문제, (2) 본문에서 뽑은 meta description에 마크다운 서식(`**굵게**` 등)이 그대로 노출되는 문제. 둘 다 실제 데이터로 검증 후 41개 전체에 재적용했다.
- front matter의 title/description 필드 3가지 실제 형식(따옴표 한 줄 / block scalar 여러 줄 / 따옴표 없는 한 줄)을 전부 지원하도록 `lib/yamlFieldReplace.ts`를 만들었고, 565개 전체에 대해 원본과 동일한 값으로 치환해도 변경이 감지되는지 왕복 검증을 통과했다.

## Pillar 상세

18개 Pillar 후보 중(원래 감사 시점): A 3개, B 11개, C 4개.
제목 변경으로 일부 글의 클러스터 재분류가 미세하게 바뀌면서 최종 재계산 시 B등급 클러스터 하나가 8개 미만으로 줄어 후보에서 빠졌다(A등급 3개는 변동 없음): 최종 A 3개, B 10개, C 4개.

- A(즉시 구현): 원룸 전체 수납(56개 글), 세탁·옷관리(23개 글), 외로움·고립감(19개 글).
- B(보강 필요, 페이지 미구현): 응급상황 대처, 욕실 청소, 보증금, 주방 청소, 전월세 계약, 식재료 보관, 이사 준비, 도어락·보안, 화재 예방, 냄새 제거, 관계 관리 등 — `seo-audit/pillar-plan.csv` 참고.
- C(부적합): "생활비 절약 전반"(카테고리와 거의 동일한 범용 클러스터), 식재료 낭비 줄이기, 생활리듬·시간관리, 혼밥 레시피·식단.

## 실행하지 않은 것 (사람 승인 필요)

- 게시글 삭제, 자동 통합(통합 후보 4쌍), slug/URL 변경, redirect — 전부 미실행.
- 역할분리 검토 113쌍 — 미실행. `seo-audit/cannibalization-review.csv`에 HIGH/MEDIUM/LOW로 등급만 매겨 둠.
- fact-check 필요 91개 글의 수치·법령 정보 — 임의 수정 없음.
- MEDIUM/LOW 제목·description 524개 — 파일 미수정, 추천안만 기록.
- B/C등급 Pillar 15개 — 페이지 미구현.

## 검증 결과

`scripts/seo-verify.ts` 전수 검사 — 오류 0건, 경고 0건(소스 레벨 + 빌드 산출물 표본 검사 모두 포함). 상세는 `seo-audit/post-migration-report.md` 참고.

- broken internal link / self-link: 0건
- 빈 title/description: 0건
- 중복 title / description: 0건
- 관련 글 중복 추천: 0건
- Pillar 정의 무결성(멤버 0개인 Pillar): 0건
- 빌드 산출물 표본(canonical/JSON-LD/H1 개수/sitemap 404): 0건

`npx tsc --noEmit`(app/scripts), `npx vitest run`(250개 이상 테스트), `npx eslint --max-warnings=0` 전부 통과. `npm run build` 정상 완료(592페이지: 기존 565개 글 + 8개 카테고리 + 3개 Pillar + 홈/관리자/기타 정적 페이지, 신규 `/admin/seo`, `/api/seo-data` 포함).

## 자동 발행 재개

`content/generation-status.json`의 `paused`를 `false`로 되돌려 자동 발행을 재개했다. 앞으로 새 글이 생성될 때는 `lib/duplicateGate.ts`가 기존 글과의 유사도를 먼저 확인해, 유사도가 높으면(통합 후보 기준과 동일한 임계값) 저장을 보류하고 가장 가까운 기존 글을 로그로 알린다(§24-26).
