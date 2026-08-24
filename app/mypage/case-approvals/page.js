'use client';
// 店舗から登録された施術事例（Before/After）の公開承認画面。
// 店舗SaaS実装仕様書 SAAS-018：本人の許可なく事例を公開しない設計の要（承認導線）。
import { useEffect, useState } from 'react';

const AXIS_LABEL = { eyebrow: '眉', skin: '肌', hair: 'ヘア', expression: '表情', posture: '姿勢', body: '体型', fashion: 'ファッション' };

export default function CaseApprovalsPage() {
  const [token, setToken] = useState(null);
  const [cases, setCases] = useState(null);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    const sbKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    if (!sbKey) { window.location.href = '/login'; return; }
    try {
      const obj = JSON.parse(localStorage.getItem(sbKey));
      const t = obj?.access_token;
      if (!t) { window.location.href = '/login'; return; }
      setToken(t);
      fetch('/api/me/cases', { headers: { 'Authorization': `Bearer ${t}` } })
        .then(r => r.json()).then(setCases).catch(() => setCases([]));
    } catch { window.location.href = '/login'; }
  }, []);

  async function respond(id, approve) {
    setBusyId(id);
    const res = await fetch(`/api/me/cases/${id}/approve`, {
      method: approve ? 'POST' : 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (res.ok) {
      setCases(prev => prev.map(c => c.id === id ? { ...c, approved_by_user: approve } : c));
    }
    setBusyId(null);
  }

  return (
    <main className="section">
      <div className="container stack" style={{ maxWidth: 640, margin: '0 auto' }}>
        <h1 className="section-title">施術事例の公開承認</h1>
        <p className="muted" style={{ fontSize: 13 }}>
          店舗があなたのBefore/Afterを事例として登録した場合、ここで公開の可否を選べます。承認しない限り、どこにも公開されません。
        </p>

        {cases === null && <p className="muted">読み込み中…</p>}
        {cases?.length === 0 && <p className="muted">現在、登録されている事例はありません。</p>}

        {cases?.map(c => (
          <div key={c.id} className="card stack" style={{ padding: 18, gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <strong>{c.provider_name}</strong>
              <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: c.approved_by_user ? 'rgba(34,197,94,.12)' : 'rgba(217,119,6,.12)', color: c.approved_by_user ? '#16a34a' : '#d97706' }}>
                {c.approved_by_user ? '公開中' : '未承認'}
              </span>
            </div>
            <p className="muted" style={{ margin: 0, fontSize: 14 }}>
              {AXIS_LABEL[c.axis] || c.axis}：{c.before_score} → {c.after_score}
            </p>
            {c.image_url && <img src={c.image_url} alt="" style={{ maxWidth: 200, borderRadius: 8 }} />}
            <div style={{ display: 'flex', gap: 8 }}>
              {!c.approved_by_user && (
                <button className="btn" disabled={busyId === c.id} onClick={() => respond(c.id, true)}>公開を承認する</button>
              )}
              {c.approved_by_user && (
                <button className="btn btn-ghost" disabled={busyId === c.id} onClick={() => respond(c.id, false)}>公開を取り消す</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
