import Link from 'next/link';
import BizGuideHub from '../../_components/BizGuideHub';
import { getGuides } from '@/lib/biz-guide-store';
import { PARTNER_GUIDE_BASE } from '@/lib/biz-guide';

const TITLE = '営業パートナーガイド：初期費用なし・完全歩合の紹介営業を始める前に';
const LEAD = '営業代行・紹介の副業を探している方向けに、避けたい案件の見分け方、ストック型報酬の仕組みと計算例、未経験から店舗向けサービスの紹介を始める手順をまとめています。';

export const metadata = {
  title: `${TITLE}｜Fineme`,
  description: LEAD,
  alternates: { canonical: `https://www.fineme.me${PARTNER_GUIDE_BASE}` },
};

export const revalidate = 3600;

export default async function PartnerGuideHub() {
  const articles = await getGuides('partner');
  return (
    <BizGuideHub
      base={PARTNER_GUIDE_BASE}
      label="営業パートナーガイド"
      title={TITLE}
      lead={LEAD}
      articles={articles}
      footer={<h2 className="bg-hub-h2">費用ゼロ・ノルマなしで始めるなら <Link href="/sales-partner">Fineme 営業パートナー募集</Link></h2>}
    />
  );
}
