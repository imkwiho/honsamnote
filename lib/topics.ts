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
 * 카테고리가 지정되면 그 안에서 perCategory개를 고른다.
 * 지정되지 않으면(auto) 8개 카테고리 전부에서 각각 perCategory개씩 고른다 —
 * 한 번 실행할 때마다 전체 메뉴의 글이 골고루 올라가도록 하기 위함이다.
 */
export function pickTopics(data: TopicsData, perCategory: number, categoryFilter?: string): Topic[] {
  if (categoryFilter) {
    return data.topics.filter(t => t.category === categoryFilter && t.status === 'pending').slice(0, perCategory);
  }

  const selected: Topic[] = [];
  for (const cat of data.categories) {
    const picks = data.topics.filter(t => t.category === cat.slug && t.status === 'pending').slice(0, perCategory);
    selected.push(...picks);
  }
  return selected;
}
