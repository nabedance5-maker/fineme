// スタッフがシフト希望の提出を完了した時に、店舗が選んだ先へ知らせる（でお要望2026-10-07）。
// 通知先：店舗のメール・追加のメールアドレス・オーナー（店舗アカウント）のLINE・指定したスタッフ
// （店長・シフト作成者など）のLINE。未設定の店舗は「店舗のメール＋オーナーのLINE」。
import { sendLinePush } from './line-push.js';
import { sendShiftSubmittedEmail } from './email.js';

export const DEFAULT_SUBMIT_NOTIFY = { store_email: true, owner_line: true, extra_emails: [], staff_ids: [] };

export function normalizeSubmitNotify(v) {
  const emails = (Array.isArray(v?.extra_emails) ? v.extra_emails : String(v?.extra_emails || '').split(/[,、\s]+/))
    .map(s => String(s).trim()).filter(s => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s)).slice(0, 10);
  const staffIds = (Array.isArray(v?.staff_ids) ? v.staff_ids : []).filter(id => /^[0-9a-f-]{36}$/i.test(id)).slice(0, 20);
  return {
    store_email: v?.store_email === undefined ? DEFAULT_SUBMIT_NOTIFY.store_email : !!v.store_email,
    owner_line: v?.owner_line === undefined ? DEFAULT_SUBMIT_NOTIFY.owner_line : !!v.owner_line,
    extra_emails: [...new Set(emails)],
    staff_ids: [...new Set(staffIds)],
  };
}

export async function notifyShiftSubmitted(db, { providerId, period, staffId }) {
  const [{ data: provider }, { data: settings }, { data: allStaff }, { data: subs }] = await Promise.all([
    db.from('providers').select('name, email, line_user_id').eq('id', providerId).single(),
    db.from('provider_shift_settings').select('submit_notify').eq('provider_id', providerId).maybeSingle(),
    db.from('provider_staff').select('id, name, line_user_id, shift_access_token').eq('provider_id', providerId),
    db.from('provider_shift_submissions').select('staff_id').eq('period_id', period.id),
  ]);
  const cfg = normalizeSubmitNotify(settings?.submit_notify);
  const staff = allStaff || [];
  const me = staff.find(s => s.id === staffId);
  const targets = staff.filter(s => s.shift_access_token);
  const done = new Set((subs || []).map(s => s.staff_id));
  const missing = targets.filter(s => !done.has(s.id)).map(s => s.name);
  const lines = [
    `【Fineme】${me?.name || 'スタッフ'}さんがシフト希望を提出しました`,
    `対象期間：${period.period_start} 〜 ${period.period_end}`,
    `提出：${targets.filter(s => done.has(s.id)).length}/${targets.length}人`,
    missing.length ? `未提出：${missing.join('、')}` : '全員の提出がそろいました。自動作成に進めます。',
    'https://www.fineme.me/provider/dashboard?tab=shift',
  ];
  const text = lines.join('\n');
  const jobs = [];
  const lineIds = new Set();
  if (cfg.owner_line && provider?.line_user_id) lineIds.add(provider.line_user_id);
  cfg.staff_ids.forEach(id => { const s = staff.find(x => x.id === id); if (s?.line_user_id) lineIds.add(s.line_user_id); });
  lineIds.forEach(id => jobs.push(sendLinePush(id, text)));
  const emails = new Set(cfg.extra_emails);
  if (cfg.store_email && provider?.email) emails.add(provider.email);
  if (emails.size) jobs.push(sendShiftSubmittedEmail({ to: [...emails], providerName: provider?.name, lines }));
  const results = await Promise.allSettled(jobs);
  return { sent: results.filter(r => r.status === 'fulfilled').length, failed: results.filter(r => r.status === 'rejected').length };
}
