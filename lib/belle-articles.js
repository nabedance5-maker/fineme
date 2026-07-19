import articles from '@/data/belle-articles.json';

export function getAllBelleArticles() {
  return articles;
}

export function getBelleArticle(slug) {
  return articles.find(a => a.slug === slug) ?? null;
}
