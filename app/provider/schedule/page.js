'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = typeof window !== 'undefined'
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  : null;

const WEEK = ['日', '月', '火', '水', '木', '金', '土'];
const TIMES = Array.from({ length: 28 }, (_, i) => {
  const h = Math.floor(i / 2) + 8; // 8:00〜21:30
  const m = i % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
});

function pad2(n) { return String(n).padStart(2, '0'); }
function fmtDate(y, m, d) { return `${y}-${pad2(m + 1)}-${pad2(d)}`; }
function endOfMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function currentMonth() { const n = new Date(); return { y: n.getFullYear(), m: n.getMonth() }; }

export default function ProviderSchedulePage() {
  const [token, setToken] = useState(null);
  const [slots, setSlots] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState(null); // YYYY-MM-DD
  const [addForm, setAddForm] = useState({ start: '10:00', end: '11:00', capacity: '1', service_id: '', repeat: 'none' });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  // 認証
  useEffect(() => {
    (async () => {
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('ログインが必要です'); setLoading(false); return; }
      setToken(session.access_token);
    })();
  }, []);

  // スロット・サービス取得
  const fetchSlots = useCallback(async (t, y, m) => {
    if (!t) return;
    const month = `${y}-${pad2(m + 1)}`;
    const res = await fetch(`/api/provider/slots?month=${month}`, {
      headers: { Authorization: `Bearer ${t}` },
    });
    if (res.ok) setSlots(await res.json());
  }, []);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      fetchSlots(token, viewYear, viewMonth),
      fetch('/api/provider/services', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : [])
        .then(setServices),
    ]).finally(() => setLoading(false));
  }, [token, viewYear, viewMonth, fetchSlots]);

  // 月移動
  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
    setSelectedDate(null);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
    setSelectedDate(null);
  }

  // スロット追加
  async function handleAdd(e) {
    e.preventDefault();
    if (!selectedDate) { alert('カレンダーから日付を選択してください'); return; }
    if (addForm.start >= addForm.end) { alert('終了時刻は開始時刻より後にしてください'); return; }
    setSaving(true);
    try {
      let dates = [selectedDate];
      if (addForm.repeat === 'daily') {
        // 選択日から月末まで毎日
        const [y, m, d] = selectedDate.split('-').map(Number);
        const last = endOfMonth(y, m - 1);
        dates = Array.from({ length: last - d + 1 }, (_, i) => fmtDate(y, m - 1, d + i));
      } else if (addForm.repeat === 'weekly') {
        // 選択日から月末まで同曜日
        const [y, m, d] = selectedDate.split('-').map(Number);
        const dow = new Date(selectedDate).getDay();
        const last = endOfMonth(y, m - 1);
        dates = [];
        for (let day = d; day <= last; day++) {
          if (new Date(y, m - 1, day).getDay() === dow) dates.push(fmtDate(y, m - 1, day));
        }
      } else if (addForm.repeat === 'weekdays') {
        const [y, m, d] = selectedDate.split('-').map(Number);
        const last = endOfMonth(y, m - 1);
        dates = [];
        for (let day = d; day <= last; day++) {
          const dow = new Date(y, m - 1, day).getDay();
          if (dow !== 0 && dow !== 6) dates.push(fmtDate(y, m - 1, day));
        }
      }

      const slotsToAdd = dates.map(date => ({
        date,
        start_time: addForm.start,
        end_time:   addForm.end,
        capacity:   Number(addForm.capacity) || 1,
        service_id: addForm.service_id || null,
      }));

      const res = await fetch('/api/provider/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ slots: slotsToAdd }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || '追加に失敗しました'); }
      await fetchSlots(token, viewYear, viewMonth);
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  // 受付切り替え
  async function toggleOpen(slot) {
    try {
      const res = await fetch(`/api/provider/slots/${slot.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_open: !slot.is_open }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setSlots(prev => prev.map(s => s.id === slot.id ? updated : s));
    } catch {
      alert('更新に失敗しました');
    }
  }

  // 削除
  async function handleDelete(id) {
    if (!confirm('このスロットを削除しますか？')) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/provider/slots/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      setSlots(prev => prev.filter(s => s.id !== id));
    } catch {
      alert('削除に失敗しました');
    } finally {
      setDeleting(null);
    }
  }

  // 選択日のスロット
  const dateSlots = selectedDate ? slots.filter(s => s.date === selectedDate) : [];

  // カレンダー描画
  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const lastDay  = endOfMonth(viewYear, viewMonth);
  const today    = new Date().toISOString().slice(0, 10);

  // 日付→スロット数マップ
  const slotCountMap = {};
  slots.forEach(s => { slotCountMap[s.date] = (slotCountMap[s.date] || 0) + 1; });

  const svcName = (id) => services.find(s => s.id === id)?.name || '全サービス';

  if (error) return <main className="section"><div className="container" style={{ color: '#ef4444' }}>{error}</div></main>;

  return (
    <main className="section">
      <div className="container stack" style={{ maxWidth: '1000px', gap: '24px' }}>
        <h1 className="section-title">スケジュール管理</h1>
        <p className="muted">空き枠を登録すると、予約ページに反映されます。日付をクリックして枠を追加・確認してください。</p>

        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {/* カレンダー */}
          <div className="card" style={{ padding: '16px', flex: '1', minWidth: '280px' }}>
            {/* ヘッダー */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <button className="btn btn-ghost" style={{ padding: '4px 10px' }} onClick={prevMonth}>‹</button>
              <strong>{viewYear}年 {viewMonth + 1}月</strong>
              <button className="btn btn-ghost" style={{ padding: '4px 10px' }} onClick={nextMonth}>›</button>
            </div>

            {/* 曜日ヘッダー */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
              {WEEK.map((w, i) => (
                <div key={w} style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: i === 0 ? '#ef4444' : i === 6 ? '#6366f1' : '#64748b', padding: '4px 0' }}>{w}</div>
              ))}
            </div>

            {/* 日付グリッド */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
              {Array.from({ length: firstDow }, (_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: lastDay }, (_, i) => {
                const d = i + 1;
                const dateStr = fmtDate(viewYear, viewMonth, d);
                const count = slotCountMap[dateStr] || 0;
                const isSelected = selectedDate === dateStr;
                const isToday = today === dateStr;
                const dow = new Date(viewYear, viewMonth, d).getDay();
                return (
                  <button
                    key={d}
                    onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                    style={{
                      padding: '6px 2px', borderRadius: '6px', border: 'none', cursor: 'pointer', textAlign: 'center',
                      background: isSelected ? '#6366f1' : isToday ? 'rgba(99,102,241,0.15)' : 'transparent',
                      color: isSelected ? '#fff' : dow === 0 ? '#ef4444' : dow === 6 ? '#6366f1' : 'inherit',
                      fontWeight: isToday ? 700 : 400,
                    }}
                  >
                    <div style={{ fontSize: '0.875rem' }}>{d}</div>
                    {count > 0 && (
                      <div style={{ fontSize: '0.65rem', marginTop: '1px', background: isSelected ? 'rgba(255,255,255,0.3)' : '#10b98122', color: isSelected ? '#fff' : '#10b981', borderRadius: '9999px', padding: '0 4px' }}>
                        {count}枠
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {loading && <p className="muted" style={{ fontSize: '0.8rem', marginTop: '8px' }}>読み込み中...</p>}
          </div>

          {/* 右パネル */}
          <div className="stack" style={{ flex: '1', minWidth: '280px', gap: '16px' }}>
            {/* 枠追加フォーム */}
            <div className="card" style={{ padding: '16px' }}>
              <h2 style={{ fontSize: '1rem', marginBottom: '12px' }}>
                {selectedDate ? `${selectedDate} に枠を追加` : '日付を選択して枠を追加'}
              </h2>
              <form onSubmit={handleAdd} className="stack" style={{ gap: '12px' }}>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <label style={{ flex: 1, minWidth: '100px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>開始</span>
                    <select value={addForm.start} onChange={e => setAddForm(p => ({ ...p, start: e.target.value }))} style={{ width: '100%' }}>
                      {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </label>
                  <label style={{ flex: 1, minWidth: '100px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>終了</span>
                    <select value={addForm.end} onChange={e => setAddForm(p => ({ ...p, end: e.target.value }))} style={{ width: '100%' }}>
                      {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </label>
                  <label style={{ width: '80px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>定員</span>
                    <input type="number" min="1" max="99" value={addForm.capacity} onChange={e => setAddForm(p => ({ ...p, capacity: e.target.value }))} />
                  </label>
                </div>

                <label>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>対象サービス</span>
                  <select value={addForm.service_id} onChange={e => setAddForm(p => ({ ...p, service_id: e.target.value }))} style={{ width: '100%' }}>
                    <option value="">全サービス対応</option>
                    {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </label>

                <label>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>繰り返し</span>
                  <select value={addForm.repeat} onChange={e => setAddForm(p => ({ ...p, repeat: e.target.value }))} style={{ width: '100%' }}>
                    <option value="none">この日のみ</option>
                    <option value="weekly">同曜日（月末まで）</option>
                    <option value="weekdays">平日（月末まで）</option>
                    <option value="daily">毎日（月末まで）</option>
                  </select>
                </label>

                <button className="btn" type="submit" disabled={saving || !selectedDate}>
                  {saving ? '追加中...' : '枠を追加'}
                </button>
              </form>
            </div>

            {/* 選択日のスロット一覧 */}
            {selectedDate && (
              <div className="card" style={{ padding: '16px' }}>
                <h2 style={{ fontSize: '1rem', marginBottom: '12px' }}>{selectedDate} の枠一覧</h2>
                {dateSlots.length === 0 ? (
                  <p className="muted" style={{ fontSize: '0.875rem' }}>この日に枠はありません。</p>
                ) : (
                  <div className="stack" style={{ gap: '8px' }}>
                    {dateSlots.map(slot => (
                      <div key={slot.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', opacity: slot.is_open ? 1 : 0.6 }}>
                        <div className="stack" style={{ gap: '2px' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{slot.start_time} 〜 {slot.end_time}</span>
                          <span className="muted" style={{ fontSize: '0.8rem' }}>
                            定員{slot.capacity}名 ／ {svcName(slot.service_id)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <button
                            onClick={() => toggleOpen(slot)}
                            style={{
                              fontSize: '0.75rem', padding: '3px 10px', borderRadius: '9999px', border: 'none', cursor: 'pointer',
                              background: slot.is_open ? '#10b98122' : '#94a3b822',
                              color: slot.is_open ? '#10b981' : '#94a3b8',
                            }}
                          >
                            {slot.is_open ? '受付中' : '締切'}
                          </button>
                          <button
                            className="btn btn-ghost"
                            style={{ fontSize: '0.75rem', padding: '3px 8px', color: '#ef4444' }}
                            disabled={deleting === slot.id}
                            onClick={() => handleDelete(slot.id)}
                          >
                            {deleting === slot.id ? '...' : '削除'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
