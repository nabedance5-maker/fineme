'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const AXES = ['skin','eyebrow','hair','body','teeth','nail','fashion'];
const AXIS_LABELS = { skin:'肌', eyebrow:'眉', hair:'髪', body:'体型', teeth:'歯', nail:'爪', fashion:'服' };
const LEVELS = ['beginner','intermediate','advanced'];
const LEVEL_LABELS = { beginner:'入門', intermediate:'習慣化中', advanced:'こだわり派' };
const PRICES = ['low','mid','high'];
const PRICE_LABELS = { low:'低', mid:'中', high:'高' };

const ADMIN_SECRET = process.env.NEXT_PUBLIC_ADMIN_SECRET || '';

const EMPTY_FORM = { axis: 'skin', name: '', url: '', level: 'beginner', price_range: 'low', sort_order: 0, is_active: true };

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterAxis, setFilterAxis] = useState('all');
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  async function fetchProducts() {
    setLoading(true);
    try {
      const res = await fetch('/api/products?admin=1');
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch { setProducts([]); }
    setLoading(false);
  }

  useEffect(() => { fetchProducts(); }, []);

  function startEdit(p) {
    setEditId(p.id);
    setForm({ axis: p.axis, name: p.name, url: p.url, level: p.level, price_range: p.price_range, sort_order: p.sort_order, is_active: p.is_active });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditId(null);
    setForm(EMPTY_FORM);
  }

  async function save() {
    if (!form.name.trim() || !form.url.trim()) { setMsg('名前とURLは必須です'); return; }
    setSaving(true);
    const method = editId ? 'PATCH' : 'POST';
    const endpoint = editId ? `/api/products?id=${editId}` : '/api/products';
    const res = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_SECRET },
      body: JSON.stringify({ ...form, sort_order: Number(form.sort_order) }),
    });
    if (res.ok) {
      setMsg(editId ? '更新しました' : '追加しました');
      setEditId(null);
      setForm(EMPTY_FORM);
      fetchProducts();
    } else {
      setMsg('エラーが発生しました');
    }
    setSaving(false);
    setTimeout(() => setMsg(''), 3000);
  }

  async function toggleActive(p) {
    await fetch(`/api/products?id=${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_SECRET },
      body: JSON.stringify({ is_active: !p.is_active }),
    });
    fetchProducts();
  }

  async function deleteProduct(p) {
    if (!confirm(`「${p.name}」を削除しますか？`)) return;
    await fetch(`/api/products?id=${p.id}`, {
      method: 'DELETE',
      headers: { 'x-admin-key': ADMIN_SECRET },
    });
    fetchProducts();
  }

  const filtered = filterAxis === 'all' ? products : products.filter(p => p.axis === filterAxis);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px 80px', fontFamily: 'sans-serif', color: '#e8e4dc' }}>
      <div style={{ marginBottom: 24 }}>
        <Link href="/admin" style={{ color: '#6b7280', fontSize: 13, textDecoration: 'none' }}>← 管理画面</Link>
        <h1 style={{ margin: '8px 0 4px', fontSize: 22, fontWeight: 800 }}>商品アフィリエイト管理</h1>
        <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>診断結果・New Me Map に表示する商品プールを管理します（Amazonアソシエイト等）</p>
      </div>

      {/* フォーム */}
      <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: '20px 24px', marginBottom: 32 }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>{editId ? '商品を編集' : '商品を追加'}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 12 }}>
          <label style={labelStyle}>
            軸
            <select value={form.axis} onChange={e => setForm(f => ({ ...f, axis: e.target.value }))} style={selectStyle}>
              {AXES.map(a => <option key={a} value={a}>{AXIS_LABELS[a]}（{a}）</option>)}
            </select>
          </label>
          <label style={labelStyle}>
            レベル
            <select value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))} style={selectStyle}>
              {LEVELS.map(l => <option key={l} value={l}>{LEVEL_LABELS[l]}</option>)}
            </select>
          </label>
          <label style={labelStyle}>
            価格帯
            <select value={form.price_range} onChange={e => setForm(f => ({ ...f, price_range: e.target.value }))} style={selectStyle}>
              {PRICES.map(p => <option key={p} value={p}>{PRICE_LABELS[p]}</option>)}
            </select>
          </label>
          <label style={labelStyle}>
            表示順
            <input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))} style={inputStyle} min={0} />
          </label>
        </div>
        <label style={{ ...labelStyle, display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
          商品名
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={{ ...inputStyle, width: '100%' }} placeholder="例: 肌ラボ 極潤 洗顔フォーム" />
        </label>
        <label style={{ ...labelStyle, display: 'flex', flexDirection: 'column', marginBottom: 16 }}>
          URL（Amazonアソシエイトタグ付き）
          <input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} style={{ ...inputStyle, width: '100%' }} placeholder="https://www.amazon.co.jp/..." />
        </label>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={save} disabled={saving} style={btnPrimary}>{saving ? '保存中…' : editId ? '更新する' : '追加する'}</button>
          {editId && <button onClick={cancelEdit} style={btnSecondary}>キャンセル</button>}
          {msg && <span style={{ fontSize: 13, color: '#059669' }}>{msg}</span>}
        </div>
      </div>

      {/* フィルター */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <button onClick={() => setFilterAxis('all')} style={filterAxis === 'all' ? btnFilterActive : btnFilter}>すべて ({products.length})</button>
        {AXES.map(a => (
          <button key={a} onClick={() => setFilterAxis(a)} style={filterAxis === a ? btnFilterActive : btnFilter}>
            {AXIS_LABELS[a]} ({products.filter(p => p.axis === a).length})
          </button>
        ))}
      </div>

      {/* 一覧 */}
      {loading ? <p style={{ color: '#9ca3af' }}>読み込み中…</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
              <th style={th}>軸</th>
              <th style={th}>商品名</th>
              <th style={th}>レベル</th>
              <th style={th}>価格帯</th>
              <th style={th}>順</th>
              <th style={th}>状態</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6', opacity: p.is_active ? 1 : 0.4 }}>
                <td style={td}><span style={{ background: '#dbeafe', color: '#1e40af', borderRadius: 4, padding: '2px 6px', fontWeight: 700 }}>{AXIS_LABELS[p.axis]}</span></td>
                <td style={{ ...td, maxWidth: 280 }}>
                  <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ color: '#e8e4dc', textDecoration: 'none', fontWeight: 500 }}>{p.name}</a>
                </td>
                <td style={td}>{LEVEL_LABELS[p.level]}</td>
                <td style={td}>{PRICE_LABELS[p.price_range]}</td>
                <td style={td}>{p.sort_order}</td>
                <td style={td}>
                  <button onClick={() => toggleActive(p)} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, border: '1px solid', borderColor: p.is_active ? '#bbf7d0' : '#fca5a5', background: p.is_active ? '#dcfce7' : '#fee2e2', color: p.is_active ? '#15803d' : '#b91c1c', cursor: 'pointer' }}>
                    {p.is_active ? '有効' : '無効'}
                  </button>
                </td>
                <td style={{ ...td, whiteSpace: 'nowrap' }}>
                  <button onClick={() => startEdit(p)} style={{ ...btnSecondary, fontSize: 12, padding: '3px 10px', marginRight: 6 }}>編集</button>
                  <button onClick={() => deleteProduct(p)} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fee2e2', color: '#b91c1c', cursor: 'pointer' }}>削除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const labelStyle = { fontSize: 12, fontWeight: 600, color: '#374151', display: 'flex', flexDirection: 'column', gap: 4 };
const inputStyle = { padding: '7px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, boxSizing: 'border-box' };
const selectStyle = { ...inputStyle };
const btnPrimary = { padding: '8px 18px', borderRadius: 8, border: 'none', background: '#111827', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' };
const btnSecondary = { padding: '8px 14px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontWeight: 600, fontSize: 13, cursor: 'pointer' };
const btnFilter = { padding: '5px 12px', borderRadius: 99, border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontSize: 12, cursor: 'pointer' };
const btnFilterActive = { ...btnFilter, background: '#111827', color: '#fff', borderColor: '#111827' };
const th = { padding: '8px 12px', fontWeight: 700, color: '#e8e4dc', fontSize: 12 };
const td = { padding: '10px 12px', color: '#e8e4dc', verticalAlign: 'middle' };
