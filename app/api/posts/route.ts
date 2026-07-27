import { getAllPosts } from '@/lib/mdx';

export const dynamic = 'force-static';

export async function GET() {
  const posts = await getAllPosts();
  return Response.json(posts);
}
