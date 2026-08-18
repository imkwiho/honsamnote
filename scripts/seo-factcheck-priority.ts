// SEO 3단계 §18-19 — fact-check 필요 글(라이브 재계산, 91개)을 P1/P2/P3로
// 분류한다. 수치·법령 내용은 전혀 수정하지 않는다(§18 명시).
import fs from 'fs';
import path from 'path';
import { computeFactCheckFlag } from '../lib/seoAudit';
import { loadAllPosts, AUDIT_DIR, SITE_URL, ensureAuditDir, toCsv } from './lib/seoPhase3Shared';

type Priority = 'P1' | 'P2' | 'P3';

function main() {
  const posts = loadAllPosts();
  const flagged = posts.map(p => ({ post: p, result: computeFactCheckFlag(p) })).filter(x => x.result.flagged);

  const rows = flagged.map(({ post, result }) => {
    const patterns = result.matches.map(m => m.pattern);
    const hasLegalPattern = patterns.includes('법령 조항') || patterns.includes('법률·행정 용어');

    let priority: Priority;
    let reason: string;
    if (post.category === 'safety') {
      priority = 'P1';
      reason = '안전(safety) 카테고리 — 잘못된 정보가 신체/재산 위험으로 직결될 수 있음(고위험 + 최신성 중요)';
    } else if (post.category === 'housing' && hasLegalPattern) {
      priority = 'P1';
      reason = `주거(housing) 카테고리 + 법령/행정 용어 매치(${patterns.join(', ')}) — 임대차보호법 등은 개정 빈도가 있어 최신성 중요`;
    } else if (post.category === 'cost') {
      priority = 'P2';
      reason = '생활비(cost) 카테고리 — 요금/가격 정보는 시기에 따라 변동되나 안전 문제만큼 긴급하지는 않음';
    } else if (post.category === 'housing') {
      priority = 'P2';
      reason = `주거(housing) 카테고리, 금액/비율 정보(${patterns.join(', ')}) — 법령보다는 시세성 정보`;
    } else {
      priority = 'P3';
      reason = `${post.categoryName ?? post.category} 카테고리 — 안정적인 일반 정보(${patterns.join(', ')})`;
    }

    return {
      post_id: post.slug,
      url: `${SITE_URL}/blog/${post.slug}/`,
      category: post.categoryName ?? post.category ?? '',
      matched_patterns: patterns.join('; '),
      snippet_sample: result.matches[0]?.snippet ?? '',
      priority,
      reason,
    };
  });

  rows.sort((a, b) => a.priority.localeCompare(b.priority));

  ensureAuditDir();
  const columns = ['post_id', 'url', 'category', 'matched_patterns', 'snippet_sample', 'priority', 'reason'];
  fs.writeFileSync(path.join(AUDIT_DIR, 'factcheck-priority.csv'), toCsv(columns, rows), 'utf-8');

  const counts = { P1: 0, P2: 0, P3: 0 };
  for (const r of rows) counts[r.priority as Priority]++;
  console.log(`fact-check 필요 ${rows.length}개 분류 완료 — P1(고위험) ${counts.P1}개, P2(시세성) ${counts.P2}개, P3(안정적) ${counts.P3}개`);
  console.log('출력: seo-audit/factcheck-priority.csv (내용은 전혀 수정하지 않음)');
}

main();
