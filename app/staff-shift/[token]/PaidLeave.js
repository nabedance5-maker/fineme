'use client';

// スタッフの有給申請（でお要望 2026-10-16）。シフト提出画面の下に出す。
// 店舗が勤怠機能を使っていない時は何も出さない。
import { useEffect, useState } from 'react';

const UNIT = { full: '1日', am: '午前半休', pm: '午後半休' };
const STATUS = { pending: '承認待ち', approved: '承認済み', rejected: '却下', cancelled: '取り消し' };
const STATUS_COLOR = { pending: '#c9a84c', approved: '#4ade80', rejected: '#f87171', cancelled: 'rgba(232,228,220,0.5)' };
const md = d => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;

export default function PaidLeave({ token, cardStyle, labelStyle, inputStyle }) {
  const [info, setInfo] = useState(null);
  const [hidden, setHidden] = useState(false);
  const [date, setDate] = useState('');
  const [unit, setUnit] = useState('full');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function load() {
    try {
      const res = await fetch(`/api/staff-shift/${token}/paid-leave`);
      if (!res.ok) { setHidden(true); return; }
      setInfo(await res.json());
    } catch { setHidden(true); }
  }
  useEffect(() => { load(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit() {
    if (!date) { setMsg('日付を選んでください'); return; }
    setBusy(true); setMsg('');
    const res = await fetch(`/api/staff-shift/${token}/paid-leave`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date, unit, reason }) });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setMsg(d.error || '申請できませんでした'); return; }
    setDate(''); setReason(''); setUnit('full');
    setMsg('申請しました。お店の承認をお待ちください');
    load();
  }
  async function cancel(id) {
    if (!confirm('この申請を取り消しますか？')) return;
    const res = await fetch(`/api/staff-shift/${token}/paid-leave?id=${id}`, { method: 'DELETE' });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { alert(d.error || '取り消せませんでした'); return; }
    load();
  }

  if (hidden || !info) return null;
  const s = info.summary;
  return (
    <section id="paid-leave" style={{ ...cardStyle, marginTop: '24px' }}>
      <h2 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 8px' }}>有給休暇</h2>
      {info.has_grant ? (
        <p style={{ margin: '0 0 4px', fontSize: '14px' }}>残り <b style={{ fontSize: '20px', color: '#c9a84c' }}>{s.remaining}</b> 日{s.pending ? <span style={{ fontSize: '12px', color: 'rgba(232,228,220,0.7)' }}>（承認待ち {s.pending}日）</span> : null}</p>
      ) : (
        <p style={{ margin: '0 0 4px', fontSize: '13px', color: 'rgba(232,228,220,0.7)' }}>まだ有給が付与されていません。付与されると、ここから申請できます。</p>
      )}
      {s.obligation && s.obligation.need > 0 && (
        <p style={{ margin: '0 0 8px', fontSize: '12px', color: 'rgba(232,228,220,0.75)', lineHeight: 1.6 }}>{s.obligation.deadline.replace(/-/g, '/')}までに、あと{s.obligation.need}日取得してください（法律で年5日の取得が決まっています）。</p>
      )}

      {info.has_grant && (
        <div style={{ marginTop: '10px' }}>
          <label style={labelStyle}>休みたい日</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...inputStyle, width: '100%', marginBottom: '10px' }} />
          <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
            {Object.entries(UNIT).map(([k, v]) => (
              <button key={k} type="button" onClick={() => setUnit(k)} style={{ flex: 1, padding: '9px 6px', borderRadius: '10px', border: 'none', fontWeight: 700, fontSize: '13px', cursor: 'pointer', background: unit === k ? '#c9a84c' : 'rgba(232,228,220,0.1)', color: unit === k ? '#0a0f1e' : '#e8e4dc' }}>{v}</button>
            ))}
          </div>
          <label style={labelStyle}>理由（任意）</label>
          <input type="text" value={reason} maxLength={200} onChange={e => setReason(e.target.value)} placeholder="例：私用のため" style={{ ...inputStyle, width: '100%', marginBottom: '10px' }} />
          <button type="button" disabled={busy || !date} onClick={submit} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: '#c9a84c', color: '#0a0f1e', fontWeight: 800, fontSize: '14px', cursor: 'pointer', opacity: busy || !date ? 0.5 : 1 }}>{busy ? '申請中…' : '有給を申請する'}</button>
          {msg && <p style={{ margin: '8px 0 0', fontSize: '12.5px', color: msg.startsWith('申請しました') ? '#4ade80' : '#f87171' }}>{msg}</p>}
        </div>
      )}

      {info.requests.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <p style={{ margin: '0 0 6px', fontSize: '12px', fontWeight: 700, color: 'rgba(232,228,220,0.6)' }}>申請の一覧</p>
          {info.requests.map(r => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderTop: '1px solid rgba(232,228,220,0.1)', fontSize: '13px' }}>
              <span style={{ flex: 1 }}>{md(r.date)}（{UNIT[r.unit]}）<span style={{ marginLeft: '6px', fontWeight: 700, color: STATUS_COLOR[r.status] }}>{STATUS[r.status]}</span>{r.decision_note && <span style={{ display: 'block', fontSize: '11.5px', color: 'rgba(232,228,220,0.6)' }}>{r.decision_note}</span>}</span>
              {r.status === 'pending' && <button type="button" onClick={() => cancel(r.id)} style={{ padding: '5px 10px', borderRadius: '8px', border: '1px solid rgba(248,113,113,0.4)', background: 'none', color: '#f87171', fontSize: '12px', cursor: 'pointer' }}>取り消す</button>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
