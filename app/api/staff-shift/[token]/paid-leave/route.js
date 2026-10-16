// GET    /api/staff-shift/[token]/paid-leave → 自分の有給の残り日数・申請の一覧
// POST   /api/staff-shift/[token]/paid-leave { date, unit: 'full'|'am'|'pm', reason } → 有給を申請（店舗の承認待ち）
// DELETE /api/staff-shift/[token]/paid-leave?id= → 承認待ちの申請を取り消す
// でお要望（2026-10-16）。スタッフはシフト提出リンク（推測不可能なトークン）で本人確認する。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { hasFeature } from '@/lib/feature-flags';
import { leaveSummary, LEAVE_UNIT_LABEL } from '@/lib/paid-leave';
import { sendLinePushWithAction } from '@/lib/line-push';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.fineme.me';
const jstToday = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
const addDays = (d, n) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };

async function staffAndProvider(token) {
  const { data: staff } = await supabase.from('provider_staff').select('id, name, provider_id').eq('shift_access_token', token).maybeSingle();
  if (!staff) return { error: Response.json({ error: 'リンクが無効です' }, { status: 404 }) };
  const { data: provider } = await supabase.from('providers').select('id, name, plan, enabled_features, line_user_id').eq('id', staff.provider_id).single();
  if (!provider || !hasFeature(provider, 'attendance')) return { error: Response.json({ error: 'このお店では有給の申請を受け付けていません', code: 'disabled' }, { status: 403 }) };
  return { staff, provider };
}

async function load(staff) {
  const [{ data: grants }, { data: requests }] = await Promise.all([
    supabase.from('provider_paid_leave_grants').select('granted_on, expires_on, days').eq('provider_id', staff.provider_id).eq('staff_id', staff.id),
    supabase.from('provider_paid_leave_requests').select('id, date, unit, days, reason, status, decision_note, created_at').eq('provider_id', staff.provider_id).eq('staff_id', staff.id).order('date', { ascending: false }).limit(200),
  ]);
  return { grants: grants || [], requests: requests || [] };
}

export async function GET(request, { params }) {
  const { token } = await params;
  const { staff, error } = await staffAndProvider(token);
  if (error) return error;
  const { grants, requests } = await load(staff);
  return Response.json({ summary: leaveSummary(grants, requests, jstToday()), requests: requests.slice(0, 30), has_grant: grants.length > 0 });
}

export async function POST(request, { params }) {
  const { token } = await params;
  const { staff, provider, error } = await staffAndProvider(token);
  if (error) return error;
  const body = await request.json().catch(() => ({}));
  const date = String(body.date || '');
  const unit = ['full', 'am', 'pm'].includes(body.unit) ? body.unit : 'full';
  const days = unit === 'full' ? 1 : 0.5;
  const reason = String(body.reason || '').trim().slice(0, 200) || null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return Response.json({ error: '日付を選んでください' }, { status: 400 });
  const today = jstToday();
  if (date < addDays(today, -31)) return Response.json({ error: '1か月以上前の日は申請できません。店舗に相談してください' }, { status: 400 });
  if (date > addDays(today, 366)) return Response.json({ error: '1年より先の日は申請できません' }, { status: 400 });

  const { grants, requests } = await load(staff);
  if (requests.some(r => r.date === date && (r.status === 'pending' || r.status === 'approved'))) {
    return Response.json({ error: 'この日はすでに申請しています' }, { status: 409 });
  }
  const sum = leaveSummary(grants, requests, today);
  if (sum.remaining - sum.pending < days) {
    return Response.json({ error: `有給の残りが足りません（残り${sum.remaining}日・承認待ち${sum.pending}日）` }, { status: 400 });
  }
  const { data, error: insErr } = await supabase.from('provider_paid_leave_requests')
    .insert({ provider_id: provider.id, staff_id: staff.id, date, unit, days, reason }).select().single();
  if (insErr) return Response.json({ error: insErr.message }, { status: 500 });

  // お店（オーナーのLINEと、勤怠の管理者のLINE）に知らせる
  try {
    const { data: admins } = await supabase.from('provider_staff').select('line_user_id').eq('provider_id', provider.id).eq('attendance_admin', true).not('line_user_id', 'is', null);
    const ids = [...new Set([provider.line_user_id, ...(admins || []).map(a => a.line_user_id)].filter(Boolean))];
    const text = `${staff.name}さんから有給の申請がありました。\n${date.slice(5).replace('-', '/')}（${LEAVE_UNIT_LABEL[unit]}）${reason ? `\n理由：${reason}` : ''}`;
    await Promise.all(ids.map(id => sendLinePushWithAction(id, text, { label: '承認・却下する', caption: '管理画面の「打刻・勤怠記録」で承認できます', uri: `${BASE}/provider/dashboard?tab=attendance` })));
  } catch { /* 通知に失敗しても申請は受け付ける */ }
  return Response.json(data);
}

export async function DELETE(request, { params }) {
  const { token } = await params;
  const { staff, error } = await staffAndProvider(token);
  if (error) return error;
  const id = new URL(request.url).searchParams.get('id');
  const { data: row } = await supabase.from('provider_paid_leave_requests').select('id, status').eq('id', id).eq('staff_id', staff.id).maybeSingle();
  if (!row) return Response.json({ error: '申請が見つかりません' }, { status: 404 });
  if (row.status !== 'pending') return Response.json({ error: '承認・却下された申請は取り消せません。店舗に相談してください' }, { status: 400 });
  await supabase.from('provider_paid_leave_requests').update({ status: 'cancelled' }).eq('id', id);
  return Response.json({ ok: true });
}
