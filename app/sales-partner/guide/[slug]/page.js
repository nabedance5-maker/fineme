import { notFound } from 'next/navigation';
import BizGuideArticle from '../../../_components/BizGuideArticle';
import { getGuides } from '@/lib/biz-guide-store';
import { PARTNER_GUIDES, PARTNER_GUIDE_BASE } from '@/lib/biz-guide';

// 週1でAIが足した記事（biz_guides）も出すため、1時間ごとに作り直す
export const revalidate = 3600;

export function generateStaticParams() {
  return PARTNER_GUIDES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata(props) {
  const { slug } = await props.params;
  const a = (await getGuides('partner')).find((x) => x.slug === slug);
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
  const all = await getGuides('partner');
  const article = all.find((x) => x.slug === slug);
  if (!article) notFound();
  return (
    <BizGuideArticle
      article={article}
      base={PARTNER_GUIDE_BASE}
      hubLabel="営業パートナーガイド"
      all={all}
      cta={{
        heading: 'Fineme 営業パートナーについて',
        href: '/sales-partner',
        label: '募集の詳細を見る（応募無料）',
        sub: { href: '/sales-partner#apply', label: 'すぐに応募する' },
      }}
    />
  );
}
