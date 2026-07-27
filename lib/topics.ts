import fs from 'fs';
import path from 'path';

const TOPICS_PATH = path.join(process.cwd(), 'content', 'topics.json');

export type TopicType = 'foundation' | 'problem' | 'comparison';

export interface Category {
  slug: string;
  name: string;
}

export interface Topic {
  id: number;
  category: string;
  type: TopicType;
  seed: string;
  status: 'pending' | 'published';
  publishedAt?: string;
  publishedSlug?: string;
}

export interface TopicsData {
  categories: Category[];
  cursor: number;
  topics: Topic[];
}

export function loadTopics(): TopicsData {
  const raw = fs.readFileSync(TOPICS_PATH, 'utf-8');
  return JSON.parse(raw) as TopicsData;
}

export function saveTopics(data: TopicsData): void {
  fs.writeFileSync(TOPICS_PATH, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

export function getCategoryName(data: TopicsData, slug: string): string {
  return data.categories.find(c => c.slug === slug)?.name ?? slug;
}

/**
 * count가 자동(카테고리 미지정)이면 카테고리를 순환하며 각기 다른 섹션에서
 * 주제를 균형 있게 골라온다. 특정 카테고리가 지정되면 그 안에서만 고른다.
 */
export function pickTopics(data: TopicsData, count: number, categoryFilter?: string): Topic[] {
  if (categoryFilter) {
    return data.topics.filter(t => t.category === categoryFilter && t.status === 'pending').slice(0, count);
  }

  const order = data.categories.map(c => c.slug);
  if (order.length === 0) return [];

  const selected: Topic[] = [];
  const usedIds = new Set<number>();
  let cursor = data.cursor ?? 0;
  const maxAttempts = order.length * (count + 2);

  for (let attempts = 0; selected.length < count && attempts < maxAttempts; attempts++) {
    const slug = order[cursor % order.length];
    cursor += 1;
    const candidate = data.topics.find(t => t.category === slug && t.status === 'pending' && !usedIds.has(t.id));
    if (candidate) {
      selected.push(candidate);
      usedIds.add(candidate.id);
    }
  }

  data.cursor = cursor % order.length;
  return selected;
}
