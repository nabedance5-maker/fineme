import { notFound } from 'next/navigation';
import BizGuideArticle from '../../../_components/BizGuideArticle';
import { PARTNER_GUIDES, PARTNER_GUIDE_BASE } from '@/lib/biz-guide';

export function generateStaticParams() {
  return PARTNER_GUIDES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata(props) {
  const { slug } = await props.params;
  const a = PARTNER_GUIDES.find((x) => x.slug === slug);
  if (!a) return {};
  return {
    title: `${a.title}｜Fineme 営業パートナーガイド`,
    description: a.description,
    alternates: { canonical: `https://www.fineme.me${PARTNER_GUIDE_BASE}/${a.slug}` },
    openGraph: { title: a.title, description: a.description, type: 'article', siteName: 'Fineme', locale: 'ja_JP' },
  };
}

export default async function PartnerGuideArticle(props) {
  const { slug } = await props.params;
  const article = PARTNER_GUIDES.find((x) => x.slug === slug);
  if (!article) notFound();
  return (
    <BizGuideArticle
      article={article}
      base={PARTNER_GUIDE_BASE}
      hubLabel="営業パートナーガイド"
      all={PARTNER_GUIDES}
      cta={{
        heading: 'Fineme 営業パートナーについて',
        href: '/sales-partner',
        label: '募集の詳細を見る（応募無料）',
        sub: { href: '/sales-partner#apply', label: 'すぐに応募する' },
      }}
    />
  );
}
