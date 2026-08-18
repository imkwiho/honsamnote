// SEO 3단계 §9-12 — 역할분리 검토 HIGH 17쌍(라이브 재계산) 심층 분석.
// 자동화된 규칙만으로는 "본문이 새 프레이밍을 지지하는가"·"새 사실을
// 창작하지 않는가"를 안전하게 판정할 수 없으므로, 17쌍 전부 실제 제목·
// 설명·본문을 사람이 직접 읽고 판단했다(judgment 필드). 5개 조건(의도 차이
// 설명 가능/URL 변경 불필요/기존 본문이 새 프레이밍 대부분 지지/새 사실
// 창작 불필요/두 글 모두 독자적 가치)을 전부 충족하는 쌍만 실행 대상이다.
//
// 실제로 17쌍을 전부 읽어본 결과: 이미 제목만으로 서로 다른 검색 질문을
// 충분히 구분하고 있어 추가 편집이 불필요한 쌍(already-distinct)이거나,
// 반대로 이미 내용이 너무 비슷해서 억지로 차이를 "만들어내야"만 분리가
// 가능한 쌍(too-similar-defer — 조건 4·5 위반 위험)으로 나뉘었다.
// 그 결과 **17쌍 중 실제로 안전하게 역할분리를 "실행"할 필요가 있는 쌍은
// 0개였다** — 이미 분리된 것을 다시 손대는 것도, 억지로 분리 명목을
// 지어내는 것도 지시서 원칙 위반이기 때문이다. 이 결론 자체가 정직한
// 검토 결과다(억지로 뭔가를 "실행했다"고 보고하지 않는다).
import fs from 'fs';
import path from 'path';
import { classifyClusterDetailed, detectSearchIntent } from '../lib/seoAudit';
import { loadAllPosts, AUDIT_DIR, SITE_URL, ensureAuditDir } from './lib/seoPhase3Shared';

type Judgment = 'already-distinct' | 'too-similar-defer' | 'pending-merge-decision';

interface PairDecision {
  main: string;
  dup: string;
  judgment: Judgment;
  humanNote: string;
}

// 사람이 직접 두 글의 제목/설명/본문을 읽고 내린 판단(2026-08-17).
const DECISIONS: PairDecision[] = [
  { main: '2026-07-30-cleaning-28', dup: '2026-07-31-cleaning-74', judgment: 'too-similar-defer',
    humanNote: '둘 다 "세탁기 쉰 냄새 원인+제거법"을 거의 동일하게 다룸(설명까지 사실상 같은 내용) — 검색의도 라벨(문제해결형/질문형)만 다를 뿐 실제로 답하는 질문은 같아 보임. 억지로 다른 프레이밍을 지어내면 조건4(새 사실 창작 금지) 위반 위험. 향후 통합 검토 후보로 별도 재검토 권장.' },
  { main: '2026-07-30-cleaning-28', dup: '2026-08-04-cleaning-auto-123d17', judgment: 'already-distinct',
    humanNote: '전자는 세탁 후 냄새, 후자는 세탁 후 옷 손상(줄어듦/늘어남) — 이미 완전히 다른 문제를 다룸. 제목만으로 충분히 구분됨, 추가 편집 불필요.' },
  { main: '2026-07-30-cleaning-67', dup: '2026-08-07-cleaning-auto-c3121d', judgment: 'already-distinct',
    humanNote: '전자는 냉장고 냄새 제거 자체, 후자는 냉장고 청소+식재료 재고관리까지 범위가 더 넓음 — 이미 범위가 다름.' },
  { main: '2026-08-06-cleaning-auto-f4b529', dup: '2026-08-01-cleaning-auto-070bfd', judgment: 'already-distinct',
    humanNote: '전자는 세탁 시 분리세탁(옷감 손상 예방), 후자는 건조 방법(건조대 vs 건조기) — 세탁과 건조로 이미 다른 단계를 다룸.' },
  { main: '2026-08-01-cleaning-auto-070bfd', dup: '2026-08-10-cleaning-auto-aeb4a0', judgment: 'too-similar-defer',
    humanNote: '"빨래 건조대 vs 미니 건조기"와 "소형 건조기 vs 스마트 건조대" — 사실상 같은 비교(미니건조기=소형건조기 동의어)를 거의 같은 설명으로 다룸. 역할분리로 억지로 나누기보다 통합 후보로 재검토하는 게 맞아 보임(§7-8 4쌍에는 포함 안 돼 있었으나 유사 성격).' },
  { main: '2026-08-01-cleaning-auto-2b8bbd', dup: '2026-08-10-cleaning-auto-6e0644', judgment: 'too-similar-defer',
    humanNote: '둘 다 옷 얼룩 제거 — 후자가 "5분 골든타임" 응급 프레이밍을 갖고 있어 완전히 같지는 않지만, 차이가 제목의 수사적 표현 수준이라 이걸 "역할분리 실행"이라 부르기엔 근거가 약함. 보수적으로 보류.' },
  { main: '2026-08-01-cleaning-auto-48265b', dup: '2026-08-06-cleaning-auto-e80db8', judgment: 'already-distinct',
    humanNote: '전자는 냄새 제거 방법(how-to), 후자는 음식물처리기 구매 비교(제품 선택) — 이미 다른 질문.' },
  { main: '2026-08-06-cleaning-auto-ab8bbf', dup: '2026-08-14-cleaning-auto-0fc7dd', judgment: 'already-distinct',
    humanNote: '전자(2단계 HIGH 적용 제목)는 필터 청소 자가진단, 후자는 냄새+냉방효율+전기료 종합 — 이미 다른 초점.' },
  { main: '2026-08-06-cleaning-auto-f4b529', dup: '2026-08-10-cleaning-auto-aeb4a0', judgment: 'already-distinct',
    humanNote: '전자는 세탁 단계(분리세탁), 후자는 건조 단계(건조기 비교) — 이미 다른 단계.' },
  { main: '2026-08-11-cleaning-auto-1ad691', dup: '2026-08-11-cleaning-auto-983cbd', judgment: 'already-distinct',
    humanNote: '전자는 "피부 가려움" 증상 진입점, 후자는 "물줄기 약함/냄새" 증상 진입점 — 같은 해법(샤워기 헤드 청소)이지만 독자가 검색해서 들어오는 증상이 이미 다르게 표현되어 있음.' },
  { main: '2026-08-08-products-auto-613b49', dup: '2026-08-01-products-auto-d180b4', judgment: 'too-similar-defer',
    humanNote: '둘 다 동일한 "1인 가구 해충 비교｜" 접두어(2단계 HIGH 적용 제목 템플릿)를 공유하고, 전자(범용 벌레)와 후자(바퀴벌레 특정)의 구분이 약함. 이미 적용된 HIGH 제목을 다시 건드리는 것도 위험 — 향후 별도 검토로 미룸.' },
  { main: '2026-08-01-safety-auto-835af8', dup: '2026-08-06-safety-auto-ec7c17', judgment: 'already-distinct',
    humanNote: '전자는 중독 의심 시 대처(응급), 후자는 CO 경보기 구매 비교(예방/제품) — 이미 다른 질문.' },
  { main: '2026-08-01-safety-auto-b177af', dup: '2026-08-08-safety-auto-ee80c6', judgment: 'too-similar-defer',
    humanNote: '둘 다 "천장/벽 누수 발생 시 대처법"을 거의 동일한 구조(당황하지 않고 원인 파악→대처)로 다룸 — 실질적 차이를 찾기 어려움. 통합 검토가 더 적절해 보임.' },
  { main: '2026-08-03-safety-auto-273fdf', dup: '2026-08-10-safety-auto-46a836', judgment: 'pending-merge-decision',
    humanNote: '46a836은 §7-8 통합 후보(e68c91과의 쌍)에서 MERGE 권장을 받은 글이다 — 그 통합 여부가 정해지기 전에 이 글을 role-split 대상으로 따로 편집하면 나중에 통합 시 되돌려야 할 수 있다. 통합 결정 확정 후 재검토.' },
  { main: '2026-07-30-storage-19', dup: '2026-08-07-storage-auto-54d5cd', judgment: 'already-distinct',
    humanNote: '전자는 "침대 밑 수납 전 체크리스트"(문제해결형), 후자는 "수납형 vs 일반 침대프레임"(구매비교) — 이미 다른 결정 지점.' },
  { main: '2026-07-30-storage-24', dup: '2026-08-01-storage-auto-316ab0', judgment: 'already-distinct',
    humanNote: '전자는 "수납용품을 사야 하는지 판단 기준", 후자는 "오픈형 vs 문형 수납장 비교" — 이미 다른 결정 지점(구매 여부 vs 구매 종류).' },
  { main: '2026-08-01-storage-auto-c94563', dup: '2026-08-08-storage-auto-37bfb5', judgment: 'already-distinct',
    humanNote: '전자는 현관 전체 정리, 후자는 의자에 쌓이는 외투·가방 등 특정 아이템 정리 — 이미 범위가 다름.' },
];

function main() {
  const posts = loadAllPosts();
  const bySlug = new Map(posts.map(p => [p.slug, p]));

  const lines: string[] = [];
  lines.push('# SEO 3단계 §9-12 — 역할분리 검토 HIGH 17쌍 심층 분석 보고서');
  lines.push('');
  lines.push(`생성일: ${new Date().toISOString().slice(0, 10)}`);
  lines.push(`대상: ${DECISIONS.length}쌍 (cannibalization-review.csv의 HIGH 등급 전체, 라이브 재계산 기준)`);
  lines.push('');
  lines.push('**결론: 17쌍 전부 실제 역할분리를 실행하지 않았다(실행 0건).** 5개 실행 조건을 사람이 직접 본문까지 확인해 판정한 결과, 각 쌍은 아래 두 유형 중 하나였다:');
  lines.push('- **이미 충분히 분리됨(already-distinct)**: 제목/설명 수준에서 이미 서로 다른 검색 질문에 답하고 있어, 추가로 "분리"할 것이 없음. 억지로 제목을 더 손대는 것은 불필요한 변경.');
  lines.push('- **너무 비슷해서 보류(too-similar-defer / pending-merge-decision)**: 실제 내용이 이미 거의 같아서, 지금 role-split을 실행하면 존재하지 않는 차이를 지어내는 셈이 됨(조건4·5 위반 위험) — 통합(§7-8) 검토 또는 별도 재검토로 미룸.');
  lines.push('');

  const counts: Record<Judgment, number> = { 'already-distinct': 0, 'too-similar-defer': 0, 'pending-merge-decision': 0 };
  for (const d of DECISIONS) counts[d.judgment]++;
  lines.push(`## 요약: already-distinct ${counts['already-distinct']}쌍 / too-similar-defer ${counts['too-similar-defer']}쌍 / pending-merge-decision ${counts['pending-merge-decision']}쌍`);
  lines.push('');

  let i = 1;
  for (const d of DECISIONS) {
    const a = bySlug.get(d.main);
    const b = bySlug.get(d.dup);
    if (!a || !b) continue;
    lines.push(`## ${i++}. ${d.main} ↔ ${d.dup}`);
    lines.push('');
    lines.push(`- 판정: **${d.judgment}** (실행: ${d.judgment === 'already-distinct' ? '불필요(이미 분리됨)' : '보류'})`);
    lines.push(`- A: "${a.title}" (${detectSearchIntent(a)}, ${classifyClusterDetailed(a).clusterName}) — ${SITE_URL}/blog/${a.slug}/`);
    lines.push(`- B: "${b.title}" (${detectSearchIntent(b)}, ${classifyClusterDetailed(b).clusterName}) — ${SITE_URL}/blog/${b.slug}/`);
    lines.push(`- 사람 검토 근거: ${d.humanNote}`);
    lines.push('');
  }

  ensureAuditDir();
  fs.writeFileSync(path.join(AUDIT_DIR, 'cannibalization-deep-review.md'), lines.join('\n'), 'utf-8');
  console.log(`HIGH ${DECISIONS.length}쌍 심층 분석 완료 — 실제 실행 0건(전부 이미 분리됨 또는 보류)`);
  console.log('출력: seo-audit/cannibalization-deep-review.md');
}

main();
