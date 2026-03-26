import { getAllArticles } from '@/lib/articles';

export async function GET() {
  const articles = await getAllArticles();
  return Response.json(articles.slice(0, 6));
}
