import { getAllArticles } from '@/lib/articles';

const VALID_TRACKS = ['fineme', 'belle'];

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const requested = searchParams.get('track');
  const track = VALID_TRACKS.includes(requested) ? requested : 'fineme';

  const articles = await getAllArticles(track);
  return Response.json(articles.slice(0, 6));
}
