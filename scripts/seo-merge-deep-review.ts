// SEO 3단계 §7-8 — 통합 후보(현재 4쌍, 라이브 재계산)를 심층 분석한다.
// 실행은 하지 않는다(삭제/redirect 전부 미실행) — 사람이 승인할 수 있도록
// 결정 로직과 근거를 최대한 상세히 기록한다.
import fs from 'fs';
import path from 'path';
import {
  findDuplicateCandidates,
  classifyClusterDetailed,
  detectSearchIntent,
  primaryKeyword,
  emptySearchConsoleMetrics,
} from '../lib/seoAudit';
import { getPillarForCluster } from '../lib/pillars';
import { buildLinkGraph } from '../lib/linkGraph';
import { loadAllPosts, AUDIT_DIR, SITE_URL, ensureAuditDir } from './lib/seoPhase3Shared';

// 결정 규칙(§7-8): 검색의도가 같고 유사도가 매우 높으면(0.8 이상) MERGE.
// 검색의도가 다르면 — 유사도가 아무리 높아도 서로 다른 검색 질문에 답하는
// 것이므로 KEEP+ROLE-SPLIT. 그 외(같은 의도, 유사도 0.75~0.8)는 그래도
// 사실상 같은 질문에 대한 중복이므로 MERGE.
const MERGE_SIMILARITY_BAR = 0.8;

function main() {
  const posts = loadAllPosts();
  const postBySlug = new Map(posts.map(p => [p.slug, p]));
  const graph = buildLinkGraph(posts);
  const candidates = findDuplicateCandidates(posts).filter(c => c.recommendedAction === 'C. 통합 후보');

  const lines: string[] = [];
  lines.push('# SEO 3단계 §7-8 — 통합 후보 심층 분석 보고서');
  lines.push('');
  lines.push(`생성일: ${new Date().toISOString().slice(0, 10)}`);
  lines.push(`대상: ${candidates.length}쌍 (라이브 재계산 — 2단계 시점 4쌍과 다를 수 있음)`);
  lines.push('');
  lines.push('**이 보고서는 결정 근거만 제공한다. 실제 삭제/redirect/통합은 전혀 실행하지 않았다 — 사람 승인 필요.**');
  lines.push('');

  const scMetrics = emptySearchConsoleMetrics(); // Search Console 미연동 — 항상 null

  for (const c of candidates) {
    const main = postBySlug.get(c.mainPost)!;
    const dup = postBySlug.get(c.duplicatePost)!;
    const mainIntent = detectSearchIntent(main);
    const dupIntent = detectSearchIntent(dup);
    const mainCluster = classifyClusterDetailed(main);
    const dupCluster = classifyClusterDetailed(dup);
    const mainPillar = getPillarForCluster(mainCluster.clusterSlug);
    const dupPillar = getPillarForCluster(dupCluster.clusterSlug);

    let decision: 'MERGE' | 'KEEP+ROLE-SPLIT';
    let decisionReason: string;
    if (mainIntent !== dupIntent) {
      decision = 'KEEP+ROLE-SPLIT';
      decisionReason = `검색의도가 다름(${main.slug}=${mainIntent} / ${dup.slug}=${dupIntent}) — 유사도가 높아도 서로 다른 검색 질문에 답하고 있어 통합보다 역할 분리가 적합`;
    } else if (c.similarity >= MERGE_SIMILARITY_BAR) {
      decision = 'MERGE';
      decisionReason = `검색의도가 같고(${mainIntent}) 유사도가 매우 높음(${c.similarity}) — 사실상 같은 검색 질문에 대한 중복 콘텐츠`;
    } else {
      decision = 'MERGE';
      decisionReason = `검색의도가 같고(${mainIntent}) 유사도가 기준(${MERGE_SIMILARITY_BAR}) 미만이지만 여전히 통합 임계값(0.75) 이상 — 중복으로 판단`;
    }

    lines.push(`## ${main.slug} ↔ ${dup.slug}`);
    lines.push('');
    lines.push(`- **결정: ${decision}** — ${decisionReason}`);
    lines.push(`- URL: ${SITE_URL}/blog/${main.slug}/ ↔ ${SITE_URL}/blog/${dup.slug}/`);
    lines.push(`- 제목: "${main.title}" ↔ "${dup.title}"`);
    lines.push(`- 대표/보조 키워드: ${primaryKeyword(main)} / ${primaryKeyword(dup)}`);
    lines.push(`- 검색의도: ${mainIntent} / ${dupIntent}`);
    lines.push(`- 본문 유사도(Jaccard+클러스터 보너스): ${c.similarity}`);
    lines.push(`- 게시일: ${main.date} / ${dup.date}${main.updatedAt || dup.updatedAt ? ` (수정: ${main.updatedAt ?? '-'} / ${dup.updatedAt ?? '-'})` : ''}`);
    lines.push(`- 클러스터: ${mainCluster.clusterName}(${mainCluster.clusterSlug}) / ${dupCluster.clusterName}(${dupCluster.clusterSlug})${mainPillar || dupPillar ? ` — Pillar: ${mainPillar?.name ?? '-'} / ${dupPillar?.name ?? '-'}` : ''}`);
    lines.push(`- 내부링크: outgoing ${graph.outgoing.get(main.slug)?.size ?? 0}/${graph.outgoing.get(dup.slug)?.size ?? 0}, incoming ${graph.incoming.get(main.slug)?.size ?? 0}/${graph.incoming.get(dup.slug)?.size ?? 0}`);
    lines.push(`- Search Console 지표: impressions/clicks/ctr/평균순위 — 연동 전이라 전부 null(${JSON.stringify(scMetrics)}), 임의 추정치 기입 안 함`);
    lines.push('');

    if (decision === 'MERGE') {
      lines.push(`- **MERGE RECOMMENDED**`);
      lines.push(`  - 대표 페이지(유지): ${c.mainPost} (제목이 더 짧고 대표 키워드를 포함 — findDuplicateCandidates가 자동 선정, 최종 확인은 사람이)`);
      lines.push(`  - 흡수될 페이지: ${c.duplicatePost}`);
      lines.push(`  - 보존해야 할 내용: ${dup.keywords.filter(k => !main.keywords.includes(k)).slice(0, 5).join(', ') || '(흡수 글만의 고유 관점 뚜렷하지 않음)'}`);
      lines.push(`  - 통합 후 필요 작업(미실행): ① 흡수 페이지 → 대표 페이지 redirect 설정, ② 흡수 페이지를 향하던 내부링크를 대표 페이지로 재배선, ③ sitemap.xml 갱신, ④ canonical 재확인`);
    } else {
      lines.push(`- **KEEP + ROLE-SPLIT 검토** (실행하지 않음 — §9-11에서 HIGH 등급 역할분리 쌍만 조건 충족 시 실제 실행)`);
      lines.push(`  - 제안: ${main.slug}=${mainIntent} 관점 유지, ${dup.slug}=${dupIntent} 관점으로 명확히 분리`);
    }
    lines.push('');
  }

  ensureAuditDir();
  fs.writeFileSync(path.join(AUDIT_DIR, 'merge-final-review.md'), lines.join('\n'), 'utf-8');

  const mergeCount = candidates.filter(c => {
    const main = postBySlug.get(c.mainPost)!;
    const dup = postBySlug.get(c.duplicatePost)!;
    return detectSearchIntent(main) === detectSearchIntent(dup);
  }).length;
  console.log(`통합 후보 ${candidates.length}쌍 심층 분석 완료 — MERGE 권장 ${mergeCount}쌍, KEEP+ROLE-SPLIT 권장 ${candidates.length - mergeCount}쌍`);
  console.log('출력: seo-audit/merge-final-review.md (전부 미실행 — 사람 승인 필요)');
}

main();
