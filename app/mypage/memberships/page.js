'use client';
import { useEffect, useState } from 'react';
import MypageSideNav from '../_components/MypageSideNav';
import RequestPanel from './RequestPanel';

const STATUS_LABEL = { pending_approval: '承認待ち', active: '会員', rejected: '却下', cancelled: '退会済み' };
const STATUS_COLOR = { pending_approval: '#fff', active: '#fff', rejected: '#fff', cancelled: '#fff' };

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

  async function reloadDetail(id) {
    const res = await fetch(`/api/me/memberships/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setDetail(await res.json());
  }

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
          <h1 className="section-title">月額プラン</h1>
          <p className="muted" style={{ fontSize: '13px', marginTop: '8px', lineHeight: 1.7 }}>
            入っている月額プランと、申し込みの時に同意した利用規約を確認できます。
          </p>

          {loading ? (
            <p className="muted">読み込み中...</p>
          ) : error ? (
            <p style={{ color: '#fff', fontWeight: 700 }}>{error}</p>
          ) : memberships.length === 0 ? (
            <p className="muted">まだ入っている月額プランはありません。お店のページから申し込むと、ここに出ます。</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {memberships.map(m => (
                <div
                  key={m.id}
                  style={{ border: '1px solid rgba(232,228,220,0.15)', borderRadius: '14px', padding: '18px 20px', background: '#151b24' }}
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
                      <span style={{ fontSize: '12px', fontWeight: 800, color: STATUS_COLOR[m.status] || '#c8a45a' }}>
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
                          {m.status === 'active' && <RequestPanel detail={detail} token={token} onChanged={() => reloadDetail(m.id)} />}
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
      `}</style>
    </main>
  );
}
