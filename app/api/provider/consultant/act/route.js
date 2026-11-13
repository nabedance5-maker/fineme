// POST /api/provider/consultant/act { kind: 'shift' | 'visit', from?, to?, date? } → AIコンサルが用意した作業を、店舗が「実行」を押した時に行う
// （2026-11-12 渡邉要望）。対象はここでもう一度サーバーで計算し直す（画面から届いた一覧は使わない）。お店のオーナーのみ。lib/consultant-actions.js
export const dynamic = 'force-dynamic';
export const maxDuration = 120;
import { authProvider, supabase, consultantEnabled } from '../_lib';
import { withAudit } from '@/lib/activity-log';
import { runShiftAction, runVisitAction } from '@/lib/consultant-actions';

async function __POST(request) {
  const provider = await authProvider(request);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!consultantEnabled(provider)) return Response.json({ error: 'AI専属コンサルはオフになっています' }, { status: 403 });
  const b = await request.json().catch(() => ({}));
  let r;
  if (b.kind === 'shift') r = await runShiftAction(supabase, provider, { from: b.from, to: b.to });
  else if (b.kind === 'visit') r = await runVisitAction(supabase, provider, { date: b.date });
  else return Response.json({ error: '不明な作業です' }, { status: 400 });
  if (r.error) return Response.json({ error: r.error }, { status: 400 });
  return Response.json(r);
}
export const POST = withAudit(__POST);
