// 店舗運営ガイド（/shop-guide）の業種分けと写真。
// 記事は slug から業種を決め、業種ごとの写真を記事ごとに1枚選ぶ（同じ業種でも記事で変わる）。
// 写真は Unsplash の無料ライセンスで、2026-11-19 に1枚ずつ目で確かめた「施術・店内・事務作業」の場面だけ。
// 人物の顔写真だけのもの（一般向け記事のプール）は店舗向けに合わないので使わない。
import { slugHash } from '@/lib/thumbnail-photos';

export const SHOP_INDUSTRIES = [
  { key: 'gym', label: 'パーソナルジム', re: /^gym-|personal-gym/, photos: ['1517836357463-d25dfeac3438', '1517838277536-f5f99be501cd', '1605296867304-46d5465a13f1', '1548690312-e3b507d8c110'] },
  { key: 'pilates', label: 'ピラティス・ヨガ', re: /pilates|yoga/, photos: ['1758599879090-afdd08ef9974', '1571019613454-1cb2f99b2d8b'] },
  { key: 'brow', label: '眉毛サロン', re: /brow/, photos: ['1551187319-5bcfdebac5b9', '1552693673-1bf958298935'] },
  { key: 'lash', label: 'まつ毛サロン', re: /lash/, photos: ['1552693673-1bf958298935', '1551187319-5bcfdebac5b9'] },
  { key: 'hair', label: '美容室', re: /hair-salon/, photos: ['1622286342621-4bd786c2447c', '1695527081848-1e46c06e6458', '1493256338651-d82f7acb2b38', '1585747860715-2ba37e788b70'] },
  { key: 'nail', label: 'ネイルサロン', re: /nail/, photos: ['1604654894610-df63bc536371', '1571290274554-6a2eaa771e5f', '1727199433231-346fd8101839', '1690749072212-373daf1d58ca'] },
  { key: 'esthetic', label: 'エステサロン', re: /esthetic/, photos: ['1552693673-1bf958298935', '1761718209794-e0588aafbcc4', '1760621393386-3906922b0b78'] },
  { key: 'hair-removal', label: '脱毛サロン', re: /hair-removal/, photos: ['1761718209794-e0588aafbcc4', '1544717304-a2db4a7b16ee'] },
  { key: 'whitening', label: 'ホワイトニング', re: /whitening/, photos: ['1569925444984-9e2e5fc3d1fb', '1760621393386-3906922b0b78'] },
  { key: 'mens', label: 'メンズ美容', re: /mens/, photos: ['1585747860715-2ba37e788b70', '1622286342621-4bd786c2447c', '1493256338651-d82f7acb2b38'] },
  { key: 'style', label: 'パーソナルカラー・外見コンサル', re: /personal-color|image-consult|stylist/, photos: ['1522335789203-aabd1fc54bc9', '1512496015851-a90fb38ba796', '1669889848523-864c6b0e2020'] },
];

export const SHOP_COMMON = {
  key: 'common',
  label: '全業種共通（リピート・予約・会計・AI）',
  photos: ['1611532736597-de2d4265fba3', '1515378960530-7c0da6231fb1', '1484480974693-6ca0a78fb36b', '1765648496288-e1760f547711', '1758598304329-c250b67437bb', '1544655152-4dc3bc4df059', '1499750310107-5fef28a66643'],
};

export function shopIndustryOf(slug) {
  return SHOP_INDUSTRIES.find((i) => i.re.test(slug)) || SHOP_COMMON;
}

const photoUrl = (id, w, h) => `https://images.unsplash.com/photo-${id}?w=${w}${h ? `&h=${h}` : ''}&q=70&auto=format&fit=crop`;

// 記事に cover（管理画面で設定した画像）があればそれを使う。無ければ
// 記事一覧（getGuides の順）から「slug → 写真」の関数を作る。同じ業種の記事には写真を順番に回すので、
// 一覧で隣り合う記事が同じ写真になりにくい。一覧と記事ページで同じ一覧を渡せば同じ写真になる。
export function shopPhotoPicker(articles) {
  const count = {};
  const idOf = {};
  const coverOf = {};
  for (const a of articles) {
    if (a.cover) { coverOf[a.slug] = a.cover; continue; } // 運営が管理画面で設定した画像を優先
    const ind = shopIndustryOf(a.slug);
    const n = count[ind.key] || 0;
    count[ind.key] = n + 1;
    idOf[a.slug] = ind.photos[n % ind.photos.length];
  }
  return (slug, w = 960, h = 0) => {
    if (coverOf[slug]) return coverOf[slug];
    const ind = shopIndustryOf(slug);
    return photoUrl(idOf[slug] || ind.photos[slugHash(slug) % ind.photos.length], w, h);
  };
}

// 一覧ページ用：業種ごとに束ねる（記事の無い業種は出さない・共通は最後）
export function groupShopGuides(articles) {
  const groups = [...SHOP_INDUSTRIES, SHOP_COMMON].map((g) => ({ key: g.key, label: g.label, articles: [] }));
  for (const a of articles) groups.find((g) => g.key === shopIndustryOf(a.slug).key).articles.push(a);
  return groups.filter((g) => g.articles.length);
}
