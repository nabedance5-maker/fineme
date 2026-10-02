'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

function getAdminKey() {
  let key = sessionStorage.getItem('fineme:admin:key') || '';
  if (!key) {
    key = prompt('管理APIキーを入力してください：') || '';
    if (key) sessionStorage.setItem('fineme:admin:key', key);
  }
  return key;
}

const fmtNo = n => (n == null ? '—' : String(n));
const fmtDate = d => (d ? new Date(d).toLocaleDateString('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric' }) : '—');

function matchesKw(kw, name, no) {
  if (!kw) return true;
  if ((name || '').toLowerCase().includes(kw)) return true;
  if (no == null) return false;
  const digits = kw.replace(/^(no\.?|#|会員番号)\s*/i, '').replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0));
  return /^\d+$/.test(digits) && String(no).includes(digits.replace(/^0+(?=\d)/, ''));
}

const card = { background: '#fff', color: '#111', border: '1px solid #e5e7eb', borderRadius: 12, textShadow: 'none' };
const input = { padding: '8px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, color: '#111', background: '#fff', boxSizing: 'border-box' };
const badge = (bg, fg) => ({ display: 'inline-block', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: bg, color: fg });

export default function AdminCustomersPage() {
  const [providers, setProviders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [truncated, setTruncated] = useState(false);
  const [providerId, setProviderId] = useState('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [linkTarget, setLinkTarget] = useState(null);
  const [linkKw, setLinkKw] = useState('');
  const [linkMembers, setLinkMembers] = useState([]);
  const adminKey = useRef('');
  const reqSeq = useRef(0);

  const load = useCallback(async () => {
    if (!adminKey.current) adminKey.current = getAdminKey();
    const seq = ++reqSeq.current;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (providerId) params.set('provider_id', providerId);
      if (q.trim()) params.set('q', q.trim());
      const res = await fetch(`/api/admin/customers?${params}`, { headers: { 'x-admin-key': adminKey.current } });
      if (seq !== reqSeq.current) return;
      if (!res.ok) { setError(res.status === 401 ? '取得エラー。APIキーを確認してください。' : '取得に失敗しました'); setLoading(false); return; }
      const data = await res.json();
      setCustomers(data.customers || []);
      setTotal(data.total || 0);
      setTruncated(!!data.truncated);
      if (!providerId) setProviders(data.providers || []);
    } catch {
      if (seq === reqSeq.current) setError('取得に失敗しました');
    }
    if (seq === reqSeq.current) setLoading(false);
  }, [providerId, q]);

  useEffect(() => {
    const t = setTimeout(load, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  const linkCandidates = useMemo(() => {
    if (!linkTarget) return [];
    const kw = linkKw.trim().toLowerCase();
    if (!kw) return [];
    return linkMembers.filter(c => matchesKw(kw, c.name, c.member_number)).slice(0, 8);
  }, [linkMembers, linkTarget, linkKw]);

  // 紐付け候補は一覧の検索条件に左右されないよう、その店舗の会員を別に取得する
  async function openLink(c) {
    setLinkTarget(c);
    setLinkKw('');
    setLinkMembers([]);
    try {
      const res = await fetch(`/api/admin/customers?provider_id=${encodeURIComponent(c.provider_id)}`, { headers: { 'x-admin-key': adminKey.current } });
      if (res.ok) setLinkMembers(((await res.json()).customers || []).filter(x => x.kind === 'member'));
    } catch { /* 候補が出ないだけ */ }
  }

  async function link(member) {
    if (!linkTarget) return;
    if (!confirm(`「${linkTarget.name}」を会員「${member.name}」と紐付けます。よろしいですか？（後から取り消せません）`)) return;
    const res = await fetch(`/api/admin/customers/manual/${linkTarget.manual_id}/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey.current },
      body: JSON.stringify({ user_id: member.user_id }),
    });
    if (res.ok) {
      setLinkTarget(null);
      setLinkKw('');
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      alert('エラー: ' + (d.error || '不明'));
    }
  }

  return (
    <main className="section" style={{ textShadow: 'none', color: '#e8e4dc' }}>
      <section className="stack">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <h1 className="section-title" style={{ margin: 0 }}>顧客管理</h1>
          <span style={{ fontSize: 13 }}>{loading ? '読み込み中…' : `${total}件`}</span>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select value={providerId} onChange={e => setProviderId(e.target.value)} style={{ ...input, flex: '1 1 200px', maxWidth: 280 }}>
            <option value="">すべての店舗</option>
            {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="お客様の名前・会員番号・店舗名で検索" style={{ ...input, flex: '2 1 240px' }} />
        </div>

        {error && <p style={{ color: '#ef4444' }}>{error}</p>}
        {!error && !loading && !customers.length && <p className="muted">該当するお客様はいません。</p>}
        {truncated && <p style={{ fontSize: 12 }}>表示は先頭1000件までです。店舗や検索で絞り込んでください。</p>}

        <div>
          {customers.map(c => (
            <div key={c.key} style={{ ...card, padding: '12px 16px', marginBottom: 8, display: 'grid', gridTemplateColumns: '64px minmax(0,1.4fr) minmax(0,1fr) auto', gap: 12, alignItems: 'center', fontSize: 14 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', fontVariantNumeric: 'tabular-nums' }}>{c.member_number != null ? `No.${fmtNo(c.member_number)}` : '—'}</span>
              <span style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.name}
                {c.kind === 'manual' && c.memo ? <span style={{ fontWeight: 400, color: '#6b7280', marginLeft: 8, fontSize: 12 }}>{c.memo}</span> : null}
              </span>
              <span style={{ fontSize: 12, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.provider_name}{c.kind === 'member' ? `／前回来店 ${fmtDate(c.last_visit)}` : ''}
              </span>
              <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {c.kind === 'member' && <span style={badge('#d1fae5', '#065f46')}>会員</span>}
                {c.kind === 'manual' && !c.linked_user_id && (
                  <>
                    <span style={badge('#fef3c7', '#92400e')}>非会員</span>
                    <button type="button" className="btn btn-ghost" style={{ fontSize: 12, padding: '4px 10px', color: '#111' }} onClick={() => openLink(c)}>会員と紐付ける</button>
                  </>
                )}
                {c.kind === 'manual' && c.linked_user_id && <span style={badge('#f3f4f6', '#6b7280')}>会員に紐付け済み</span>}
              </span>
            </div>
          ))}
        </div>
      </section>

      {linkTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={e => { if (e.target === e.currentTarget) setLinkTarget(null); }}>
          <div style={{ ...card, borderRadius: 18, padding: 24, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: 16 }}>「{linkTarget.name}」を会員と紐付ける</h2>
              <button type="button" onClick={() => setLinkTarget(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}>✕</button>
            </div>
            <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 8px' }}>{linkTarget.provider_name} に紐づく会員から、名前または会員番号で検索します。</p>
            <input autoFocus value={linkKw} onChange={e => setLinkKw(e.target.value)} placeholder="会員の名前・会員番号" style={{ ...input, width: '100%', marginBottom: 10 }} />
            {!linkKw.trim() && <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>名前または会員番号を入力すると、該当する会員が表示されます。</p>}
            {linkKw.trim() && !linkCandidates.length && <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>該当する会員はいません。</p>}
            {linkCandidates.map(m => (
              <button key={m.key} type="button" onClick={() => link(m)} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', color: '#111', fontSize: 13, marginBottom: 6, cursor: 'pointer' }}>
                <span style={{ fontSize: 11, color: '#6b7280', minWidth: 56 }}>{m.member_number != null ? `No.${fmtNo(m.member_number)}` : ''}</span>
                <span style={{ flex: 1, fontWeight: 700 }}>{m.name}</span>
                <span style={{ fontSize: 11, color: '#2563eb', fontWeight: 700 }}>紐付ける</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
