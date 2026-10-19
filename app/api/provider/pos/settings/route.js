// GET/PUT /api/provider/pos/settings → レジの設定（支払方法・レシート/領収書の表記・税率）（でお要望 2026-10-19：hacomono差分 #12）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { memberAuth } from '@/lib/provider-members';
import { posSettings } from '@/lib/pos-checkout';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
const str = (v, n) => String(v ?? '').trim().slice(0, n) || null;

export async function GET(request) {
  const a = await memberAuth(request);
  if (!a) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const s = await posSettings(supabase, a.provider.id);
  return Response.json({ ...s, store_name: a.provider.name });
}

async function __PUT(request) {
  const a = await memberAuth(request);
  if (!a) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  const up = { provider_id: a.provider.id, updated_at: new Date().toISOString() };
  if (Array.isArray(b.payment_methods)) {
    const seen = new Set();
    const list = b.payment_methods.map(m => ({ key: String(m.key || '').replace(/[^a-z0-9_]/gi, '').slice(0, 20) || `m${Math.random().toString(36).slice(2, 8)}`, label: str(m.label, 20), cash: !!m.cash }))
      .filter(m => m.label && !seen.has(m.key) && seen.add(m.key)).slice(0, 15);
    if (!list.length) return Response.json({ error: '支払方法を1つ以上残してください' }, { status: 400 });
    up.payment_methods = list;
  }
  for (const k of ['receipt_name', 'receipt_address', 'receipt_phone', 'receipt_footer']) if (k in b) up[k] = str(b[k], k === 'receipt_footer' ? 200 : 100);
  if ('invoice_number' in b) {
    const v = String(b.invoice_number || '').replace(/[\s-]/g, '').toUpperCase();
    if (v && !/^T\d{13}$/.test(v)) return Response.json({ error: '登録番号は「T」と13桁の数字で入れてください' }, { status: 400 });
    up.invoice_number = v || null;
  }
  if ('tax_rate' in b) up.tax_rate = [8, 10].includes(Number(b.tax_rate)) ? Number(b.tax_rate) : 10;
  const { error } = await supabase.from('provider_pos_settings').upsert(up);
  if (error) return Response.json({ error: '保存できませんでした' }, { status: 500 });
  return Response.json({ ok: true });
}
export const PUT = withAudit(__PUT);
