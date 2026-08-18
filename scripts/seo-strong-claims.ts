// SEO 4단계 §7 — 564개 전체에서 위험한 단정 표현 탐지.
// 표현 존재 자체를 오류로 처리하지 않는다 — 빈도와 맥락을 기록한다.
// P1 카테고리(housing/safety)에서 발견된 경우 우선순위를 높인다.
import fs from 'fs';
import path from 'path';
import {
  loadAllPosts, AUDIT_DIR, SITE_URL, ensureAuditDir, toCsv,
  extractPlainText, STRONG_CLAIM_PHRASES,
} from './lib/seoPhase4Shared';
import { FACTCHECK_CATEGORIES } from '../lib/seoAudit';

function main() {
  const posts = loadAllPosts();
  const rows: Record<string, unknown>[] = [];

  for (const post of posts) {
    const plain = extractPlainText(post.content);
    const isHighRiskCategory = FACTCHECK_CATEGORIES.has(post.category ?? '');

    const found: { phrase: string; count: number; context: string }[] = [];
    for (const { re, label } of STRONG_CLAIM_PHRASES) {
      re.lastIndex = 0;
      const globalRe = new RegExp(re.source, 'g');
      const matches: string[] = [];
      let m: RegExpExecArray | null;
      while ((m = globalRe.exec(plain)) !== null) {
        const start = Math.max(0, m.index - 20);
        const end = Math.min(plain.length, m.index + m[0].length + 30);
        matches.push(plain.slice(start, end).replace(/\s+/g, ' ').trim());
      }
      if (matches.length > 0) {
        found.push({ phrase: label, count: matches.length, context: matches[0].slice(0, 100) });
      }
    }

    if (found.length === 0) continue;

    const totalCount = found.reduce((acc, f) => acc + f.count, 0);
    const priority = isHighRiskCategory && totalCount >= 2 ? 'HIGH'
      : isHighRiskCategory ? 'MEDIUM'
      : totalCount >= 3 ? 'MEDIUM' : 'LOW';

    rows.push({
      post_id: post.slug,
      url: `${SITE_URL}/blog/${post.slug}/`,
      category: post.category ?? '',
      title: post.title,
      phrases_found: found.map(f => f.phrase).join('; '),
      total_occurrences: totalCount,
      priority,
      first_context: found[0].context.replace(/,/g, '，'),
      review_note: priority === 'HIGH'
        ? '고위험 카테고리에서 강한 단정 다수 — 근거 없는 표현 수정 검토 필요'
        : '단정 표현 존재 — 맥락 확인 후 필요시 완화',
    });
  }

  // priority 순, 그 안에서 occurrences 내림차순
  const order: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  rows.sort((a, b) =>
    (order[a.priority as string] ?? 3) - (order[b.priority as string] ?? 3) ||
    (b.total_occurrences as number) - (a.total_occurrences as number),
  );

  ensureAuditDir();
  const columns = [
    'post_id', 'url', 'category', 'title',
    'phrases_found', 'total_occurrences', 'priority',
    'first_context', 'review_note',
  ];
  fs.writeFileSync(path.join(AUDIT_DIR, 'strong-claim-review.csv'), toCsv(columns, rows), 'utf-8');

  const high = rows.filter(r => r.priority === 'HIGH').length;
  const med  = rows.filter(r => r.priority === 'MEDIUM').length;
  const low  = rows.filter(r => r.priority === 'LOW').length;
  console.log(`강한 단정 표현 탐지 완료 — ${posts.length}개 검사`);
  console.log(`  단정 발견: ${rows.length}개 글 (HIGH: ${high} / MEDIUM: ${med} / LOW: ${low})`);
  console.log('출력: seo-audit/strong-claim-review.csv');
}

main();
