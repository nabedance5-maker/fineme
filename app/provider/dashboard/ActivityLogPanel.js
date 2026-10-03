'use client';
// 操作ログ：いつ・誰が・何を操作したかの記録を、トラブルの確認用に見る画面
import { useCallback, useEffect, useState } from 'react';
import { getOperator, setOperator } from './operator';

function getToken() {
  try {
    const key = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    return key ? JSON.parse(localStorage.getItem(key))?.access_token || null : null;
  } catch { return null; }
}

const jst = iso => new Date(new Date(iso).getTime() + 9 * 3600 * 1000);
const dayKey = iso => jst(iso).toISOString().slice(0, 10);
const WD = ['日', '月', '火', '水', '木', '金', '土'];
const dayLabel = key => { const d = new Date(`${key}T00:00:00Z`); return `${d.getUTCMonth() + 1}月${d.getUTCDate()}日（${WD[d.getUTCDay()]}）`; };
const timeLabel = iso => jst(iso).toISOString().slice(11, 16);

export default function ActivityLogPanel() {
  const [logs, setLogs] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [categories, setCategories] = useState([]);
  const [operators, setOperators] = useState([]);
  const [category, setCategory] = useState('');
  const [operator, setOp] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState('');
  const [me, setMe] = useState('');
  const [meSaved, setMeSaved] = useState(false);

  useEffect(() => { setMe(getOperator()); }, []);

  const fetchPage = useCallback(async (before) => {
    const p = new URLSearchParams();
    if (category) p.set('category', category);
    if (operator) p.set('operator', operator);
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    if (before) p.set('before', before);
    const res = await fetch(`/api/provider/activity-log?${p}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || '取得に失敗しました');
    return body;
  }, [category, operator, from, to]);

  const reload = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const b = await fetchPage();
      setLogs(b.logs); setHasMore(b.hasMore); setCategories(b.categories); setOperators(b.operators);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, [fetchPage]);

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    const btns = [...document.querySelectorAll('[data-tab="activity-log"]')];
    btns.forEach(b => b.addEventListener('click', reload));
    return () => btns.forEach(b => b.removeEventListener('click', reload));
  }, [reload]);

  const more = async () => {
    if (!logs.length) return;
    setLoading(true);
    try {
      const b = await fetchPage(logs[logs.length - 1].occurred_at);
      setLogs(prev => [...prev, ...b.logs]); setHasMore(b.hasMore);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const saveMe = () => { setOperator(me); setMeSaved(true); setTimeout(() => setMeSaved(false), 2000); };

  const groups = [];
  logs.forEach(l => {
    const k = dayKey(l.occurred_at);
    const last = groups[groups.length - 1];
    if (last && last.key === k) last.items.push(l); else groups.push({ key: k, items: [l] });
  });

  return (
    <div className="stack" style={{ gap: '20px' }}>
      <style>{CSS}</style>

      <section className="card stack" style={{ padding: '24px', gap: '14px' }}>
        <div>
          <div className="al-kicker">操作ログ</div>
          <h2 style={{ margin: '2px 0 6px', fontSize: '18px' }}>いつ・誰が・何を操作したかの記録</h2>
          <p className="muted" style={{ margin: 0, fontSize: '13px', lineHeight: 1.7 }}>
            予約の承認、顧客情報の変更、設定の変更など、このダッシュボードで行った追加・変更・削除を残します。「予約が消えた」「設定が変わっている」といったときに、いつ誰が操作したかを確認できます。AI専属コンサルも、この記録から忙しい時間帯や繰り返し作業を読み取って、提案に生かします。
          </p>
        </div>

        <div className="al-me">
          <label className="al-label" htmlFor="al-me">この端末で操作している人の名前</label>
          <div className="al-me-row">
            <input id="al-me" className="al-input" value={me} maxLength={40} list="al-operators" onChange={e => setMe(e.target.value)} placeholder="例：田中（未入力でも使えます）" />
            <datalist id="al-operators">{operators.map(o => <option key={o} value={o} />)}</datalist>
            <button type="button" className="al-btn" onClick={saveMe}>{meSaved ? '保存しました' : '保存'}</button>
          </div>
          <p className="muted" style={{ margin: '4px 0 0', fontSize: '12px', lineHeight: 1.6 }}>
            ログインは店舗で1つなので、名前を入れておくとスタッフごとの操作を見分けられます。この端末のブラウザにだけ保存されます。
          </p>
        </div>
      </section>

      <section className="card stack" style={{ padding: '24px', gap: '14px' }}>
        <div className="al-filters">
          <select className="al-input" value={category} onChange={e => setCategory(e.target.value)} aria-label="分野で絞り込む">
            <option value="">すべての分野</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="al-input" value={operator} onChange={e => setOp(e.target.value)} aria-label="操作した人で絞り込む">
            <option value="">すべての人</option>
            {operators.map(o => <option key={o} value={o}>{o}</option>)}
            <option value="__none__">名前なし</option>
          </select>
          <label className="al-date">から<input type="date" className="al-input" value={from} onChange={e => setFrom(e.target.value)} /></label>
          <label className="al-date">まで<input type="date" className="al-input" value={to} onChange={e => setTo(e.target.value)} /></label>
        </div>

        {error && <p className="al-error">{error}</p>}
        {!error && !loading && !logs.length && (
          <p className="muted" style={{ fontSize: '13px', margin: 0 }}>まだ記録がありません。予約の承認や設定の変更など、このダッシュボードで操作すると、ここに残ります。</p>
        )}

        {groups.map(g => (
          <div key={g.key} className="al-day">
            <div className="al-day-head">{dayLabel(g.key)}</div>
            <ul className="al-list">
              {g.items.map(l => (
                <li key={l.id} className="al-item">
                  <button type="button" className="al-row" onClick={() => setOpenId(openId === l.id ? '' : l.id)} aria-expanded={openId === l.id}>
                    <span className="al-time">{timeLabel(l.occurred_at)}</span>
                    <span className="al-cat">{l.category}</span>
                    <span className="al-sum">{l.summary || l.action_label}</span>
                    <span className="al-who">{l.operator_name || '名前なし'}</span>
                  </button>
                  {openId === l.id && (
                    <div className="al-detail">
                      {l.detail ? (
                        <dl>
                          {Object.entries(l.detail).map(([k, v]) => (
                            <div key={k}><dt>{k}</dt><dd>{String(v)}</dd></div>
                          ))}
                        </dl>
                      ) : <span className="muted">送信された内容の記録はありません</span>}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}

        {loading && <p className="muted" style={{ fontSize: '13px', margin: 0 }}>読み込み中...</p>}
        {hasMore && !loading && <button type="button" className="al-btn" onClick={more}>さらに表示</button>}
      </section>
    </div>
  );
}

const CSS = `
  .al-kicker { font-size: 11.5px; letter-spacing: 0.08em; color: rgba(26,20,16,0.55); font-weight: 600; }
  .al-label { display: block; font-size: 12.5px; font-weight: 600; margin-bottom: 6px; }
  .al-me-row { display: flex; gap: 8px; flex-wrap: wrap; }
  .al-input { border: 1px solid rgba(26,20,16,0.2); border-radius: 8px; padding: 8px 10px; font-size: 13.5px; background: #fff; color: #1a1410; min-width: 0; }
  .al-me-row .al-input { flex: 1 1 220px; }
  .al-input:focus-visible, .al-btn:focus-visible, .al-row:focus-visible { outline: 2px solid #1d4ed8; outline-offset: 2px; }
  .al-btn { border: 1px solid #1a1410; background: #1a1410; color: #fff; border-radius: 8px; padding: 8px 16px; font-size: 13px; cursor: pointer; align-self: flex-start; }
  .al-filters { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .al-date { display: flex; align-items: center; gap: 6px; font-size: 12.5px; }
  .al-error { color: #b91c1c; font-size: 13px; margin: 0; }
  .al-day-head { font-size: 12.5px; font-weight: 600; color: rgba(26,20,16,0.6); padding: 6px 0; border-bottom: 1px solid rgba(26,20,16,0.12); }
  .al-list { list-style: none; margin: 0; padding: 0; }
  .al-item { border-bottom: 1px solid rgba(26,20,16,0.07); }
  .al-row { display: grid; grid-template-columns: 44px 84px 1fr auto; gap: 10px; align-items: baseline; width: 100%; text-align: left; background: none; border: 0; padding: 9px 2px; cursor: pointer; font-size: 13.5px; color: #1a1410; }
  .al-time { font-variant-numeric: tabular-nums; color: rgba(26,20,16,0.55); font-size: 12.5px; }
  .al-cat { font-size: 11.5px; color: rgba(26,20,16,0.65); background: rgba(26,20,16,0.06); border-radius: 999px; padding: 2px 8px; text-align: center; white-space: nowrap; }
  .al-sum { overflow-wrap: anywhere; }
  .al-who { font-size: 12.5px; color: rgba(26,20,16,0.55); white-space: nowrap; }
  .al-detail { padding: 4px 4px 12px 54px; font-size: 12.5px; line-height: 1.7; }
  .al-detail dl { margin: 0; display: flex; flex-direction: column; gap: 2px; }
  .al-detail dl > div { display: flex; gap: 10px; }
  .al-detail dt { color: rgba(26,20,16,0.55); min-width: 110px; flex-shrink: 0; }
  .al-detail dd { margin: 0; overflow-wrap: anywhere; }
  @media (max-width: 640px) {
    .al-row { grid-template-columns: 44px 1fr; }
    .al-cat { grid-column: 2; justify-self: start; }
    .al-sum { grid-column: 2; }
    .al-who { grid-column: 2; }
    .al-detail { padding-left: 4px; }
  }
`;
