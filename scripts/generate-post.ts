import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { generateBlogPost } from '../lib/gemini';
import { loadTopics, saveTopics, pickTopics, getCategoryName, type Topic } from '../lib/topics';

const MAX_CONCURRENCY = 4; // Gemini API 요청 한도 보호용 동시 실행 개수

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

interface Task {
  topic: Topic;
  categoryName: string;
}

// Promise.all로 전부 한 번에 쏘면 Gemini API 분당 요청 한도에 걸리기 쉬워서,
// 동시에 MAX_CONCURRENCY개씩만 실행하는 워커 풀 방식으로 처리한다.
async function runWithConcurrency(tasks: Task[], outDir: string, today: string): Promise<PromiseSettledResult<string>[]> {
  const results: PromiseSettledResult<string>[] = new Array(tasks.length);
  let cursor = 0;

  async function worker() {
    while (cursor < tasks.length) {
      const i = cursor++;
      const { topic, categoryName } = tasks[i];
      try {
        const value = await generateOne(topic, categoryName, outDir, today);
        results[i] = { status: 'fulfilled', value };
      } catch (reason) {
        results[i] = { status: 'rejected', reason };
      }
    }
  }

  const workerCount = Math.min(MAX_CONCURRENCY, tasks.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

async function main() {
  const [, , perCategoryArg, categoryArg] = process.argv;

  const perCategoryRaw = parseInt(perCategoryArg ?? '', 10);
  const perCategory = Number.isFinite(perCategoryRaw) && perCategoryRaw > 0 ? Math.min(perCategoryRaw, 10) : 3;
  const categoryFilter = categoryArg && categoryArg !== 'auto' ? categoryArg : undefined;

  const data = loadTopics();

  if (categoryFilter && !data.categories.some(c => c.slug === categoryFilter)) {
    console.error(`알 수 없는 카테고리: ${categoryFilter}`);
    console.error(`사용 가능한 카테고리: ${data.categories.map(c => c.slug).join(', ')}`);
    process.exit(1);
  }

  const selected = pickTopics(data, perCategory, categoryFilter);

  if (selected.length === 0) {
    console.log('생성할 대기 중인 주제가 없습니다. content/topics.json 에 새 주제를 추가해 주세요.');
    return;
  }

  const outDir = path.join(process.cwd(), 'content', 'blog');
  fs.mkdirSync(outDir, { recursive: true });

  const today = new Date().toISOString().split('T')[0];
  const tasks = selected.map(topic => ({ topic, categoryName: getCategoryName(data, topic.category) }));

  const scope = categoryFilter ? `[${categoryFilter}] 카테고리에서 ${selected.length}개` : `전체 ${data.categories.length}개 카테고리에서 각 ${perCategory}개씩, 총 ${selected.length}개`;
  console.log(`${scope} 글을 생성합니다 (동시 ${Math.min(MAX_CONCURRENCY, selected.length)}개씩 진행)...\n`);

  const results = await runWithConcurrency(tasks, outDir, today);

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
