// GET /api/providers/[slug]/membership-coupon?code=XXX → 公開。入会ページでクーポンコードが使えるか確かめる
// （でお要望 2026-10-19：hacomono差分 #5）。割引の内容だけ返す（利用数などは返さない）。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { findCoupon, discountText } from '@/lib/membership-changes';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function GET(request, { params }) {
  const { slug } = await params;
  const code = new URL(request.url).searchParams.get('code') || '';
  const { data: provider } = await supabase.from('providers').select('id').eq('slug', slug).eq('published', true).maybeSingle();
  if (!provider) return Response.json({ error: '店舗が見つかりません' }, { status: 404 });
  const r = await findCoupon(supabase, provider.id, code);
  if (r.error) return Response.json({ error: r.error }, { status: 400 });
  const d = r.discount;
  return Response.json({ name: d.name, kind: d.kind, value: d.value, duration: d.duration, months: d.months, text: discountText(d) });
}
