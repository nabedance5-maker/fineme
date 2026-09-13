'use client';

import { useState, useEffect, useMemo } from 'react';

// スタッフ本人が各自のスマホから出勤・休み希望を提出するページ（でお要望2026-09-13）。
// Finemeアカウント不要。provider_staff.shift_access_token（推測不可能なUUID）付きの
// このURLを店舗がLINE等で個別に送る想定。認証はこのトークンの知識のみに依存する。
//
// でお指摘2026-09-14：日付をtype="date"で1件ずつ手打ちするのは時間がかかる。カレンダー
// をタップして選び、時間帯もプリセットからすぐ選べるように、直感的で短時間な操作に
// 作り直した（旧実装のフォーム入力は撤去）。

const WEEKDAY_JA = ['日', '月', '火', '水', '木', '金', '土'];

const TIME_OPTIONS = (() => {
  const out = [];
  for (let m = 8 * 60; m <= 23 * 60; m += 30) {
    const h = String(Math.floor(m / 60)).padStart(2, '0');
    const mm = String(m % 60).padStart(2, '0');
    out.push(`${h}:${mm}`);
  }
  return out;
})();

const PRESETS = [
  { label: '午前（10-13時）', start: '10:00', end: '13:00' },
  { label: '午後（13-18時）', start: '13:00', end: '18:00' },
  { label: '夜（18-22時）', start: '18:00', end: '22:00' },
  { label: '終日（10-22時）', start: '10:00', end: '22:00' },
];

function monthsInRange(start, end) {
  const months = [];
  let cur = new Date(start + 'T00:00:00Z');
  cur = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth(), 1));
  const last = new Date(end + 'T00:00:00Z');
  while (cur <= last) {
    months.push({ year: cur.getUTCFullYear(), month: cur.getUTCMonth() });
    cur = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth() + 1, 1));
  }
  return months;
}
function buildMonthCells(year, month) {
  const first = new Date(Date.UTC(year, month, 1));
  const startWeekday = first.getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  return cells;
}

export default function StaffShiftPage({ params }) {
  const token = params.token;
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [editType, setEditType] = useState('work');
  const [editStart, setEditStart] = useState('10:00');
  const [editEnd, setEditEnd] = useState('18:00');
  const [editNote, setEditNote] = useState('');
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

  const requestsByDate = useMemo(() => {
    const map = {};
    (data?.requests || []).forEach(r => {
      // 同じ日にwork/offが両方あるのは本来起きない想定だが、あれば休み希望を優先表示
      if (!map[r.date] || r.type === 'off') map[r.date] = r;
    });
    return map;
  }, [data]);

  function openDay(date) {
    if (!data?.period) return;
    if (date < data.period.period_start || date > data.period.period_end) return;
    setSelectedDate(date);
    const existing = requestsByDate[date];
    if (existing) {
      setEditType(existing.type);
      setEditStart(existing.start_time || '10:00');
      setEditEnd(existing.end_time || '18:00');
      setEditNote(existing.note || '');
    } else {
      setEditType('work');
      setEditStart('10:00');
      setEditEnd('18:00');
      setEditNote('');
    }
  }

  async function submitDay(type, start, end) {
    if (!selectedDate || !data?.period) return;
    if (type === 'work' && (!start || !end)) { alert('開始・終了時刻を選んでください'); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/staff-shift/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period_id: data.period.id, date: selectedDate, type, start_time: start, end_time: end, note: editNote }),
      });
      if (res.ok) { await load(); }
      else { const err = await res.json().catch(() => ({})); alert('エラー: ' + (err.error || '不明')); }
    } catch {
      alert('通信エラーが発生しました');
    }
    setSubmitting(false);
  }

  async function clearDay() {
    if (!selectedDate || !data?.period) return;
    const existing = requestsByDate[selectedDate];
    if (!existing) { setSelectedDate(null); return; }
    setSubmitting(true);
    const qs = new URLSearchParams({ period_id: data.period.id, date: existing.date, type: existing.type });
    const res = await fetch(`/api/staff-shift/${token}?${qs}`, { method: 'DELETE' });
    setSubmitting(false);
    if (res.ok) { setSelectedDate(null); load(); } else alert('取り消しに失敗しました');
  }

  const cardStyle = { background: 'rgba(10,15,30,0.5)', border: '1px solid rgba(232,228,220,0.15)', borderRadius: '14px', padding: '18px' };
  const labelStyle = { fontSize: '12px', fontWeight: '700', color: 'rgba(232,228,220,0.75)', display: 'block', marginBottom: '4px' };
  const selectStyle = { padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(232,228,220,0.15)', background: 'rgba(255,255,255,0.05)', color: '#e8e4dc', boxSizing: 'border-box', fontSize: '15px' };

  if (loading) return <div style={{ padding: '60px 20px', textAlign: 'center', color: 'rgba(232,228,220,0.6)' }}>読み込み中…</div>;
  if (error || !data) return <div style={{ padding: '60px 20px', textAlign: 'center', color: 'rgba(232,228,220,0.6)' }}>{error || 'エラーが発生しました'}</div>;

  return (
    <div style={{ maxWidth: '480px', margin: '40px auto', padding: '0 20px 60px', color: '#e8e4dc' }}>
      <h1 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 4px' }}>{data.provider.name} シフト希望</h1>
      <p style={{ fontSize: '13px', color: 'rgba(232,228,220,0.6)', margin: '0 0 20px' }}>{data.staff.name}さん</p>

      {!data.period ? (
        <p style={{ fontSize: '14px', color: 'rgba(232,228,220,0.7)' }}>現在、希望を募集中の期間はありません。店舗からの案内をお待ちください。</p>
      ) : (
        <>
          <div style={{ ...cardStyle, marginBottom: '16px' }}>
            <p style={{ margin: 0, fontSize: '13px' }}>対象期間：{data.period.period_start} 〜 {data.period.period_end}</p>
            {data.period.request_deadline && <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#c9a84c', fontWeight: '700' }}>提出締切：{data.period.request_deadline}</p>}
            <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'rgba(232,228,220,0.6)' }}>日付をタップして、出勤・休みの希望を選んでください。<span style={{ color: '#60a5fa' }}>■</span> 出勤希望　<span style={{ color: '#f87171' }}>■</span> 休み希望</p>
          </div>

          {monthsInRange(data.period.period_start, data.period.period_end).map(({ year, month }) => (
            <div key={`${year}-${month}`} style={{ ...cardStyle, marginBottom: '16px' }}>
              <p style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: '700' }}>{year}年{month + 1}月</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '4px', marginBottom: '4px' }}>
                {WEEKDAY_JA.map(w => <div key={w} style={{ textAlign: 'center', fontSize: '11px', color: 'rgba(232,228,220,0.4)' }}>{w}</div>)}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '4px' }}>
                {buildMonthCells(year, month).map((date, i) => {
                  if (!date) return <div key={i} />;
                  const inRange = date >= data.period.period_start && date <= data.period.period_end;
                  const req = requestsByDate[date];
                  const isSelected = date === selectedDate;
                  const day = Number(date.slice(-2));
                  return (
                    <button
                      key={date}
                      type="button"
                      disabled={!inRange}
                      onClick={() => openDay(date)}
                      style={{
                        aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        borderRadius: '8px', border: isSelected ? '2px solid #c9a84c' : '1px solid rgba(232,228,220,0.1)',
                        background: !inRange ? 'transparent' : req?.type === 'off' ? 'rgba(248,113,113,0.18)' : req?.type === 'work' ? 'rgba(96,165,250,0.18)' : 'rgba(255,255,255,0.03)',
                        color: !inRange ? 'rgba(232,228,220,0.2)' : '#e8e4dc', cursor: inRange ? 'pointer' : 'default', fontSize: '13px', padding: 0,
                      }}
                    >
                      <span>{day}</span>
                      {req && <span style={{ fontSize: '8px', marginTop: '1px' }}>{req.type === 'off' ? '休' : req.start_time?.slice(0, 5)}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {selectedDate && (
            <div style={{ ...cardStyle, marginBottom: '20px', border: '1.5px solid #c9a84c' }}>
              <p style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: '700' }}>{selectedDate}</p>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                <button type="button" onClick={() => setEditType('work')} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', fontWeight: '700', fontSize: '14px', cursor: 'pointer', background: editType === 'work' ? '#60a5fa' : 'rgba(232,228,220,0.1)', color: editType === 'work' ? '#0a0f1e' : '#e8e4dc' }}>出勤したい</button>
                <button type="button" onClick={() => setEditType('off')} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', fontWeight: '700', fontSize: '14px', cursor: 'pointer', background: editType === 'off' ? '#f87171' : 'rgba(232,228,220,0.1)', color: editType === 'off' ? '#0a0f1e' : '#e8e4dc' }}>休みたい</button>
              </div>

              {editType === 'work' && (
                <>
                  <label style={labelStyle}>よく使う時間帯</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                    {PRESETS.map(p => (
                      <button key={p.label} type="button" onClick={() => { setEditStart(p.start); setEditEnd(p.end); }}
                        style={{ padding: '7px 10px', borderRadius: '8px', border: '1px solid rgba(232,228,220,0.2)', background: editStart === p.start && editEnd === p.end ? 'rgba(201,168,76,0.25)' : 'rgba(255,255,255,0.05)', color: '#e8e4dc', fontSize: '12px', cursor: 'pointer' }}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>開始</label>
                      <select value={editStart} onChange={e => setEditStart(e.target.value)} style={{ ...selectStyle, width: '100%' }}>
                        {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>終了</label>
                      <select value={editEnd} onChange={e => setEditEnd(e.target.value)} style={{ ...selectStyle, width: '100%' }}>
                        {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                </>
              )}

              <label style={labelStyle}>メモ（任意）</label>
              <input type="text" value={editNote} onChange={e => setEditNote(e.target.value)} placeholder="例：午後だけ希望" style={{ ...selectStyle, width: '100%', marginBottom: '14px' }} />

              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" disabled={submitting} onClick={() => submitDay(editType, editStart, editEnd)} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: '#111', color: '#fff', fontWeight: '700', fontSize: '14px', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.5 : 1 }}>
                  {submitting ? '送信中…' : 'この内容で提出'}
                </button>
                {requestsByDate[selectedDate] && (
                  <button type="button" disabled={submitting} onClick={clearDay} style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(248,113,113,0.4)', background: 'none', color: '#f87171', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
                    取消
                  </button>
                )}
              </div>
            </div>
          )}

          <h2 style={{ fontSize: '13px', fontWeight: '700', margin: '0 0 10px', color: 'rgba(232,228,220,0.6)' }}>提出済みの希望一覧</h2>
          {!data.requests.length ? (
            <p style={{ fontSize: '13px', color: 'rgba(232,228,220,0.5)' }}>まだ提出していません。</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {data.requests.slice().sort((a, b) => a.date.localeCompare(b.date)).map(r => (
                <div key={r.id} onClick={() => openDay(r.date)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: 'rgba(10,15,30,0.4)', border: '1px solid rgba(232,228,220,0.1)', borderRadius: '8px', fontSize: '12.5px', cursor: 'pointer' }}>
                  <span style={{ flex: 1 }}>{r.date}　{r.type === 'work' ? `出勤 ${r.start_time}〜${r.end_time}` : '休み希望'}{r.note ? `（${r.note}）` : ''}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
