import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import matter from 'gray-matter';
import { generateBlogPost } from '../lib/gemini';
import { getPostsByCategory, getAllPosts } from '../lib/mdx';
import { analyzePostForAffiliates } from '../lib/affiliateAnalysis';
import { loadTopics, saveTopics, pickTopics, getCategoryName, type Topic, type TopicType } from '../lib/topics';
import { sanitizeMdxContent } from '../lib/mdxSanitize';
import { readGenerationStatus } from '../lib/generationStatus';
import { checkForDuplicate } from '../lib/duplicateGate';
import { type AuditPost } from '../lib/seoAudit';

const MAX_CONCURRENCY = 4; // Gemini API 요청 한도 보호용 동시 실행 개수
// 정해진 소재가 바닥났을 때, AI가 스스로 새 소재를 고를 글의 유형을 순환시켜 다양성을 준다.
const AUTO_TYPE_CYCLE: TopicType[] = ['problem', 'comparison', 'foundation'];

type Task =
  | { mode: 'seeded'; topic: Topic; categoryName: string }
  | { mode: 'auto'; category: string; categoryName: string; type: TopicType; avoidTitles: string[] };

async function runTask(task: Task, outDir: string, today: string, existingPosts: AuditPost[]): Promise<string> {
  const category = task.mode === 'seeded' ? task.topic.category : task.category;
  const label = task.mode === 'seeded' ? task.topic.seed : '(AI가 새 소재 브레인스토밍)';
  console.log(`생성 시작: [${task.categoryName}] ${label}`);

  const raw = await generateBlogPost(
    task.mode === 'seeded'
      ? { seed: task.topic.seed, categorySlug: task.topic.category, categoryName: task.categoryName, type: task.topic.type }
      : { categorySlug: task.category, categoryName: task.categoryName, type: task.type, avoidTitles: task.avoidTitles }
  );

  const parsed = matter(raw);
  parsed.content = sanitizeMdxContent(parsed.content);
  parsed.data.category = category;
  parsed.data.categoryName = task.categoryName;

  // §24-26: 저장 직전, 기존 글과 너무 유사한지 확인한다(클러스터+키워드
  // 기준, lib/seoAudit.ts의 중복 탐지와 동일 로직). 무인 GitHub Actions
  // 환경이라 대화형 선택은 불가능하므로, 유사도가 높으면 저장을 보류하고
  // 가장 가까운 기존 글을 로그로 알려 사람이 "기존 글 업데이트" 여부를
  // 판단하게 한다. (주의: 같은 실행(run) 안에서 동시에 생성 중인 다른
  // 글들끼리는 서로 비교하지 않는다 — existingPosts는 실행 시작 시점의
  // 스냅샷이다.)
  const duplicateCheck = checkForDuplicate(
    {
      slug: '__generating__',
      title: parsed.data.title ?? '',
      description: parsed.data.description ?? '',
      date: parsed.data.date ?? today,
      tags: Array.isArray(parsed.data.tags) ? parsed.data.tags : [],
      keywords: Array.isArray(parsed.data.keywords) ? parsed.data.keywords : [],
      category,
      categoryName: task.categoryName,
      content: parsed.content,
    },
    existingPosts
  );
  if (duplicateCheck.blocked) {
    const closest = duplicateCheck.closestExisting
      .map(c => `${c.slug}(유사도 ${c.similarity}) "${c.title}"`)
      .join(', ');
    throw new Error(
      `중복 감지로 저장 보류: "${parsed.data.title}" — 기존 글과 검색의도가 거의 동일함. 기존 글 업데이트 후보: ${closest}`
    );
  }

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
    if (affiliateAnalysis.insertAfterHeadings.length > 0) parsed.data.affiliateInsertAfterHeadings = affiliateAnalysis.insertAfterHeadings;
    if (affiliateAnalysis.adTitles.length > 0) parsed.data.affiliateAdTitles = affiliateAnalysis.adTitles;
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
async function runWithConcurrency(tasks: Task[], outDir: string, today: string, existingPosts: AuditPost[]): Promise<PromiseSettledResult<string>[]> {
  const results: PromiseSettledResult<string>[] = new Array(tasks.length);
  let cursor = 0;

  async function worker() {
    while (cursor < tasks.length) {
      const i = cursor++;
      try {
        results[i] = { status: 'fulfilled', value: await runTask(tasks[i], outDir, today, existingPosts) };
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
  const status = readGenerationStatus();
  if (status.paused) {
    console.log('⏸️  자동 발행이 일시정지 상태입니다 — 아무 글도 생성하지 않습니다.');
    if (status.reason) console.log(`   사유: ${status.reason}`);
    if (status.resumeNote) console.log(`   재개 방법: ${status.resumeNote}`);
    console.log('   (content/generation-status.json의 "paused"를 false로 바꾸거나 파일을 지우면 재개됩니다.)');
    return;
  }

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

  // 중복 검사용 스냅샷 — 이 실행 시작 시점의 기존 글 전체(§24-26).
  const existingPostsRaw = await getAllPosts();
  const existingPosts: AuditPost[] = existingPostsRaw.map(p => ({
    ...p,
    keywords: p.keywords ?? [],
    content: '', // 중복 판정에는 제목/keywords/tags/category만 쓰므로 본문은 불필요.
  }));

  const results = await runWithConcurrency(tasks, outDir, today, existingPosts);

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
