'use client';
import { useEffect, useState } from 'react';
import MypageSideNav from '../_components/MypageSideNav';

const STATUS_LABEL = { pending_approval: '承認待ち', active: '会員', rejected: '却下', cancelled: '解約済み' };
const STATUS_COLOR = { pending_approval: '#d97706', active: '#22c55e', rejected: '#ef4444', cancelled: 'rgba(232,228,220,0.5)' };

function fmtYen(n) { return n || n === 0 ? `¥${Number(n).toLocaleString()}` : '未設定'; }
function fmtDate(s) { return s ? new Date(s).toLocaleDateString('ja-JP') : ''; }

export default function MypageMembershipsPage() {
  const [loading, setLoading] = useState(true);
  const [memberships, setMemberships] = useState([]);
  const [error, setError] = useState('');
  const [token, setToken] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    const sbKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    if (!sbKey) { window.location.href = '/login'; return; }
    let accessToken = null;
    try {
      const obj = JSON.parse(localStorage.getItem(sbKey));
      accessToken = obj?.access_token || null;
      if (!obj?.user?.id) { window.location.href = '/login'; return; }
    } catch { window.location.href = '/login'; return; }
    setToken(accessToken);

    fetch('/api/me/memberships', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(rows => setMemberships(rows.filter(r => r.status !== 'draft')))
      .catch(() => setError('取得に失敗しました'))
      .finally(() => setLoading(false));
  }, []);

  async function toggleDetail(id) {
    if (openId === id) { setOpenId(null); setDetail(null); return; }
    setOpenId(id);
    setDetail(null);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/me/memberships/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setDetail(await res.json());
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <main className="section">
      <div className="container mypage-layout">
        <MypageSideNav />

        <section className="stack mypage-content">
          <h1 className="section-title">入会手続き</h1>
          <p className="muted" style={{ fontSize: '13px', marginTop: '-8px' }}>
            店舗への入会申込の状況と、同意した利用規約をいつでも確認できます。
          </p>

          {loading ? (
            <p className="muted">読み込み中...</p>
          ) : error ? (
            <p style={{ color: '#dc2626' }}>{error}</p>
          ) : memberships.length === 0 ? (
            <p className="muted">まだ入会申込がありません。店舗の入会ページから手続きすると、ここに表示されます。</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {memberships.map(m => (
                <div
                  key={m.id}
                  style={{ border: '1px solid rgba(232,228,220,0.15)', borderRadius: '14px', padding: '18px 20px', background: 'rgba(10,15,30,0.65)' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap', cursor: 'pointer' }} onClick={() => toggleDetail(m.id)}>
                    <div>
                      <p style={{ margin: '0 0 4px', fontSize: '11px', color: 'rgba(232,228,220,0.5)' }}>{m.provider_name}</p>
                      <p style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>{m.plan_name || 'プラン未選択'}</p>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'rgba(232,228,220,0.5)' }}>
                        入会日：{fmtDate(m.enrollment_date)}
                        {m.prorated_first_amount != null && `（初回目安：${fmtYen(m.prorated_first_amount)}）`}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: STATUS_COLOR[m.status] || '#c9a84c' }}>
                        {STATUS_LABEL[m.status] || m.status}
                      </span>
                      <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'rgba(232,228,220,0.4)' }}>{openId === m.id ? '閉じる ▲' : '詳細を見る ▼'}</p>
                    </div>
                  </div>

                  {openId === m.id && (
                    <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid rgba(232,228,220,0.12)', fontSize: '13px', lineHeight: 1.8 }}>
                      {detailLoading || !detail ? (
                        <p className="muted">読み込み中...</p>
                      ) : (
                        <>
                          {m.status === 'rejected' && detail.reject_reason && (
                            <p style={{ color: '#ef4444', margin: '0 0 10px' }}>却下理由：{detail.reject_reason}</p>
                          )}
                          {detail.locker_name && (
                            <p style={{ margin: '0 0 6px' }}>ロッカー：{detail.locker_name}（月額{fmtYen(detail.locker_fee)}）</p>
                          )}
                          {detail.approved_at && <p style={{ margin: '0 0 6px' }}>承認日：{fmtDate(detail.approved_at)}</p>}
                          {detail.terms_snapshot ? (
                            <div style={{ marginTop: '10px' }}>
                              <p style={{ margin: '0 0 6px', fontWeight: 700, color: 'rgba(232,228,220,0.7)' }}>
                                同意した利用規約・同意書（{fmtDate(detail.terms_agreed_at)}時点）
                              </p>
                              <div style={{
                                whiteSpace: 'pre-wrap', background: 'rgba(0,0,0,0.25)', borderRadius: '10px',
                                padding: '14px', maxHeight: '260px', overflowY: 'auto', fontSize: '12.5px', color: 'rgba(232,228,220,0.85)',
                              }}>
                                {detail.terms_snapshot}
                              </div>
                            </div>
                          ) : (
                            <p className="muted">規約の同意記録がありません。</p>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <style>{`
        .mypage-layout { display: grid; grid-template-columns: 200px 1fr; gap: 32px; align-items: start; }
        .mypage-sidenav, .mypage-content { min-width: 0; }
        .mypage-sidenav { background: rgba(10,15,30,0.65); backdrop-filter: blur(8px); border: 1px solid rgba(201,168,76,0.28); border-radius: 14px; padding: 12px; position: sticky; top: 80px; }
        @media (max-width: 640px) { .mypage-layout { grid-template-columns: 1fr; } .mypage-sidenav { position: static; padding: 8px; border-radius: 12px; margin-bottom: 8px; overflow: hidden; min-width: 0; } .mypage-sidenav nav { display: flex; flex-direction: row; overflow-x: auto; gap: 4px; scrollbar-width: none; } .mypage-sidenav nav::-webkit-scrollbar { display: none; } .mypage-sidenav nav .sidenav-link { margin-top: 0 !important; } .sidenav-link { white-space: nowrap; padding: 6px 14px; font-size: 13px; flex-shrink: 0; } }
        .sidenav-link { display: block; padding: 8px 12px; border-radius: 8px; font-size: 14px; font-weight: 500; color: rgba(232,228,220,0.75); text-decoration: none; transition: background .15s; }
        .sidenav-link:hover { background: rgba(201,168,76,0.1); color: #0a0f1e; }
        .sidenav-link--active { background: rgba(201,168,76,0.14); font-weight: 700; color: #0a0f1e; border-left: 3px solid #c9a84c; padding-left: 9px; }
      `}</style>
    </main>
  );
}
