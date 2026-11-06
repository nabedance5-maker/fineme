// GET/POST/PATCH /api/admin/sales-partners → 営業パートナーの管理（admin専用）
//
// でお方針（2026-10-02）：Finemeに掲載していない人でも営業パートナーとして登録できる。
// provider_id を指定しない登録が、掲載者ではない営業パートナーを作る唯一の経路。
// 掲載者本人によるopt-in登録は app/api/provider/sales-partner が別途担当する。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

const ADMIN_KEY = process.env.ADMIN_API_KEY || '';
function checkAdmin(request) {
  const key = request.headers.get('x-admin-key') || request.headers.get('x-internal-key');
  return key && key === ADMIN_KEY;
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
  if (!checkAdmin(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('sales_partners')
    .select('id, name, email, referral_code, provider_id, status, created_at, access_token, is_collaborator, collaborator_rate, excluded_provider_ids, providers(name, slug, entity_type)')
    .order('created_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  // アフィリエイト掲載（営業パートナーとは関係ない、紹介リンクで送客しているだけの掲載）に紐づく行は出さない
  // （渡邉指摘 2026-11-06）。2026-10-02の移行で、当時の全掲載に自動で作られたもの。
  // 紐づく掲載が削除済みで、停止中のまま移行時から残っている行も同じ理由で出さない。?all=1 で全部
  const all = new URL(request.url).searchParams.get('all') === '1';
  const isLegacyJunk = p => p.providers?.entity_type === 'affiliate'
    || (!p.provider_id && p.status === 'inactive' && !p.email && !p.is_collaborator && String(p.created_at) < '2026-10-02T12:00:00Z');
  return Response.json(all ? (data || []) : (data || []).filter(p => !isLegacyJunk(p)));
}

// name必須。provider_idを指定しない場合＝掲載していない営業パートナーとして作成。
export async function POST(request) {
  if (!checkAdmin(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { name, email, provider_id } = body;
  if (!name) return Response.json({ error: 'nameは必須です' }, { status: 400 });

  const referral_code = await nextReferralCode();
  const { data, error } = await supabase
    .from('sales_partners')
    .insert({ name, email: email || null, referral_code, provider_id: provider_id || null, status: 'active' })
    .select('id, name, email, referral_code, provider_id, status, created_at, access_token')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

// status（active/inactive）・名前・メール・協業者の指定・協業者の継続報酬の率を変更できる。
export async function PATCH(request) {
  if (!checkAdmin(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { id, status, name, email, is_collaborator, excluded_provider_ids, collaborator_rate } = body;
  if (!id) return Response.json({ error: 'idは必須です' }, { status: 400 });

  const patch = {};
  if (status === 'active' || status === 'inactive') patch.status = status;
  if (typeof name === 'string' && name.trim()) patch.name = name.trim();
  if (typeof email === 'string') patch.email = email || null;
  if (typeof is_collaborator === 'boolean') patch.is_collaborator = is_collaborator;
  if (Array.isArray(excluded_provider_ids)) patch.excluded_provider_ids = excluded_provider_ids;
  // 協業者の継続報酬の率（全契約者の月額料の◯%。渡邉要望 2026-11-06：人ごとに決める）。1〜50%
  if (collaborator_rate !== undefined) {
    const r = Number(collaborator_rate);
    if (!(r >= 0.01 && r <= 0.5)) return Response.json({ error: '率は1〜50%で入れてください' }, { status: 400 });
    patch.collaborator_rate = Math.round(r * 1000) / 1000;
  }
  if (Object.keys(patch).length === 0) return Response.json({ error: '更新項目がありません' }, { status: 400 });

  const { data, error } = await supabase
    .from('sales_partners')
    .update(patch)
    .eq('id', id)
    .select('id, name, email, referral_code, provider_id, status, created_at, access_token, is_collaborator, collaborator_rate')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
