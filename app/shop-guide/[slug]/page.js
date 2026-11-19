import { notFound } from 'next/navigation';
import BizGuideArticle from '../../_components/BizGuideArticle';
import { getGuides } from '@/lib/biz-guide-store';
import { SHOP_GUIDES, SHOP_GUIDE_BASE } from '@/lib/biz-guide';
import { shopPhotoPicker, shopIndustryOf } from '@/lib/biz-guide-visual';

// 週1でAIが足した記事（biz_guides）も出すため、1時間ごとに作り直す
export const revalidate = 3600;

export function generateStaticParams() {
  return SHOP_GUIDES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata(props) {
  const { slug } = await props.params;
  const all = await getGuides('shop');
  const a = all.find((x) => x.slug === slug);
  if (!a) return {};
  return {
    title: `${a.title}｜Fineme 店舗運営ガイド`,
    description: a.description,
    alternates: { canonical: `https://www.fineme.me${SHOP_GUIDE_BASE}/${a.slug}` },
    openGraph: { title: a.title, description: a.description, type: 'article', siteName: 'Fineme', locale: 'ja_JP', images: [{ url: shopPhotoPicker(all)(a.slug, 1200, 630), width: 1200, height: 630 }] },
  };
}

export default async function ShopGuideArticle(props) {
  const { slug } = await props.params;
  const all = await getGuides('shop');
  const article = all.find((x) => x.slug === slug);
  if (!article) notFound();
  const photoOf = shopPhotoPicker(all);
  return (
    <BizGuideArticle
      article={article}
      base={SHOP_GUIDE_BASE}
      hubLabel="店舗運営ガイド"
      all={all}
      cover={photoOf(article.slug)}
      industry={shopIndustryOf(article.slug).label}
      photoOf={photoOf}
      cta={{
        heading: 'Fineme 店舗向けでできること',
        href: '/provider/join',
        label: '店舗向けのご案内を見る',
        sub: { href: '/provider/inquiry', label: 'オンラインで無料相談する' },
      }}
    />
  );
}
