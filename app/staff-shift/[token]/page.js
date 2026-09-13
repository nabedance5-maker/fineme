'use client';

import { useState, useEffect } from 'react';

// スタッフ本人が各自のスマホから出勤・休み希望を提出するページ（でお要望2026-09-13）。
// Finemeアカウント不要。provider_staff.shift_access_token（推測不可能なUUID）付きの
// このURLを店舗がLINE等で個別に送る想定。認証はこのトークンの知識のみに依存する。
export default function StaffShiftPage({ params }) {
  const token = params.token;
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ type: 'work', date: '', start_time: '', end_time: '', note: '' });
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/staff-shift/${token}`);
      if (!res.ok) { setError('リンクが無効です。店舗にご確認ください。'); setLoading(false); return; }
      setData(await res.json());
    } catch {
      setError('通信エラーが発生しました');
    }
    setLoading(false);
  }
  useEffect(() => { load(); }, [token]);

  async function submit(e) {
    e.preventDefault();
    if (!data?.period) return;
    if (!form.date) { alert('日付を選んでください'); return; }
    if (form.type === 'work' && (!form.start_time || !form.end_time)) { alert('開始・終了時刻を入力してください'); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/staff-shift/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period_id: data.period.id, date: form.date, type: form.type, start_time: form.start_time, end_time: form.end_time, note: form.note }),
      });
      if (res.ok) { setForm(f => ({ ...f, date: '', start_time: '', end_time: '', note: '' })); await load(); }
      else { const err = await res.json().catch(() => ({})); alert('エラー: ' + (err.error || '不明')); }
    } catch {
      alert('通信エラーが発生しました');
    }
    setSubmitting(false);
  }

  async function removeRequest(r) {
    if (!confirm('この希望を取り消しますか？')) return;
    const qs = new URLSearchParams({ period_id: data.period.id, date: r.date, type: r.type });
    const res = await fetch(`/api/staff-shift/${token}?${qs}`, { method: 'DELETE' });
    if (res.ok) load(); else alert('取り消しに失敗しました');
  }

  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(232,228,220,0.15)', background: 'rgba(255,255,255,0.05)', color: '#e8e4dc', boxSizing: 'border-box', fontSize: '15px' };
  const labelStyle = { fontSize: '12px', fontWeight: '700', color: 'rgba(232,228,220,0.75)', display: 'block', marginBottom: '4px' };

  if (loading) return <div style={{ padding: '60px 20px', textAlign: 'center', color: 'rgba(232,228,220,0.6)' }}>読み込み中…</div>;
  if (error || !data) return <div style={{ padding: '60px 20px', textAlign: 'center', color: 'rgba(232,228,220,0.6)' }}>{error || 'エラーが発生しました'}</div>;

  return (
    <div style={{ maxWidth: '480px', margin: '40px auto', padding: '0 20px 60px', color: '#e8e4dc' }}>
      <h1 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 4px' }}>{data.provider.name} シフト希望</h1>
      <p style={{ fontSize: '13px', color: 'rgba(232,228,220,0.6)', margin: '0 0 24px' }}>{data.staff.name}さん</p>

      {!data.period ? (
        <p style={{ fontSize: '14px', color: 'rgba(232,228,220,0.7)' }}>現在、希望を募集中の期間はありません。店舗からの案内をお待ちください。</p>
      ) : (
        <>
          <div style={{ background: 'rgba(10,15,30,0.5)', border: '1px solid rgba(232,228,220,0.15)', borderRadius: '14px', padding: '16px', marginBottom: '20px' }}>
            <p style={{ margin: 0, fontSize: '13px' }}>対象期間：{data.period.period_start} 〜 {data.period.period_end}</p>
            {data.period.request_deadline && <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#c9a84c', fontWeight: '700' }}>提出締切：{data.period.request_deadline}</p>}
          </div>

          <form onSubmit={submit} style={{ background: 'rgba(10,15,30,0.5)', border: '1px solid rgba(232,228,220,0.15)', borderRadius: '14px', padding: '20px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <button type="button" onClick={() => setForm(f => ({ ...f, type: 'work' }))} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', fontWeight: '700', fontSize: '14px', cursor: 'pointer', background: form.type === 'work' ? '#c9a84c' : 'rgba(232,228,220,0.1)', color: form.type === 'work' ? '#0a0f1e' : '#e8e4dc' }}>出勤したい</button>
              <button type="button" onClick={() => setForm(f => ({ ...f, type: 'off' }))} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', fontWeight: '700', fontSize: '14px', cursor: 'pointer', background: form.type === 'off' ? '#c9a84c' : 'rgba(232,228,220,0.1)', color: form.type === 'off' ? '#0a0f1e' : '#e8e4dc' }}>休みたい</button>
            </div>

            <label style={labelStyle}>日付</label>
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} min={data.period.period_start} max={data.period.period_end} style={{ ...inputStyle, marginBottom: '14px' }} />

            {form.type === 'work' && (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>開始</label>
                  <input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>終了</label>
                  <input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} style={inputStyle} />
                </div>
              </div>
            )}

            <label style={labelStyle}>メモ（任意）</label>
            <input type="text" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="例：午後だけ希望" style={{ ...inputStyle, marginBottom: '18px' }} />

            <button type="submit" disabled={submitting} style={{ width: '100%', padding: '13px', borderRadius: '12px', border: 'none', background: '#111', color: '#fff', fontWeight: '700', fontSize: '15px', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.5 : 1 }}>
              {submitting ? '送信中…' : 'この希望を提出する'}
            </button>
          </form>

          <h2 style={{ fontSize: '14px', fontWeight: '700', margin: '0 0 10px' }}>提出済みの希望</h2>
          {!data.requests.length ? (
            <p style={{ fontSize: '13px', color: 'rgba(232,228,220,0.5)' }}>まだ提出していません。</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {data.requests.slice().sort((a, b) => a.date.localeCompare(b.date)).map(r => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'rgba(10,15,30,0.5)', border: '1px solid rgba(232,228,220,0.15)', borderRadius: '10px', fontSize: '13px' }}>
                  <span style={{ flex: 1 }}>{r.date}　{r.type === 'work' ? `出勤 ${r.start_time}〜${r.end_time}` : '休み希望'}{r.note ? `（${r.note}）` : ''}</span>
                  <button type="button" onClick={() => removeRequest(r)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px' }}>取消</button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
