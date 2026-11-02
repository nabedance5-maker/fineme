import { notFound } from 'next/navigation';
import BizGuideArticle from '../../_components/BizGuideArticle';
import { SHOP_GUIDES, SHOP_GUIDE_BASE } from '@/lib/biz-guide';

export function generateStaticParams() {
  return SHOP_GUIDES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata(props) {
  const { slug } = await props.params;
  const a = SHOP_GUIDES.find((x) => x.slug === slug);
  if (!a) return {};
  return {
    title: `${a.title}｜Fineme 店舗運営ガイド`,
    description: a.description,
    alternates: { canonical: `https://www.fineme.me${SHOP_GUIDE_BASE}/${a.slug}` },
    openGraph: { title: a.title, description: a.description, type: 'article', siteName: 'Fineme', locale: 'ja_JP' },
  };
}

export default async function ShopGuideArticle(props) {
  const { slug } = await props.params;
  const article = SHOP_GUIDES.find((x) => x.slug === slug);
  if (!article) notFound();
  return (
    <BizGuideArticle
      article={article}
      base={SHOP_GUIDE_BASE}
      hubLabel="店舗運営ガイド"
      all={SHOP_GUIDES}
      cta={{
        heading: 'Fineme 店舗向けでできること',
        href: '/provider/join',
        label: '店舗向けのご案内を見る',
        sub: { href: '/provider/inquiry', label: 'オンラインで無料相談する' },
      }}
    />
  );
}
