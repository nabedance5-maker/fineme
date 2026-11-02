// ガイド記事の一覧ページ（/shop-guide・/sales-partner/guide）
import Link from 'next/link';
import '../shop-guide/biz-guide.css';

export default function BizGuideHub({ base, label, title, lead, articles, footer }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    description: lead,
    url: `https://www.fineme.me${base}`,
    hasPart: articles.map((a) => ({ '@type': 'Article', headline: a.title, url: `https://www.fineme.me${base}/${a.slug}` })),
  };
  return (
    <main className="bg">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="bg-head">
        <div className="bg-wrap">
          <p className="bg-crumb"><Link href="/">Fineme</Link> / {label}</p>
          <p className="bg-eyebrow">{label}</p>
          <h1 className="bg-h1">{title}</h1>
          <p className="bg-hub-lead">{lead}</p>
        </div>
      </header>
      <div className="bg-body">
        <div className="bg-wrap">
          <ul className="bg-list">
            {articles.map((a) => (
              <li key={a.slug}><Link className="bg-card" href={`${base}/${a.slug}`}><b>{a.title}</b><span>{a.description}</span></Link></li>
            ))}
          </ul>
          {footer}
        </div>
      </div>
    </main>
  );
}
