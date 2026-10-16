// POST /api/provider/shift-periods/[id]/send-links { staff_ids?: string[] }
// → この期間の希望の提出リンクを、LINE連携済みのスタッフへFineme公式LINEで送る（未提出の人だけ・指定があればその人だけ）。
// でお指摘（2026-10-16）：期間ごとの提出リンクを選んで送れず使えなかった。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { planLockedResponse } from '@/lib/plan-features';
import { sendLinePushWithAction } from '@/lib/line-push';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.fineme.me';

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id, name, plan').eq('email', user.email).single();
  return data || null;
}

const md = d => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;

async function __POST(request, { params }) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  { const locked = planLockedResponse(provider, 'shift_management'); if (locked) return locked; }

  const { id } = await params;
  const { data: period } = await supabase.from('provider_shift_periods').select('id, period_start, period_end, request_deadline, status').eq('id', id).eq('provider_id', provider.id).maybeSingle();
  if (!period) return Response.json({ error: '期間が見つかりません' }, { status: 404 });
  if (period.status !== 'collecting') return Response.json({ error: 'この期間は希望の募集を締め切っています' }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const [{ data: staff }, { data: subs }] = await Promise.all([
    supabase.from('provider_staff').select('id, name, line_user_id, shift_access_token').eq('provider_id', provider.id),
    supabase.from('provider_shift_submissions').select('staff_id').eq('period_id', period.id),
  ]);
  const submitted = new Set((subs || []).map(s => s.staff_id));
  const only = Array.isArray(body.staff_ids) && body.staff_ids.length ? new Set(body.staff_ids) : null;
  const targets = (staff || []).filter(s => (only ? only.has(s.id) : !submitted.has(s.id)));

  const sent = [];
  const skipped = [];
  for (const s of targets) {
    if (!s.line_user_id || !s.shift_access_token) { skipped.push(s.name); continue; }
    const text = `${provider.name}より：${md(period.period_start)}〜${md(period.period_end)}のシフト希望の提出をお願いします。${period.request_deadline ? `\n締切：${md(period.request_deadline)}` : ''}`;
    const r = await sendLinePushWithAction(s.line_user_id, text, { label: '希望を提出する', caption: '下のボタンから提出できます', uri: `${BASE}/staff-shift/${s.shift_access_token}?period=${period.id}` });
    if (r?.ok === false) skipped.push(s.name); else sent.push(s.name);
  }
  return Response.json({ sent, skipped });
}
export const POST = withAudit(__POST);
