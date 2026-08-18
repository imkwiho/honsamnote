// SEO 4단계 §29 — 반복 표현 빈도 분석.
// 564개 전체에서 AI 반복 문구를 집계하고 과도하게 높은 글을 표시한다.
import fs from 'fs';
import path from 'path';
import {
  loadAllPosts, AUDIT_DIR, SITE_URL, ensureAuditDir, toCsv,
  extractPlainText, REPETITIVE_PHRASES,
} from './lib/seoPhase4Shared';

function main() {
  const posts = loadAllPosts();

  // 전체 빈도 집계
  const globalCounts: Record<string, number> = {};
  for (const { phrase } of REPETITIVE_PHRASES) globalCounts[phrase] = 0;

  const postRows: Record<string, unknown>[] = [];

  for (const post of posts) {
    const plain = extractPlainText(post.content);
    const perPost: { phrase: string; count: number }[] = [];

    for (const { phrase, re } of REPETITIVE_PHRASES) {
      re.lastIndex = 0;
      const globalRe = new RegExp(re.source, 'g');
      const matches = (plain.match(globalRe) ?? []).length;
      if (matches > 0) {
        perPost.push({ phrase, count: matches });
        globalCounts[phrase] += matches;
      }
    }

    if (perPost.length === 0) continue;

    const totalInPost = perPost.reduce((acc, p) => acc + p.count, 0);
    const maxPhrase = perPost.reduce((a, b) => a.count >= b.count ? a : b);
    const priority = totalInPost >= 6 ? 'HIGH' : totalInPost >= 3 ? 'MEDIUM' : 'LOW';

    postRows.push({
      post_id: post.slug,
      url: `${SITE_URL}/blog/${post.slug}/`,
      title: post.title,
      total_phrase_count: totalInPost,
      top_phrase: maxPhrase.phrase,
      top_phrase_count: maxPhrase.count,
      all_phrases: perPost.map(p => `${p.phrase}(${p.count})`).join('; '),
      priority,
      note: priority === 'HIGH'
        ? '반복 표현 과다 — 다양한 표현으로 분산 검토'
        : '일반 수준',
    });
  }

  // 글 내 합계 내림차순
  postRows.sort((a, b) => (b.total_phrase_count as number) - (a.total_phrase_count as number));

  // 전체 사이트 요약 추가
  const summaryRows = Object.entries(globalCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([phrase, count]) => ({ phrase, total_site_count: count }));

  ensureAuditDir();
  const postColumns = [
    'post_id', 'url', 'title', 'total_phrase_count',
    'top_phrase', 'top_phrase_count', 'all_phrases', 'priority', 'note',
  ];
  fs.writeFileSync(path.join(AUDIT_DIR, 'repetitive-language.csv'), toCsv(postColumns, postRows), 'utf-8');

  const summaryColumns = ['phrase', 'total_site_count'];
  fs.writeFileSync(
    path.join(AUDIT_DIR, 'repetitive-language-summary.csv'),
    toCsv(summaryColumns, summaryRows),
    'utf-8',
  );

  const high = postRows.filter(r => r.priority === 'HIGH').length;
  const med  = postRows.filter(r => r.priority === 'MEDIUM').length;
  console.log(`반복 표현 분석 완료 — ${posts.length}개 검사`);
  console.log(`  반복 발견: ${postRows.length}개 글 (HIGH: ${high} / MEDIUM: ${med})`);
  console.log('  전체 빈도 상위 3개:');
  summaryRows.slice(0, 3).forEach(r => console.log(`    "${r.phrase}": 사이트 전체 ${r.total_site_count}회`));
  console.log('출력: seo-audit/repetitive-language.csv, seo-audit/repetitive-language-summary.csv');
}

main();
