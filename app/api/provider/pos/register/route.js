// GET/POST /api/provider/pos/register → レジを開ける・入出金・点検（途中の集計）・締め（精算）（でお要望 2026-10-19：hacomono差分 #12）
// POST action: open {opening_cash} / move {kind: in|out, amount, reason} / close {counted_cash, memo}
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { memberAuth } from '@/lib/provider-members';
import { sessionSummary } from '@/lib/pos-register';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
const int = v => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : null; };

export async function GET(request) {
  const a = await memberAuth(request);
  if (!a) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const pid = a.provider.id;
  const { data: open } = await supabase.from('provider_register_sessions').select('*').eq('provider_id', pid).is('closed_at', null).maybeSingle();
  const { data: past } = await supabase.from('provider_register_sessions').select('id, opened_at, opened_by, closed_at, closed_by, opening_cash, expected_cash, counted_cash, difference, summary, memo').eq('provider_id', pid).not('closed_at', 'is', null).order('closed_at', { ascending: false }).limit(30);
  return Response.json({ open: open ? { ...open, summary: await sessionSummary(supabase, open) } : null, past: past || [] });
}

async function __POST(request) {
  const a = await memberAuth(request);
  if (!a) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const pid = a.provider.id;
  const who = a.user.fineme_member?.name || 'オーナー';
  const b = await request.json().catch(() => ({}));
  const { data: open } = await supabase.from('provider_register_sessions').select('*').eq('provider_id', pid).is('closed_at', null).maybeSingle();

  if (b.action === 'open') {
    if (open) return Response.json({ error: 'レジはすでに開いています' }, { status: 409 });
    const cash = int(b.opening_cash) ?? 0;
    if (cash < 0 || cash > 10000000) return Response.json({ error: '準備金が正しくありません' }, { status: 400 });
    const { data, error } = await supabase.from('provider_register_sessions').insert({ provider_id: pid, opening_cash: cash, opened_by: who }).select().single();
    if (error) return Response.json({ error: 'レジはすでに開いています' }, { status: 409 });
    return Response.json(data);
  }
  if (!open) return Response.json({ error: 'レジが開いていません' }, { status: 409 });
  if (b.action === 'move') {
    const amount = int(b.amount);
    if (!['in', 'out'].includes(b.kind) || !(amount > 0)) return Response.json({ error: '金額を入れてください' }, { status: 400 });
    await supabase.from('provider_register_cash_moves').insert({ provider_id: pid, session_id: open.id, kind: b.kind, amount, reason: String(b.reason || '').slice(0, 100) || null, operator: who });
    return Response.json({ ok: true });
  }
  if (b.action === 'close') {
    const counted = int(b.counted_cash);
    if (counted == null || counted < 0) return Response.json({ error: '数えた現金の金額を入れてください' }, { status: 400 });
    const now = new Date().toISOString();
    const summary = await sessionSummary(supabase, open, now);
    const { data } = await supabase.from('provider_register_sessions').update({
      closed_at: now, closed_by: who, counted_cash: counted, expected_cash: summary.expected_cash, difference: counted - summary.expected_cash,
      summary, memo: String(b.memo || '').slice(0, 300) || null,
    }).eq('id', open.id).is('closed_at', null).select().maybeSingle();
    if (!data) return Response.json({ error: 'すでに締めています' }, { status: 409 });
    return Response.json(data);
  }
  return Response.json({ error: '操作の種類が正しくありません' }, { status: 400 });
}
export const POST = withAudit(__POST);
