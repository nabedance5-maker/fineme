'use client';
// 営業用のデモの招待コードの管理（2026-11-14）。営業パートナー・営業先ごとにコードを作り、要らなくなったら止める。
// コードは作った時に1回だけ表示する（DBにはハッシュだけ残る）。
// 2026-11-15：営業メールは一斉送信1回ごとに1つのコード＋期限（既定14日）。入口で書いてもらった店舗名を一覧で見られる。
import { useEffect, useState } from 'react';

function adminKey() {
  let k = sessionStorage.getItem('fineme:admin:key') || '';
  if (!k) { k = prompt('管理APIキーを入力してください：') || ''; if (k) sessionStorage.setItem('fineme:admin:key', k); }
  return k;
}
const fmt = s => (s ? new Date(s).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

export default function AdminDemoPage() {
  const [list, setList] = useState([]);
  const [store, setStore] = useState(null);
  const [label, setLabel] = useState('');
  const [issued, setIssued] = useState(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [days, setDays] = useState('14');
  const [entries, setEntries] = useState([]);
  const h = () => ({ 'Content-Type': 'application/json', 'x-admin-key': adminKey() });

  async function load() {
    const r = await fetch('/api/admin/demo-invites', { headers: h() });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setMsg(j.error || '読み込めませんでした'); return; }
    setList(j.invites || []); setStore(j.store); setEntries(j.entries || []);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    if (!label.trim() || busy) return;
    setBusy(true); setMsg('');
    const r = await fetch('/api/admin/demo-invites', { method: 'POST', headers: h(), body: JSON.stringify({ label, expires_days: Number(days) || 0 }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setMsg(j.error || '作れませんでした'); return; }
    setIssued({ label, code: j.code, expires_at: j.expires_at }); setLabel(''); load();
  }
  async function toggle(id, active) {
    await fetch('/api/admin/demo-invites', { method: 'PATCH', headers: h(), body: JSON.stringify({ id, active }) });
    load();
  }
  async function extend(id) {
    const v = prompt('今日から何日使えるようにしますか？（0で期限なし）', '14');
    if (v === null) return;
    const r = await fetch('/api/admin/demo-invites', { method: 'PATCH', headers: h(), body: JSON.stringify({ id, expires_days: Number(v) }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) setMsg(j.error || '変えられませんでした');
    load();
  }
  async function reset() {
    if (busy || !confirm('デモ店舗を今すぐ元の状態に戻しますか？（今デモを使っている人はログインが切れます）')) return;
    setBusy(true); setMsg('作り直しています…');
    const r = await fetch('/api/admin/demo-invites', { method: 'POST', headers: h(), body: JSON.stringify({ action: 'reset' }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    setMsg(r.ok ? `元に戻しました（予約 ${j.reservations}件・お客様 ${j.customers}人）` : (j.error || '作り直せませんでした'));
    load();
  }
  const url = issued ? `${location.origin}/demo?code=${issued.code}` : '';

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 16px', display: 'grid', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px' }}>デモの招待コード</h1>
        <p style={{ fontSize: 13, lineHeight: 1.8, margin: 0 }}>
          営業パートナーには1人に1つ、営業メールには一斉送信1回ごとに1つ、期限付きのコードを作ってください。デモ店舗（{store?.name || '未作成'}）は毎晩4時に元の状態に戻り、その時にログインも切れます。止めたコードでは、新しく入れなくなります。
        </p>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
        <input value={label} onChange={e => setLabel(e.target.value)} placeholder="名前（例：瀧口さん・11月第3週メール）" style={{ flex: 1, minWidth: 220, padding: '8px 10px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14 }} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          期限
          <select value={days} onChange={e => setDays(e.target.value)} style={{ padding: '8px 6px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14 }}>
            <option value="7">7日</option><option value="14">14日</option><option value="30">30日</option><option value="0">なし</option>
          </select>
        </label>
        <button onClick={create} disabled={busy || !label.trim()} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#111', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>コードを作る</button>
        <button onClick={reset} disabled={busy} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}>デモ店舗を今すぐ元に戻す</button>
      </div>
      {msg && <p role="status" style={{ margin: 0, fontSize: 13 }}>{msg}</p>}
      {issued && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: 16, fontSize: 14, lineHeight: 1.8 }}>
          <div>{issued.label} のコード（この画面を閉じると二度と表示されません）</div>
          <div>{issued.expires_at ? `期限：${fmt(issued.expires_at)}まで（メールには「デモは${new Date(issued.expires_at).toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo', month: 'long', day: 'numeric' })}までご利用いただけます」と書けます）` : '期限：なし'}</div>
          <div style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700 }}>{issued.code}</div>
          <div style={{ wordBreak: 'break-all' }}>そのまま入れるURL：{url}</div>
          <button onClick={() => navigator.clipboard?.writeText(url)} style={{ marginTop: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}>URLをコピー</button>
        </div>
      )}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}><th style={{ padding: 8 }}>渡した相手</th><th>末尾</th><th>入った回数</th><th>最後に入った日時</th><th>期限</th><th>状態</th><th></th></tr></thead>
          <tbody>
            {list.map(r => (
              <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: 8 }}>{r.label}</td>
                <td style={{ fontFamily: 'monospace' }}>…{r.code_hint}</td>
                <td style={{ fontVariantNumeric: 'tabular-nums' }}>{r.use_count}</td>
                <td>{fmt(r.last_used_at)}</td>
                <td>{r.expires_at ? fmt(r.expires_at) : 'なし'}</td>
                <td>{!r.active ? '止めた' : (r.expires_at && new Date(r.expires_at) < new Date() ? '期限切れ' : '使える')}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button onClick={() => toggle(r.id, !r.active)} style={{ padding: '4px 10px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}>{r.active ? '止める' : '戻す'}</button>
                  <button onClick={() => extend(r.id)} style={{ marginLeft: 6, padding: '4px 10px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}>期限を変える</button>
                </td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={7} style={{ padding: 12, color: '#6b7280' }}>まだコードはありません</td></tr>}
          </tbody>
        </table>
      </div>
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 8px' }}>デモに入った方（直近）</h2>
        <p style={{ fontSize: 12.5, color: '#6b7280', margin: '0 0 8px' }}>店舗名は入口でご本人が任意で書いたものです。入り直し（ログイン切れ等）も1行ずつ出ます。</p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}><th style={{ padding: 8 }}>日時</th><th>店舗名</th><th>コード</th></tr></thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: 8, whiteSpace: 'nowrap' }}>{fmt(e.created_at)}</td>
                  <td>{e.store_name || <span style={{ color: '#9ca3af' }}>なし</span>}</td>
                  <td>{list.find(r => r.id === e.invite_id)?.label || '—'}</td>
                </tr>
              ))}
              {!entries.length && <tr><td colSpan={3} style={{ padding: 12, color: '#6b7280' }}>まだありません</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
