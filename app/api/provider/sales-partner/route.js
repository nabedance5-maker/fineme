// GET/POST /api/provider/sales-partner → 掲載者本人による営業パートナー登録（opt-in）
//
// でお方針（2026-10-02）：「掲載者だから営業パートナーになれる」のではなく、
// 「掲載者も、希望すれば営業パートナーとして別途登録できる」。掲載者契約と営業パートナー
// 登録は別の契約として扱い、前者を後者の必須条件にしない（本ルートの逆・掲載していない
// 人の登録は app/api/admin/sales-partners が担当する）。登録しても紹介報酬の
// 率・条件・計算ロジックは変わらない——変わるのは「紹介者として扱われるための前提条件」だけ。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id, name, email').eq('email', user.email).single();
  return data || null;
}

async function nextReferralCode() {
  const { data } = await supabase.from('sales_partners').select('referral_code').like('referral_code', 'FN%');
  let max = 0;
  (data || []).forEach(r => {
    const n = parseInt(String(r.referral_code || '').replace(/^FN/, ''), 10);
    if (!Number.isNaN(n) && n > max) max = n;
  });
  return `FN${String(max + 1).padStart(3, '0')}`;
}

export async function GET(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: partner } = await supabase
    .from('sales_partners')
    .select('id, referral_code, status, access_token')
    .eq('provider_id', provider.id)
    .maybeSingle();

  return Response.json({ registered: !!partner, partner: partner || null });
}

async function __POST(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: existing } = await supabase
    .from('sales_partners')
    .select('id, referral_code, status, access_token')
    .eq('provider_id', provider.id)
    .maybeSingle();

  if (existing) {
    // 既に登録済みなら作り直さず、非アクティブなら再アクティブ化するだけ
    if (existing.status !== 'active') {
      await supabase.from('sales_partners').update({ status: 'active' }).eq('id', existing.id);
    }
    return Response.json({ registered: true, partner: { ...existing, status: 'active' } });
  }

  const referral_code = await nextReferralCode();
  const { data: created, error } = await supabase
    .from('sales_partners')
    .insert({ name: provider.name, email: provider.email, referral_code, provider_id: provider.id, status: 'active' })
    .select('id, referral_code, status, access_token')
    .single();

  if (error) return Response.json({ error: '営業パートナー登録に失敗しました' }, { status: 500 });

  return Response.json({ registered: true, partner: created });
}

export const POST = withAudit(__POST);
