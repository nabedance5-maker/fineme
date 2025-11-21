import articles from '../../data/articles.json';

export default function ArticlesPage() {
  return (
    <div className="container stack" style={{ padding: '32px 0' }}>
      <h1>特集・記事</h1>
      <div className="grid" style={{ marginTop: 24 }}>
        {articles.map((a) => (
          <article key={a.slug} className="card col-4">
            {a.image && <img src={a.image} alt={a.title} />}
            <div className="card-body">
              <h3 className="card-title">{a.title}</h3>
              <p className="card-meta">{a.excerpt}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
