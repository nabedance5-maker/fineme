'use client';
// 営業用のデモの招待コードの管理（2026-11-14）。営業パートナー・営業先ごとにコードを作り、要らなくなったら止める。
// コードは作った時に1回だけ表示する（DBにはハッシュだけ残る）。
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
  const h = () => ({ 'Content-Type': 'application/json', 'x-admin-key': adminKey() });

  async function load() {
    const r = await fetch('/api/admin/demo-invites', { headers: h() });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setMsg(j.error || '読み込めませんでした'); return; }
    setList(j.invites || []); setStore(j.store);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    if (!label.trim() || busy) return;
    setBusy(true); setMsg('');
    const r = await fetch('/api/admin/demo-invites', { method: 'POST', headers: h(), body: JSON.stringify({ label }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setMsg(j.error || '作れませんでした'); return; }
    setIssued({ label, code: j.code }); setLabel(''); load();
  }
  async function toggle(id, active) {
    await fetch('/api/admin/demo-invites', { method: 'PATCH', headers: h(), body: JSON.stringify({ id, active }) });
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
          営業パートナー・営業先ごとにコードを作って渡してください。デモ店舗（{store?.name || '未作成'}）は毎晩4時に元の状態に戻り、その時にログインも切れます。止めたコードでは、新しく入れなくなります。
        </p>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
        <input value={label} onChange={e => setLabel(e.target.value)} placeholder="渡す相手（例：瀧口さん・〇〇ジム様）" style={{ flex: 1, minWidth: 220, padding: '8px 10px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14 }} />
        <button onClick={create} disabled={busy || !label.trim()} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#111', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>コードを作る</button>
        <button onClick={reset} disabled={busy} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}>デモ店舗を今すぐ元に戻す</button>
      </div>
      {msg && <p role="status" style={{ margin: 0, fontSize: 13 }}>{msg}</p>}
      {issued && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: 16, fontSize: 14, lineHeight: 1.8 }}>
          <div>{issued.label} さん用のコード（この画面を閉じると二度と表示されません）</div>
          <div style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700 }}>{issued.code}</div>
          <div style={{ wordBreak: 'break-all' }}>そのまま入れるURL：{url}</div>
          <button onClick={() => navigator.clipboard?.writeText(url)} style={{ marginTop: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}>URLをコピー</button>
        </div>
      )}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}><th style={{ padding: 8 }}>渡した相手</th><th>末尾</th><th>入った回数</th><th>最後に入った日時</th><th>状態</th><th></th></tr></thead>
          <tbody>
            {list.map(r => (
              <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: 8 }}>{r.label}</td>
                <td style={{ fontFamily: 'monospace' }}>…{r.code_hint}</td>
                <td style={{ fontVariantNumeric: 'tabular-nums' }}>{r.use_count}</td>
                <td>{fmt(r.last_used_at)}</td>
                <td>{r.active ? '使える' : '止めた'}</td>
                <td><button onClick={() => toggle(r.id, !r.active)} style={{ padding: '4px 10px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}>{r.active ? '止める' : '戻す'}</button></td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={6} style={{ padding: 12, color: '#6b7280' }}>まだコードはありません</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
