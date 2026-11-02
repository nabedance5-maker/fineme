// 店舗運営ガイド・営業パートナーガイドの記事本文（lib/biz-guide.js のデータを描く）。
// AI検索・検索エンジン向けに Article / FAQPage / BreadcrumbList の構造化データも出す。
import Link from 'next/link';
import '../shop-guide/biz-guide.css';
import { GUIDE_UPDATED } from '@/lib/biz-guide';

const SITE = 'https://www.fineme.me';

export default function BizGuideArticle({ article, base, hubLabel, all, cta }) {
  const url = `${SITE}${base}/${article.slug}`;
  const updated = article.updated || GUIDE_UPDATED;
  const related = (article.related || []).map((s) => all.find((a) => a.slug === s)).filter(Boolean);
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: article.title,
      description: article.description,
      datePublished: updated,
      dateModified: updated,
      inLanguage: 'ja',
      mainEntityOfPage: url,
      author: { '@type': 'Organization', name: 'Fineme', url: SITE },
      publisher: { '@type': 'Organization', name: 'Fineme', url: SITE },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: article.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Fineme', item: SITE },
        { '@type': 'ListItem', position: 2, name: hubLabel, item: `${SITE}${base}` },
        { '@type': 'ListItem', position: 3, name: article.title, item: url },
      ],
    },
  ];

  return (
    <main className="bg">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="bg-head">
        <div className="bg-wrap">
          <p className="bg-crumb"><Link href="/">Fineme</Link> / <Link href={base}>{hubLabel}</Link></p>
          <p className="bg-eyebrow">{hubLabel}</p>
          <h1 className="bg-h1">{article.title}</h1>
          <p className="bg-meta">更新日 {updated.replace(/-/g, '.')}・Fineme 編集部</p>
        </div>
      </header>
      <div className="bg-body">
        <article className="bg-wrap">
          <p className="bg-lead">{article.lead}</p>
          {article.sections.map((s) => (
            <section key={s.h} className="bg-sec">
              <h2>{s.h}</h2>
              {s.listFirst && s.list && <ul>{s.list.map((x) => <li key={x}>{x}</li>)}</ul>}
              {(s.p || []).map((x) => <p key={x}>{x}</p>)}
              {!s.listFirst && s.list && <ul>{s.list.map((x) => <li key={x}>{x}</li>)}</ul>}
            </section>
          ))}
          <aside className="bg-fineme">
            <h2>{cta.heading}</h2>
            <p>{article.fineme}</p>
            <Link className="bg-cta" href={cta.href}>{cta.label}</Link>
            {cta.sub && <Link className="bg-cta-sub" href={cta.sub.href}>{cta.sub.label}</Link>}
          </aside>
          <section className="bg-faq">
            <h2>よくある質問</h2>
            <dl>
              {article.faq.map(([q, a]) => (
                <div key={q}><dt>{q}</dt><dd>{a}</dd></div>
              ))}
            </dl>
          </section>
          {related.length > 0 && (
            <nav className="bg-related" aria-label="関連する記事">
              <h2>あわせて読みたい</h2>
              <ul className="bg-list">
                {related.map((r) => (
                  <li key={r.slug}><Link className="bg-card" href={`${base}/${r.slug}`}><b>{r.title}</b><span>{r.description}</span></Link></li>
                ))}
              </ul>
            </nav>
          )}
        </article>
      </div>
    </main>
  );
}
