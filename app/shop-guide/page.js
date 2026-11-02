import Link from 'next/link';
import BizGuideHub from '../_components/BizGuideHub';
import { getGuides } from '@/lib/biz-guide-store';
import { SHOP_GUIDE_BASE } from '@/lib/biz-guide';

const TITLE = '店舗運営ガイド：リピート・集客・売上を伸ばす実践ノート';
const LEAD = '個人〜小規模のサロン・パーソナルジム・美容室の運営者向けに、2回目の来店、休眠のお客様の掘り起こし、回数券・月会費の管理、AIの使い方まで、売上を伸ばすための考え方と手順をまとめています。';

export const metadata = {
  title: `${TITLE}｜Fineme 店舗向け`,
  description: LEAD,
  alternates: { canonical: `https://www.fineme.me${SHOP_GUIDE_BASE}` },
};

export const revalidate = 3600;

export default async function ShopGuideHub() {
  const articles = await getGuides('shop');
  return (
    <BizGuideHub
      base={SHOP_GUIDE_BASE}
      label="店舗運営ガイド"
      title={TITLE}
      lead={LEAD}
      articles={articles}
      footer={<h2 className="bg-hub-h2">リピート作りを、仕組みに任せるなら <Link href="/provider/join">Fineme 店舗向けのご案内</Link></h2>}
    />
  );
}
