import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import matter from 'gray-matter';
import { generateBlogPost } from '../lib/gemini';
import { getPostsByCategory } from '../lib/mdx';
import { analyzePostForAffiliates } from '../lib/affiliateAnalysis';
import { loadTopics, saveTopics, pickTopics, getCategoryName, type Topic, type TopicType } from '../lib/topics';

const MAX_CONCURRENCY = 4; // Gemini API 요청 한도 보호용 동시 실행 개수
// 정해진 소재가 바닥났을 때, AI가 스스로 새 소재를 고를 글의 유형을 순환시켜 다양성을 준다.
const AUTO_TYPE_CYCLE: TopicType[] = ['problem', 'comparison', 'foundation'];

type Task =
  | { mode: 'seeded'; topic: Topic; categoryName: string }
  | { mode: 'auto'; category: string; categoryName: string; type: TopicType; avoidTitles: string[] };

async function runTask(task: Task, outDir: string, today: string): Promise<string> {
  const category = task.mode === 'seeded' ? task.topic.category : task.category;
  const label = task.mode === 'seeded' ? task.topic.seed : '(AI가 새 소재 브레인스토밍)';
  console.log(`생성 시작: [${task.categoryName}] ${label}`);

  const raw = await generateBlogPost(
    task.mode === 'seeded'
      ? { seed: task.topic.seed, categorySlug: task.topic.category, categoryName: task.categoryName, type: task.topic.type }
      : { categorySlug: task.category, categoryName: task.categoryName, type: task.type, avoidTitles: task.avoidTitles }
  );

  const parsed = matter(raw);
  parsed.data.category = category;
  parsed.data.categoryName = task.categoryName;

  // 글 생성 직후, 이 글에 쿠팡 광고를 넣을지/어떤 상품 키워드·위치가 적절한지
  // AI로 한 번 분석해 front matter에 저장한다 (실패해도 글 생성 자체는 계속 진행).
  const affiliateAnalysis = await analyzePostForAffiliates({
    title: parsed.data.title ?? '',
    content: parsed.content,
    categorySlug: category,
    categoryName: task.categoryName,
  });
  if (affiliateAnalysis) {
    parsed.data.affiliateKeywords = affiliateAnalysis.keywords.map(k => k.keyword);
    parsed.data.affiliateProductGroup = affiliateAnalysis.keywords[0]?.productGroup;
    parsed.data.affiliateConfidence = affiliateAnalysis.overallConfidence;
    parsed.data.affiliateShouldInsert = affiliateAnalysis.shouldInsertAds;
    if (affiliateAnalysis.insertAfterHeading) parsed.data.affiliateInsertAfterHeading = affiliateAnalysis.insertAfterHeading;
    if (affiliateAnalysis.adTitle) parsed.data.affiliateAdTitle = affiliateAnalysis.adTitle;
  }

  const suffix = task.mode === 'seeded' ? String(task.topic.id) : `auto-${crypto.randomBytes(3).toString('hex')}`;
  const filename = `${today}-${category}-${suffix}.mdx`;
  const outPath = path.join(outDir, filename);
  fs.writeFileSync(outPath, matter.stringify(parsed.content, parsed.data), 'utf-8');

  if (task.mode === 'seeded') {
    task.topic.status = 'published';
    task.topic.publishedAt = today;
    task.topic.publishedSlug = filename.replace(/\.mdx$/, '');
  }

  console.log(`  완료: ${outPath}`);
  return outPath;
}

// Promise.all로 전부 한 번에 쏘면 Gemini API 분당 요청 한도에 걸리기 쉬워서,
// 동시에 MAX_CONCURRENCY개씩만 실행하는 워커 풀 방식으로 처리한다.
async function runWithConcurrency(tasks: Task[], outDir: string, today: string): Promise<PromiseSettledResult<string>[]> {
  const results: PromiseSettledResult<string>[] = new Array(tasks.length);
  let cursor = 0;

  async function worker() {
    while (cursor < tasks.length) {
      const i = cursor++;
      try {
        results[i] = { status: 'fulfilled', value: await runTask(tasks[i], outDir, today) };
      } catch (reason) {
        results[i] = { status: 'rejected', reason };
      }
    }
  }

  const workerCount = Math.min(MAX_CONCURRENCY, tasks.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

// 정해진 소재 풀에서 perCategory개를 못 채우면, 부족한 만큼 AI가 카테고리 안에서
// 스스로 새 소재를 골라 쓰도록 채워 넣는다. 이렇게 소재가 바닥나도 매번 카테고리별
// 개수가 항상 보장된다.
async function buildTasksForCategory(
  category: string,
  categoryName: string,
  perCategory: number,
  data: ReturnType<typeof loadTopics>
): Promise<Task[]> {
  const seeded = pickTopics(data, perCategory, category);
  const tasks: Task[] = seeded.map(topic => ({ mode: 'seeded', topic, categoryName }));

  const deficit = perCategory - seeded.length;
  if (deficit > 0) {
    const avoidTitles = (await getPostsByCategory(category)).map(p => p.title);
    for (let i = 0; i < deficit; i++) {
      tasks.push({ mode: 'auto', category, categoryName, type: AUTO_TYPE_CYCLE[i % AUTO_TYPE_CYCLE.length], avoidTitles });
    }
  }

  return tasks;
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

  const targetCategories = categoryFilter ? [categoryFilter] : data.categories.map(c => c.slug);

  const tasks: Task[] = [];
  for (const category of targetCategories) {
    const categoryName = getCategoryName(data, category);
    tasks.push(...(await buildTasksForCategory(category, categoryName, perCategory, data)));
  }

  if (tasks.length === 0) {
    console.log('생성할 글이 없습니다.');
    return;
  }

  const outDir = path.join(process.cwd(), 'content', 'blog');
  fs.mkdirSync(outDir, { recursive: true });

  const today = new Date().toISOString().split('T')[0];
  const seededCount = tasks.filter(t => t.mode === 'seeded').length;
  const autoCount = tasks.length - seededCount;

  console.log(
    `${targetCategories.length}개 카테고리 × ${perCategory}개 = 총 ${tasks.length}개 글을 생성합니다 ` +
    `(소재 지정 ${seededCount}개, AI 자동 브레인스토밍 ${autoCount}개, 동시 ${Math.min(MAX_CONCURRENCY, tasks.length)}개씩 진행)...\n`
  );

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
