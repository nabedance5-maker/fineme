// POST /api/provider/shift-submissions/send-links { window?: 'YYYY-MM-DD', staff_ids?: string[] }
// → シフト希望の提出リンクを、LINE連携済みのスタッフへFineme公式LINEで送る（未提出の人だけ・指定があればその人だけ）。
// 提出リンクはスタッフごとに1つで、期間に関係なく使える。window（提出ルールで区切った期間の開始日）を
// 省くと、締切がまだ来ていない直近の期間を案内する（でお指摘 2026-10-16：期間を先に作らせない）。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { planLockedResponse } from '@/lib/plan-features';
import { sendLinePushWithAction } from '@/lib/line-push';
import { jstToday } from '@/lib/shift-deadline';
import { loadCycle, upcomingWindows } from '@/lib/shift-windows';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.fineme.me';

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id, name, plan').eq('email', user.email).single();
  return data || null;
}

const md = d => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;

async function __POST(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  { const locked = planLockedResponse(provider, 'shift_management'); if (locked) return locked; }

  const body = await request.json().catch(() => ({}));
  const { cycle } = await loadCycle(supabase, provider.id);
  const windows = upcomingWindows(cycle);
  const today = jstToday();
  const win = windows.find(w => w.key === body.window) || windows.find(w => w.deadline >= today) || windows[0];

  const [{ data: staff }, { data: subs }] = await Promise.all([
    supabase.from('provider_staff').select('id, name, line_user_id, shift_access_token').eq('provider_id', provider.id),
    supabase.from('provider_shift_window_submissions').select('staff_id').eq('provider_id', provider.id).eq('window_start', win.start),
  ]);
  const submitted = new Set((subs || []).map(s => s.staff_id));
  const only = Array.isArray(body.staff_ids) && body.staff_ids.length ? new Set(body.staff_ids) : null;
  const targets = (staff || []).filter(s => (only ? only.has(s.id) : !submitted.has(s.id)));

  const sent = [];
  const skipped = [];
  for (const s of targets) {
    if (!s.line_user_id || !s.shift_access_token) { skipped.push(s.name); continue; }
    const text = `${provider.name}より：${win.label}（${md(win.start)}〜${md(win.end)}）のシフト希望の提出をお願いします。\n締切：${md(win.deadline)}`;
    const r = await sendLinePushWithAction(s.line_user_id, text, { label: '希望を提出する', caption: '下のボタンから提出できます', uri: `${BASE}/staff-shift/${s.shift_access_token}?period=${win.key}` });
    if (r?.ok === false) skipped.push(s.name); else sent.push(s.name);
  }
  return Response.json({ window: win, sent, skipped });
}
export const POST = withAudit(__POST);
