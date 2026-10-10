'use client';
import { useEffect, useState, useCallback } from 'react';

// 協業者（瀧口・今野など）の月次報酬の確認と、月末締め・翌月末払いの支払い管理（admin専用）。
// 支払いは手動振込。ここでは「支払済」の記録とCSV出力を行う。仕様：lib/collaborator-rewards.js
const KIND = { override: '継続報酬(10%)', first_month: '紹介・初月(90%)' };
const yen = n => `¥${(n || 0).toLocaleString()}`;

function thisMonth() {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 7);
}

export default function AdminCollaboratorRewardsPage() {
  const [key, setKey] = useState('');
  const [month, setMonth] = useState(thisMonth());
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let k = sessionStorage.getItem('fineme:admin:key') || '';
    if (!k) {
      k = prompt('管理APIキーを入力してください：') || '';
      if (k) sessionStorage.setItem('fineme:admin:key', k);
    }
    setKey(k);
  }, []);

  const load = useCallback(async () => {
    if (!key) return;
    setError('');
    const res = await fetch(`/api/admin/collaborator-rewards?month=${month}`, { headers: { 'x-admin-key': key } });
    if (!res.ok) { setError(`読み込み失敗（${res.status}）。管理APIキーを確認してください。`); return; }
    setData(await res.json());
  }, [key, month]);

  useEffect(() => { load(); }, [load]);

  const mark = async (partner_id, status) => {
    await fetch('/api/admin/collaborator-rewards', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': key },
      body: JSON.stringify({ partner_id, month, status }),
    });
    load();
  };

  const downloadCsv = async () => {
    const res = await fetch(`/api/admin/collaborator-rewards?month=${month}&format=csv`, { headers: { 'x-admin-key': key } });
    if (!res.ok) return;
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement('a');
    a.href = url; a.download = `collaborator-rewards-${month}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ maxWidth: '980px', margin: '0 auto', padding: '32px 20px', color: '#111' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 4px' }}>協業者の報酬</h1>
      <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 20px' }}>
        掲載2ヶ月目以降の全掲載者の受領額(税抜)の10%と、協業者本人が紹介した掲載者の初月90%。月末締め・翌月末払い（手動振込）。
        協業者は「営業パートナー」画面で指定します。
      </p>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
        <label style={{ fontSize: '13px', fontWeight: 700 }}>対象月
          <input type="month" value={month} onChange={e => setMonth(e.target.value)} style={{ marginLeft: '8px', padding: '6px 8px', border: '1.5px solid #e5e7eb', borderRadius: '8px' }} />
        </label>
        <button onClick={downloadCsv} style={ghost}>CSVを出力</button>
      </div>

      {error && <p style={{ color: '#b91c1c' }}>{error}</p>}
      {data && data.summary.length === 0 && <p style={{ color: '#6b7280' }}>協業者が登録されていません。「営業パートナー」画面で「協業者にする」を押してください。</p>}

      {data && data.summary.map(p => (
        <div key={p.partner_id} style={{ border: '1px solid #e5e7eb', borderRadius: '12px', background: '#fff', padding: '16px 18px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: '16px' }}>{p.name}</div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>{month}　未払い {yen(p.pending)}　支払済 {yen(p.paid)}</div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={{ ...ghost, background: '#111', color: '#fff', borderColor: '#111' }} disabled={p.pending === 0} onClick={() => mark(p.partner_id, 'paid')}>この月を支払済にする</button>
              <button style={ghost} disabled={p.paid === 0} onClick={() => mark(p.partner_id, 'pending')}>未払いに戻す</button>
            </div>
          </div>
          {p.rows.length > 0 && (
            <div style={{ overflowX: 'auto', marginTop: '12px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', fontVariantNumeric: 'tabular-nums' }}>
                <thead><tr>{['掲載者', '種別', '受領額(税抜)', '報酬', '状況'].map(h => <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: '#6b7280', fontSize: '11px', borderBottom: '1px solid #e5e7eb' }}>{h}</th>)}</tr></thead>
                <tbody>
                  {p.rows.map(r => (
                    <tr key={r.id} style={r.status === 'void' ? { opacity: 0.45, textDecoration: 'line-through' } : null}>
                      <td style={cell}>{r.provider_name}</td>
                      <td style={cell}>{KIND[r.kind]}</td>
                      <td style={cell}>{yen(r.basis)}</td>
                      <td style={{ ...cell, fontWeight: 700 }}>{yen(r.amount)}</td>
                      <td style={cell}>{r.status === 'paid' ? `支払済 ${String(r.paid_at || '').slice(0, 10)}` : r.status === 'void' ? '無効' : '未払い'}{r.note ? `（${r.note}）` : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

const ghost = { padding: '8px 14px', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: '13px', fontWeight: 700, cursor: 'pointer' };
const cell = { padding: '8px', borderBottom: '1px solid #f3f4f6', whiteSpace: 'nowrap' };
