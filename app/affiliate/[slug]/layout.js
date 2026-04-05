import { getSupabase } from '@/lib/supabase';

const BASE_URL = 'https://www.fineme.me';

const CATEGORY_LABELS = {
  gym:'パーソナルジム', eyebrow:'眉毛サロン', hair:'美容院・ヘア',
  skin:'肌・エステ', fashion:'ファッション', photo:'写真撮影',
  consulting:'外見トータルサポート', makeup:'メイク', nail:'ネイル',
  hairremoval:'脱毛', whitening:'ホワイトニング', orthodontics:'歯科矯正',
  aga:'AGA', marriage:'結婚相談所', diagnosis:'骨格診断',
};

export async function generateMetadata({ params }) {
  try {
    const { data: affiliate } = await getSupabase()
      .from('affiliates')
      .select('name, tagline, description, main_category, thumbnail')
      .eq('slug', params.slug)
      .single();

    if (!affiliate) return { title: 'サービス詳細 | Fineme' };

    const catLabel = CATEGORY_LABELS[affiliate.main_category] || 'サービス';
    const title = `${affiliate.name} — ${catLabel} | Fineme`;
    const description = affiliate.tagline
      || (affiliate.description ? affiliate.description.slice(0, 120) : '')
      || `${catLabel}のおすすめサービス。Finemeで詳細を見る。`;
    const image = affiliate.thumbnail || `${BASE_URL}/assets/images/og-image.png`;
    const url = `${BASE_URL}/affiliate/${params.slug}`;

    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: {
        title,
        description,
        url,
        type: 'website',
        images: [{ url: image, width: 1200, height: 630, alt: affiliate.name }],
        locale: 'ja_JP',
        siteName: 'Fineme',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [image],
      },
    };
  } catch {
    return { title: 'サービス詳細 | Fineme' };
  }
}

export default function AffiliateSlugLayout({ children }) {
  return children;
}
