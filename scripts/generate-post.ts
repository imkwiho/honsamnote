import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { generateBlogPost } from '../lib/gemini';
import { loadTopics, saveTopics, pickTopics, getCategoryName, type Topic } from '../lib/topics';

async function generateOne(topic: Topic, categoryName: string, outDir: string, today: string): Promise<string> {
  console.log(`생성 시작: [${categoryName}] ${topic.seed}`);

  const raw = await generateBlogPost({
    seed: topic.seed,
    categorySlug: topic.category,
    categoryName,
    type: topic.type,
  });

  const parsed = matter(raw);
  parsed.data.category = topic.category;
  parsed.data.categoryName = categoryName;

  const filename = `${today}-${topic.category}-${topic.id}.mdx`;
  const outPath = path.join(outDir, filename);
  fs.writeFileSync(outPath, matter.stringify(parsed.content, parsed.data), 'utf-8');

  topic.status = 'published';
  topic.publishedAt = today;
  topic.publishedSlug = filename.replace(/\.mdx$/, '');

  console.log(`  완료: ${outPath}`);
  return outPath;
}

async function main() {
  const [, , countArg, categoryArg] = process.argv;

  const countRaw = parseInt(countArg ?? '', 10);
  const count = Number.isFinite(countRaw) && countRaw > 0 ? Math.min(countRaw, 10) : 2;
  const categoryFilter = categoryArg && categoryArg !== 'auto' ? categoryArg : undefined;

  const data = loadTopics();

  if (categoryFilter && !data.categories.some(c => c.slug === categoryFilter)) {
    console.error(`알 수 없는 카테고리: ${categoryFilter}`);
    console.error(`사용 가능한 카테고리: ${data.categories.map(c => c.slug).join(', ')}`);
    process.exit(1);
  }

  const selected = pickTopics(data, count, categoryFilter);

  if (selected.length === 0) {
    console.log('생성할 대기 중인 주제가 없습니다. content/topics.json 에 새 주제를 추가해 주세요.');
    return;
  }

  const outDir = path.join(process.cwd(), 'content', 'blog');
  fs.mkdirSync(outDir, { recursive: true });

  const today = new Date().toISOString().split('T')[0];

  console.log(`${selected.length}개 글을 동시에 생성합니다...\n`);

  const results = await Promise.allSettled(
    selected.map(topic => generateOne(topic, getCategoryName(data, topic.category), outDir, today))
  );

  // 성공한 주제만 topics.json에 반영 — 실패한 주제는 pending으로 남아 다음 실행 때 다시 시도된다.
  saveTopics(data);

  const created = results
    .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
    .map(r => r.value);
  const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');

  console.log(`\n총 ${created.length}개 글 생성 완료.`);

  if (failed.length > 0) {
    console.warn(`${failed.length}개 생성 실패 (다음 실행 때 재시도됩니다):`);
    failed.forEach(f => console.warn(' -', f.reason));
  }

  if (created.length === 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
