'use client';
// 掲載者からFinemeへの意見（でお要望2026-10-16）。掲載者ダッシュボードの
// 「使い方 > Finemeへのご意見」から届いたものを一覧し、対応状況と返信（運営メモ）を管理する。
// 返信は掲載者側の送信履歴に「運営からの返信」として表示される。
import { useEffect, useState } from 'react';

const CATEGORY_LABEL = { usability: '使い勝手', bug: '不具合', request: '機能の要望', other: 'その他' };
const STATUS_LABEL = { new: '未対応', in_progress: '対応中', done: '対応済み', wontfix: '見送り' };
const STATUS_COLOR = { new: '#dc2626', in_progress: '#d97706', done: '#16a34a', wontfix: '#6b7280' };

function getAdminKey() {
  let key = sessionStorage.getItem('fineme:admin:key') || '';
  if (!key) {
    key = prompt('管理APIキーを入力してください：') || '';
    if (key) sessionStorage.setItem('fineme:admin:key', key);
  }
  return key;
}

export default function AdminProviderFeedbackPage() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('open');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [drafts, setDrafts] = useState({});
  const [savingId, setSavingId] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setError('');
    const res = await fetch('/api/admin/provider-feedback', { headers: { 'x-admin-key': getAdminKey() } });
    if (res.status === 401) { sessionStorage.removeItem('fineme:admin:key'); setError('管理APIキーが正しくありません。再読み込みして入力し直してください。'); setRows([]); return; }
    const data = await res.json();
    if (!Array.isArray(data)) { setError(data?.error || '読み込みに失敗しました'); setRows([]); return; }
    setRows(data);
  }

  async function save(id, patch) {
    setSavingId(id);
    const res = await fetch('/api/admin/provider-feedback', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': getAdminKey() },
      body: JSON.stringify({ id, ...patch }),
    });
    setSavingId(null);
    if (!res.ok) { alert('保存に失敗しました'); return; }
    const updated = await res.json();
    setRows(prev => prev.map(r => (r.id === id ? { ...r, ...updated } : r)));
  }

  const all = rows || [];
  const filtered = all.filter(r => {
    if (statusFilter === 'open' && !(r.status === 'new' || r.status === 'in_progress')) return false;
    if (statusFilter !== 'open' && statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (categoryFilter && r.category !== categoryFilter) return false;
    return true;
  });
  const counts = Object.fromEntries(Object.keys(STATUS_LABEL).map(k => [k, all.filter(r => r.status === k).length]));

  const card = { background: '#fff', border: '1px solid rgba(26,20,16,0.08)', borderRadius: 12, padding: 16 };
  const select = { padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, background: '#fff', color: '#111' };

  return (
    <main>
      <h1 style={{ fontSize: 22, margin: '0 0 4px', color: '#1a1410' }}>契約者からの意見</h1>
      <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6b7280' }}>
        管理画面の「使い方 &gt; Finemeへのご意見」から届いた声です。返信を書くと契約者側の送信履歴に表示されます。
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {Object.keys(STATUS_LABEL).map(k => (
          <div key={k} style={{ ...card, padding: '10px 14px', minWidth: 96 }}>
            <div style={{ fontSize: 11, color: '#6b7280' }}>{STATUS_LABEL[k]}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: STATUS_COLOR[k] }}>{counts[k] || 0}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={select}>
          <option value="open">未対応・対応中</option>
          <option value="all">すべて</option>
          {Object.keys(STATUS_LABEL).map(k => <option key={k} value={k}>{STATUS_LABEL[k]}</option>)}
        </select>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={select}>
          <option value="">すべての種類</option>
          {Object.keys(CATEGORY_LABEL).map(k => <option key={k} value={k}>{CATEGORY_LABEL[k]}</option>)}
        </select>
        <button type="button" onClick={load} style={{ ...select, cursor: 'pointer' }}>再読み込み</button>
      </div>

      {error && <p style={{ color: '#dc2626', fontSize: 13 }}>{error}</p>}
      {rows === null && <p style={{ color: '#6b7280', fontSize: 13 }}>読み込み中…</p>}
      {rows && !filtered.length && !error && <p style={{ color: '#6b7280', fontSize: 13 }}>該当する意見はありません。</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.map(r => {
          const draft = drafts[r.id] ?? (r.admin_note || '');
          return (
            <div key={r.id} style={card}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <strong style={{ fontSize: 14, color: '#1a1410' }}>{r.provider_name}</strong>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: '#f3f4f6', color: '#374151' }}>{CATEGORY_LABEL[r.category] || r.category}</span>
                {r.tab && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: '#eef2ff', color: '#3730a3' }}>{r.tab}</span>}
                <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 'auto' }}>{new Date(r.created_at).toLocaleString('ja-JP')}</span>
              </div>
              <p style={{ margin: '0 0 12px', fontSize: 14, lineHeight: 1.7, color: '#1a1410', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{r.message}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-start' }}>
                <select value={r.status} onChange={e => save(r.id, { status: e.target.value })} disabled={savingId === r.id} style={{ ...select, color: STATUS_COLOR[r.status], fontWeight: 700 }}>
                  {Object.keys(STATUS_LABEL).map(k => <option key={k} value={k}>{STATUS_LABEL[k]}</option>)}
                </select>
                <textarea
                  value={draft}
                  onChange={e => setDrafts(d => ({ ...d, [r.id]: e.target.value }))}
                  placeholder="返信・対応メモ（契約者に表示されます）"
                  rows={2}
                  style={{ flex: '1 1 240px', minWidth: 0, padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, color: '#111', background: '#fff', resize: 'vertical' }}
                />
                <button
                  type="button"
                  disabled={savingId === r.id || draft === (r.admin_note || '')}
                  onClick={() => save(r.id, { admin_note: draft })}
                  style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#0a0f1e', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: draft === (r.admin_note || '') ? 0.4 : 1 }}
                >返信を保存</button>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
