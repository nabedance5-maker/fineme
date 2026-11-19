// ガイド記事の一覧ページ（/shop-guide・/sales-partner/guide）
// groups を渡すと業種ごとの見出しで束ね、photoOf を渡すとカードに写真を付ける。
import Link from 'next/link';
import '../shop-guide/biz-guide.css';

function Card({ base, a, photoOf }) {
  return (
    <li>
      <Link className={photoOf ? 'bg-card bg-card-ph' : 'bg-card'} href={`${base}/${a.slug}`}>
        {photoOf && <img src={photoOf(a.slug, 640)} alt="" loading="lazy" width="640" height="360" />}
        <b>{a.title}</b>
        <span>{a.description}</span>
      </Link>
    </li>
  );
}

export default function BizGuideHub({ base, label, title, lead, articles, footer, groups, photoOf }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    description: lead,
    url: `https://www.fineme.me${base}`,
    hasPart: articles.map((a) => ({ '@type': 'Article', headline: a.title, url: `https://www.fineme.me${base}/${a.slug}` })),
  };
  const gridClass = photoOf ? 'bg-list bg-grid' : 'bg-list';
  return (
    <main className="bg">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <header className="bg-head">
        <div className="bg-wrap">
          <p className="bg-crumb"><Link href="/">Fineme</Link> / {label}</p>
          <p className="bg-eyebrow">{label}</p>
          <h1 className="bg-h1">{title}</h1>
          <p className="bg-hub-lead">{lead}</p>
          {groups && (
            <nav className="bg-chips" aria-label="業種から探す">
              {groups.map((g) => (
                <a key={g.key} href={`#${g.key}`}>{g.label}<small>{g.articles.length}</small></a>
              ))}
            </nav>
          )}
        </div>
      </header>
      <div className="bg-body">
        <div className={photoOf ? 'bg-wrap bg-wrap-wide' : 'bg-wrap'}>
          {groups ? (
            groups.map((g) => (
              <section key={g.key} id={g.key} className="bg-group">
                <h2 className="bg-group-h">{g.label}</h2>
                <ul className={gridClass}>
                  {g.articles.map((a) => <Card key={a.slug} base={base} a={a} photoOf={photoOf} />)}
                </ul>
              </section>
            ))
          ) : (
            <ul className={gridClass}>
              {articles.map((a) => <Card key={a.slug} base={base} a={a} photoOf={photoOf} />)}
            </ul>
          )}
          {footer}
        </div>
      </div>
    </main>
  );
}
