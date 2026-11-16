// GET /api/cron/monitor-expiry
// 無料モニター店舗（2026-11-16）の期限を毎日見る。Vercel Cron（毎日 0:10 UTC = 9:10 JST）。
// - 期限の14日前・3日前：お店に「◯日で終わる・自動で課金はされない・続けるなら終了後に申し込み」をメールで知らせる
// - 期限を過ぎたら：billing_status を null（未契約）に戻し、契約が理由で公開ページを閉じる。お店と運営に知らせる
// 自動で有料プランに切り替えることはしない（告知「自動で課金されることはない」どおり）。
import { getSupabase } from '@/lib/supabase';
import { syncContractVisibility } from '@/lib/provider-contract';
import { sendBroadcastEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

const OWNER_EMAIL = process.env.OWNER_EMAIL || 'h.watanabe@fineme.me';
const DASHBOARD_URL = 'https://www.fineme.me/provider/dashboard';
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dateLabel = iso => new Date(iso).toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: 'long', day: 'numeric' });

function storeHtml(name, paragraphs) {
  return `<div style="font-family:sans-serif;line-height:1.9;color:#1a1a1a;font-size:15px">
    <p>${esc(name)} 様</p>
    ${paragraphs.map(p => `<p>${p}</p>`).join('')}
    <p><a href="${DASHBOARD_URL}" style="color:#1f2a44;font-weight:700">管理画面を開く</a></p>
    <p style="font-size:13px;color:#666">Fineme 運営</p>
  </div>`;
}

export async function GET(request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getSupabase();
  const now = Date.now();
  const { data: rows, error } = await db.from('providers')
    .select('id, name, email, monitor_until, monitor_notified_14_at, monitor_notified_3_at')
    .eq('billing_status', 'monitor');
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const ended = [], reminded = [], failed = [];
  for (const p of rows || []) {
    if (!p.monitor_until) continue;
    const until = new Date(p.monitor_until).getTime();
    const daysLeft = Math.ceil((until - now) / 86400000);
    try {
      if (until <= now) {
        // 期限切れ：未契約に戻す（plan は B のまま。申し込み画面でスタンダードが選ばれた状態になる）
        const { error: upErr } = await db.from('providers')
          .update({ billing_status: null, monitor_ended_at: new Date().toISOString() })
          .eq('id', p.id).eq('billing_status', 'monitor');
        if (upErr) throw upErr;
        await syncContractVisibility(db, p.id, null);
        ended.push(p.name);
        if (p.email) {
          await sendBroadcastEmail({
            to: p.email,
            subject: '【Fineme】無料モニター期間が終わりました',
            html: storeHtml(p.name, [
              '無料モニターへのご協力、ありがとうございました。モニター期間が終わりましたので、管理画面の機能とお店のページの公開を止めました。',
              '<b>自動で課金はされていません。</b>お客様・予約などのデータはそのまま残っています。',
              '続けてお使いになる場合は、管理画面を開くと出てくる画面からプランをお申し込みください。お申し込みの日から、また使えるようになります。',
            ]),
          }).catch(e => console.error('[monitor-expiry] mail end', e.message));
        }
        continue;
      }
      const due = daysLeft <= 3 && !p.monitor_notified_3_at ? '3' : daysLeft <= 14 && !p.monitor_notified_14_at ? '14' : null;
      if (!due) continue;
      if (p.email) {
        await sendBroadcastEmail({
          to: p.email,
          subject: `【Fineme】無料モニター期間は${dateLabel(p.monitor_until)}までです`,
          html: storeHtml(p.name, [
            `無料モニター期間は<b>${esc(dateLabel(p.monitor_until))}まで</b>です（あと${daysLeft}日）。`,
            '期間が終わると、管理画面の機能とお店のページの公開が止まります。<b>自動で課金されることはありません。</b>',
            '続けてお使いになる場合は、期間が終わったあとに管理画面からプランをお申し込みください。ご不明な点は、このメールにご返信ください。',
          ]),
        });
      }
      // 3日前の知らせを出したら、14日前の分も出したことにする（途中から始めた時に2通続けて送らない）
      const stamp = new Date().toISOString();
      await db.from('providers').update(due === '3' ? { monitor_notified_3_at: stamp, monitor_notified_14_at: p.monitor_notified_14_at || stamp } : { monitor_notified_14_at: stamp }).eq('id', p.id);
      reminded.push(`${p.name}（${due}日前）`);
    } catch (e) {
      console.error('[monitor-expiry]', p.id, e.message);
      failed.push(p.name);
    }
  }

  if (ended.length || reminded.length || failed.length) {
    const li = (title, list) => list.length ? `<p><b>${title}</b></p><ul>${list.map(n => `<li>${esc(n)}</li>`).join('')}</ul>` : '';
    await sendBroadcastEmail({
      to: OWNER_EMAIL,
      subject: `【Fineme運営】無料モニター：終了${ended.length}件・お知らせ${reminded.length}件${failed.length ? `・失敗${failed.length}件` : ''}`,
      html: `<div style="font-family:sans-serif;line-height:1.8;color:#1a1a1a">
        ${li('期間が終わり、未契約に戻したお店', ended)}
        ${li('終了前のお知らせを送ったお店', reminded)}
        ${li('処理に失敗したお店（翌日もう一度試します）', failed)}
        <p style="font-size:13px;color:#666">続けるかどうかのご相談は、月1回のヒアリングの中でどうぞ。お店の一覧は管理画面の「契約者」で「無料モニター」に絞り込めます。</p>
      </div>`,
    }).catch(e => console.error('[monitor-expiry] owner mail', e.message));
  }

  return Response.json({ checked: (rows || []).length, ended: ended.length, reminded: reminded.length, failed: failed.length });
}
