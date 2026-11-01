// 営業パートナー一人ひとりの専用申込ページ（/join/FN003 など）。
// 中身は店舗向けの導入ページ（/provider/join）と同じで、紹介コードが最初から入っている。
// ここから相談・登録したお店は、その営業パートナーの紹介として記録される
// （コードはクッキーにも残るので、他のページを回ってから申し込んでも引き継がれる）。
// 営業パートナーの管理画面（/partner/[token]）と一緒に発行される（契約書 第10条）。
import { redirect } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import ProviderJoinPage from '../../provider/join/page';

export const dynamic = 'force-dynamic';

async function findPartner(raw) {
  const code = String(raw || '').toUpperCase();
  if (!/^[A-Z0-9_-]{1,40}$/.test(code)) return null;
  const { data } = await getSupabase()
    .from('sales_partners')
    .select('name, referral_code, status')
    .eq('referral_code', code)
    .maybeSingle();
  return data && data.status === 'active' ? data : null;
}

export async function generateMetadata(props) {
  const { code } = await props.params;
  const partner = await findPartner(code);
  return {
    title: partner ? `${partner.name}さんからのご案内：Fineme 店舗向けのご案内` : 'Fineme 店舗向けのご案内',
    robots: { index: false, follow: false },
    alternates: { canonical: '/provider/join' },
  };
}

export default async function PartnerJoinPage(props) {
  const { code } = await props.params;
  const searchParams = await props.searchParams;
  const partner = await findPartner(code);
  // 停止中・存在しないコードは、紹介なしの通常の導入ページへ
  if (!partner) redirect('/provider/join');

  const type = ['gym', 'brow'].includes(searchParams?.type) ? searchParams.type : undefined;
  return (
    <>
      <div style={{ background: '#0a0f1e', borderBottom: '1px solid rgba(201,168,76,0.35)', padding: '10px 16px', textAlign: 'center', fontSize: '13px', lineHeight: 1.6, color: '#e8e4dc' }}>
        <span style={{ color: '#c9a84c', fontWeight: 700 }}>{partner.name}</span>さんからのご案内です。このページからのご相談・ご登録には、紹介コード「{partner.referral_code}」が自動で適用されます。
      </div>
      <ProviderJoinPage searchParams={Promise.resolve({ ref: partner.referral_code, type })} />
    </>
  );
}
