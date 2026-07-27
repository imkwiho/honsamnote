import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { generateBlogPost } from '../lib/gemini';
import { loadTopics, saveTopics, pickTopics, getCategoryName } from '../lib/topics';

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
  const created: string[] = [];

  for (const topic of selected) {
    const categoryName = getCategoryName(data, topic.category);
    console.log(`생성 중: [${categoryName}] ${topic.seed}`);

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
    saveTopics(data);

    console.log(`  -> ${outPath}`);
    created.push(outPath);
  }

  console.log(`\n총 ${created.length}개 글 생성 완료.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
