import { getSupabase } from '@/lib/supabase';

const BASE_URL = 'https://www.fineme.me';

const CATEGORY_LABELS = {
  gym:'パーソナルジム', eyebrow:'眉毛サロン', hair:'美容院・ヘア',
  skin:'肌・エステ', fashion:'ファッション', photo:'写真撮影',
  consulting:'外見トータルサポート', makeup:'メイク', nail:'ネイル',
  hairremoval:'脱毛', whitening:'ホワイトニング', orthodontics:'歯科矯正',
  aga:'AGA', marriage:'結婚関連サービス', diagnosis:'骨格診断',
};

export async function generateMetadata({ params }) {
  try {
    // アフィリエイトは providers テーブル（entity_type='affiliate'）に格納されている。
    // 以前は存在しない 'affiliates' テーブルを参照していたため常に null となり、
    // robots:{index:false} にフォールバックして全 /affiliate/* が noindex 化していた（GSC検証失敗の原因）。
    const { data: affiliate } = await getSupabase()
      .from('providers')
      .select('name, catchphrase, description, main_category, photo_url, cover_image_url')
      .eq('slug', params.slug)
      .eq('entity_type', 'affiliate')
      .eq('published', true)
      .single();

    if (!affiliate) return { title: 'サービス詳細 | Fineme', robots: { index: false, follow: false } };

    const catLabel = CATEGORY_LABELS[affiliate.main_category] || 'サービス';
    const title = `${affiliate.name} — ${catLabel} | Fineme`;
    const description = affiliate.catchphrase
      || (affiliate.description ? affiliate.description.slice(0, 120) : '')
      || `${catLabel}のおすすめサービス。Finemeで詳細を見る。`;
    const image = affiliate.cover_image_url || affiliate.photo_url || `${BASE_URL}/assets/images/og-image.png`;
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
