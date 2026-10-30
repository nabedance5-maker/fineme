// GET /api/cron/shift-auto-confirm
// Vercel Cron: 毎日21:00 UTC（6:00 JST）。お店が「◯日前になったら自動で確定」を設定していれば、
// 今日から◯日後までのまだ確定していない日を確定する（2026-10-30 渡邉要望：未確定のまま当日を迎えないように）。
// まだシフトが1つも無い日は、設定に応じて先に自動作成（lib/shift-generate-run.js）してから確定する。
// 確定したら、お店のメールとオーナーのLINEに知らせる。
import { Resend } from 'resend';
import { getSupabase } from '@/lib/supabase';
import { sendLinePush } from '@/lib/line-push';
import { jstToday } from '@/lib/shift-deadline';
import { contractActive } from '@/lib/provider-contract';
import { planAllows } from '@/lib/feature-flags';
import { confirmedDaysIn, entriesIn, datesBetween } from '@/lib/shift-store';
import { runShiftGenerate } from '@/lib/shift-generate-run';
import { providerRecipients } from '@/lib/provider-recipients';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.fineme.me';
const md = d => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;
const addDays = (d, n) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };

export async function GET(request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const db = getSupabase();
  const today = jstToday();
  const result = { providers: 0, confirmed_days: 0, generated: 0, errors: [] };

  const { data: rows } = await db.from('provider_shift_settings').select('provider_id, auto_confirm_days_before, auto_generate_before_confirm').not('auto_confirm_days_before', 'is', null);
  for (const row of rows || []) {
    try {
      const { data: provider } = await db.from('providers').select('id, name, email, notify_emails, line_user_id, plan, billing_status').eq('id', row.provider_id).single();
      if (!provider || !contractActive(provider) || !planAllows(provider, 'shift_management')) continue;
      const to = addDays(today, row.auto_confirm_days_before);
      const dates = datesBetween(today, to);
      const confirmed = await confirmedDaysIn(db, provider.id, today, to);
      const open = dates.filter(d => !confirmed.has(d));
      if (!open.length) continue;

      // まだシフトが1つも無い日は、先に自動で作る（お店がオフにしていなければ）
      let generated = null;
      if (row.auto_generate_before_confirm) {
        const entries = await entriesIn(db, provider.id, open[0], open[open.length - 1], 'date');
        const has = new Set(entries.map(e => e.date));
        const empty = open.filter(d => !has.has(d));
        if (empty.length) {
          generated = await runShiftGenerate(db, provider.id, empty);
          if (generated.error) { result.errors.push(`${provider.id}: ${generated.error}`); generated = null; }
          else result.generated += generated.createdCount || 0;
        }
      }

      const { error } = await db.from('provider_shift_confirmed_days').upsert(open.map(date => ({ provider_id: provider.id, date })), { onConflict: 'provider_id,date' });
      if (error) { result.errors.push(`${provider.id}: ${error.message}`); continue; }
      result.providers++;
      result.confirmed_days += open.length;

      const notes = (generated?.skipped || []).length;
      const lines = [
        `${md(open[0])}〜${md(open[open.length - 1])}のシフトを自動で確定しました（${open.length}日）。`,
        generated ? `シフトが無かった日は、先に自動で作りました（${generated.createdCount || 0}件）。${notes ? `入れられなかった人・日が${notes}件あります。` : ''}` : '',
        '確定したシフトは、予約の受付（スタッフの空き時間）と勤怠に使われます。直す時は管理画面のシフト管理から。',
      ].filter(Boolean);
      const url = `${BASE}/provider/dashboard?tab=shift`;
      if (provider.line_user_id) await sendLinePush(provider.line_user_id, `${lines.join('\n')}\n${url}`).catch(() => {});
      const to_ = providerRecipients(provider);
      if (process.env.RESEND_API_KEY && to_.length) {
        await new Resend(process.env.RESEND_API_KEY).emails.send({
          from: 'Fineme <noreply@fineme.me>', to: to_,
          subject: `【Fineme】${md(open[0])}〜${md(open[open.length - 1])}のシフトを自動で確定しました`,
          text: [`${provider.name} 様`, '', ...lines, '', url].join('\n'),
        }).catch(e => result.errors.push(`${provider.id} mail: ${e?.message}`));
      }
    } catch (e) {
      result.errors.push(`${row.provider_id}: ${e?.message || e}`);
    }
  }
  return Response.json(result);
}
