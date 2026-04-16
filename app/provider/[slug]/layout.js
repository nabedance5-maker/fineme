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
    const { data: provider } = await getSupabase()
      .from('providers')
      .select('name, tagline, description, main_category, prefecture, photo_url, thumbnail')
      .eq('slug', params.slug)
      .single();

    if (!provider) return { title: '掲載者ページ | Fineme' };

    const catLabel = CATEGORY_LABELS[provider.main_category] || 'サービス';
    const title = `${provider.name} — ${catLabel} | Fineme`;
    const description = provider.tagline
      || (provider.description ? provider.description.slice(0, 120) : '')
      || `${provider.prefecture || ''}で活動する${catLabel}の専門家。Finemeで詳細を見る。`;
    const image = provider.thumbnail || provider.photo_url || `${BASE_URL}/assets/images/og-image.png`;
    const url = `${BASE_URL}/provider/${params.slug}`;

    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: {
        title,
        description,
        url,
        type: 'profile',
        images: [{ url: image, width: 1200, height: 630, alt: provider.name }],
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
    return { title: '掲載者ページ | Fineme' };
  }
}

export default function ProviderSlugLayout({ children }) {
  return children;
}
