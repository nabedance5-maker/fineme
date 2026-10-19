'use client';
// 会員プランの休会・プラン変更・退会をマイページから申請する（でお要望 2026-10-19：hacomono差分 #4）。
// 申請は店舗が承認した時に反映される。ここでは契約を直接変えない。
import { useState } from 'react';

const KIND_LABEL = { pause: '休会', resume: '休会から再開', plan_change: 'プラン変更', cancel: '退会', cancel_undo: '退会の取り消し' };
const STATUS_LABEL = { requested: '店舗が確認中', applied: '反映済み', declined: 'お断り', withdrawn: '取り下げ' };
const ymd = d => (d ? String(d).slice(0, 10).replace(/-/g, '/') : '');
const tomorrow = () => { const t = new Date(Date.now() + 9 * 3600000); t.setUTCDate(t.getUTCDate() + 1); return t.toISOString().slice(0, 10); };

export default function RequestPanel({ detail, token, onChanged }) {
  const [kind, setKind] = useState(null);
  const [planId, setPlanId] = useState('');
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState('');

  const pending = (detail.changes || []).find(c => c.status === 'requested');
  const otherPlans = (detail.plans || []).filter(p => p.id !== detail.plan_id);
  const history = (detail.changes || []).filter(c => c.status !== 'requested');

  async function post(body) {
    setSending(true); setMsg('');
    try {
      const res = await fetch(`/api/me/memberships/${detail.id}/request`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg(d.error || '送れませんでした'); return; }
      setKind(null); setReason(''); setDate(''); setPlanId('');
      setMsg(body.action === 'withdraw' ? '申請を取り下げました' : '申請を送りました。店舗が確認するとLINEでお知らせします');
      onChanged();
    } finally { setSending(false); }
  }

  function submit() {
    if (kind === 'plan_change' && !planId) { setMsg('変更先のプランを選んでください'); return; }
    post({ kind, to_plan_id: planId || undefined, pause_until: kind === 'pause' ? date || null : undefined, effective_date: kind === 'cancel' ? date || null : undefined, reason });
  }

  return (
    <div className="mrq">
      <p className="mrq-title">会員プランの変更・休会・退会</p>
      <div className="mrq-state">
        <span>状態：{detail.paused_at ? `休会中${detail.pause_until ? `（${ymd(detail.pause_until)}に再開）` : ''}` : '通常'}{detail.cancel_at ? `・${ymd(detail.cancel_at)}で退会予定` : ''}</span>
      </div>

      {pending ? (
        <div className="mrq-box">
          <p>「{KIND_LABEL[pending.kind]}」の申請を店舗が確認中です（{ymd(pending.created_at)}）。</p>
          {pending.kind === 'plan_change' && <p>変更先：{pending.to_plan_name}（次回の引き落としから）</p>}
          {pending.kind === 'cancel' && <p>{pending.effective_date ? `${ymd(pending.effective_date)}で退会` : '今の支払い期間の終わりで退会'}</p>}
          <button type="button" className="mrq-btn mrq-ghost" disabled={sending} onClick={() => post({ action: 'withdraw', request_id: pending.id })}>申請を取り下げる</button>
        </div>
      ) : !detail.allow_online_requests ? (
        <p className="mrq-note">この店舗では、休会・退会などのお手続きを店頭で受け付けています。店舗にお問い合わせください。</p>
      ) : (
        <>
          <div className="mrq-actions">
            {detail.paused_at
              ? <button type="button" className="mrq-btn mrq-ghost" onClick={() => setKind('resume')}>休会から再開したい</button>
              : !detail.cancel_at && <button type="button" className="mrq-btn mrq-ghost" onClick={() => setKind('pause')}>休会したい</button>}
            {otherPlans.length > 0 && !detail.cancel_at && <button type="button" className="mrq-btn mrq-ghost" onClick={() => setKind('plan_change')}>プランを変えたい</button>}
            {!detail.cancel_at && <button type="button" className="mrq-btn mrq-ghost" onClick={() => setKind('cancel')}>退会したい</button>}
          </div>
          {kind && (
            <div className="mrq-box">
              <p className="mrq-strong">{KIND_LABEL[kind]}を申請する</p>
              {kind === 'pause' && <><p>休会中は月会費がかかりません。再開日を決めている場合は選んでください。</p><label>再開の希望日（任意）<input type="date" min={tomorrow()} value={date} onChange={e => setDate(e.target.value)} /></label></>}
              {kind === 'plan_change' && <label>変更先のプラン<select value={planId} onChange={e => setPlanId(e.target.value)}><option value="">選んでください</option>{otherPlans.map(p => <option key={p.id} value={p.id}>{p.name}（月額¥{Number(p.monthly_price).toLocaleString()}）</option>)}</select><span className="mrq-hint">次回の引き落としから新しい月額になります。</span></label>}
              {kind === 'cancel' && <><p>日付を選ばない場合は、今の支払い期間の終わりで退会になります（すでにお支払いした期間は通えます）。</p><label>退会の希望日（任意）<input type="date" min={tomorrow()} value={date} onChange={e => setDate(e.target.value)} /></label></>}
              {kind !== 'resume' && <label>理由・お店へのひとこと（任意）<input maxLength={300} value={reason} onChange={e => setReason(e.target.value)} /></label>}
              <div className="mrq-actions">
                <button type="button" className="mrq-btn" disabled={sending} onClick={submit}>{sending ? '送信中…' : '申請を送る'}</button>
                <button type="button" className="mrq-btn mrq-ghost" onClick={() => { setKind(null); setMsg(''); }}>やめる</button>
              </div>
            </div>
          )}
        </>
      )}
      {msg && <p className="mrq-msg">{msg}</p>}

      {history.length > 0 && (
        <div className="mrq-hist">
          {history.map(c => (
            <p key={c.id}>{ymd(c.created_at)}　{KIND_LABEL[c.kind]}{c.kind === 'plan_change' && c.to_plan_name ? `（${c.to_plan_name}へ）` : ''}・{STATUS_LABEL[c.status]}{c.status === 'declined' && c.store_note ? `：${c.store_note}` : ''}</p>
          ))}
        </div>
      )}

      <style>{`
        .mrq { margin-top: 14px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.15); display: grid; gap: 10px; color: #fff; }
        .mrq p { margin: 0; }
        .mrq-title { font-weight: 800; font-size: 14px; }
        .mrq-state { font-size: 13px; }
        .mrq-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .mrq-btn { background: #fff; color: #111; border: 1px solid #fff; border-radius: 10px; padding: 9px 16px; font-size: 13px; font-weight: 800; cursor: pointer; }
        .mrq-btn:disabled { opacity: 0.6; cursor: default; }
        .mrq-ghost { background: transparent; color: #fff; border-color: rgba(255,255,255,0.45); }
        .mrq-box { display: grid; gap: 10px; padding: 14px; border: 1px solid rgba(255,255,255,0.25); border-radius: 12px; font-size: 13px; line-height: 1.7; }
        .mrq-strong { font-weight: 800; }
        .mrq-box label { display: grid; gap: 4px; font-size: 12.5px; font-weight: 700; }
        .mrq-box input, .mrq-box select { padding: 9px 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.3); background: #0d1117; color: #fff; font-size: 14px; font-weight: 400; color-scheme: dark; }
        .mrq-hint { font-weight: 400; font-size: 12px; }
        .mrq-note, .mrq-msg { font-size: 13px; }
        .mrq-msg { font-weight: 700; }
        .mrq-hist { display: grid; gap: 4px; font-size: 12.5px; }
      `}</style>
    </div>
  );
}
