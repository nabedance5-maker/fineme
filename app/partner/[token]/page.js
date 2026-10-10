'use client';
import { useEffect, useState } from 'react';

// 営業パートナー専用の管理画面（でお要望2026-10-02）。
// 紹介リンク・紹介コード・これまでの紹介実績・報酬額を、営業パートナー本人が
// 自分のURL（sales_partners.access_token付き）だけで確認できる。Finemeの認証
// アカウントは不要（掲載していない営業パートナーも多いため・app/staff-shift/[token]
// と同じ「推測不可能なURL＝本人確認」方式）。報酬率・計算ロジックは変更しない
// （lib/referral-summary.js を掲載者ダッシュボードの紹介報酬タブと共有）。
export default function PartnerPortalPage({ params }) {
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const [copied, setCopied] = useState('');

  useEffect(() => {
    fetch(`/api/partner/${params.token}`)
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(data => setState({ loading: false, error: null, data }))
      .catch(() => setState({ loading: false, error: true, data: null }));
  }, [params.token]);

  const copy = (text, label) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(''), 2000);
    }).catch(() => {});
  };

  if (state.loading) {
    return <div style={wrap}><p style={{ color: '#9ca3af' }}>読み込み中…</p></div>;
  }
  if (state.error || !state.data?.partner) {
    return <div style={wrap}><p style={{ color: '#f87171' }}>このリンクは無効です。発行元にご確認ください。</p></div>;
  }

  const { partner, referrals, summary, collaborator } = state.data;
  const yen = n => `¥${(n || 0).toLocaleString()}`;
  const KIND = { override: '継続報酬（10%）', first_month: '紹介・初月（90%）' };
  const referralUrl = `https://www.fineme.me/provider/join?ref=${encodeURIComponent(partner.referral_code)}`;

  return (
    <div style={{ ...wrap, maxWidth: collaborator ? '760px' : wrap.maxWidth }}>
      <p style={{ fontSize: '12px', color: '#9ca3af', letterSpacing: '.08em', textTransform: 'uppercase', margin: '0 0 6px' }}>{collaborator ? 'Fineme 協業者管理画面' : 'Fineme 営業パートナー管理画面'}</p>
      <h1 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 24px', color: '#e8e4dc' }}>{partner.name} さん</h1>

      {partner.status !== 'active' && (
        <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', padding: '14px', marginBottom: '20px', fontSize: '13px', color: '#fca5a5' }}>
          現在このパートナー登録は停止中です。ご不明な点はFinemeまでお問い合わせください。
        </div>
      )}

      {/* 紹介コード・紹介URL */}
      <div style={card}>
        <div style={label}>あなたの紹介コード</div>
        <div style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '.04em', margin: '2px 0 14px', color: '#e8e4dc' }}>{partner.referral_code}</div>
        <div style={label}>紹介URL（この紹介コード経由で掲載申込した店舗が、あなたの紹介として記録されます）</div>
        <div style={{ fontSize: '13px', color: '#9ca3af', wordBreak: 'break-all', margin: '4px 0 14px' }}>{referralUrl}</div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button style={btn} onClick={() => copy(partner.referral_code, 'code')}>{copied === 'code' ? 'コピーしました' : 'コードをコピー'}</button>
          <button style={btn} onClick={() => copy(referralUrl, 'url')}>{copied === 'url' ? 'コピーしました' : 'URLをコピー'}</button>
        </div>
      </div>

      {collaborator ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', margin: '20px 0' }}>
            <StatCard label="未払いの報酬（合計）" value={yen(collaborator.totals.pending)} accent />
            <StatCard label="支払済の報酬（累計）" value={yen(collaborator.totals.paid)} />
            <StatCard label="報酬の対象になっている掲載者" value={collaborator.providers.length} />
            <StatCard label="継続報酬の率" value={`${Math.round(collaborator.rate * 100)}%`} />
          </div>

          <h2 style={h2}>月別の報酬</h2>
          {collaborator.months.length === 0 ? (
            <p style={muted}>まだ報酬は発生していません。掲載者の2回目以降の課金から継続報酬が記録されます。</p>
          ) : (
            <div style={tableWrap}>
              <table style={table}>
                <thead><tr><th style={th}>月</th><th style={thR}>継続(10%)</th><th style={thR}>紹介・初月</th><th style={thR}>合計</th><th style={thR}>状況</th></tr></thead>
                <tbody>
                  {collaborator.months.map(m => (
                    <tr key={m.month}>
                      <td style={td}>{m.month}</td>
                      <td style={tdR}>{yen(m.override)}</td>
                      <td style={tdR}>{yen(m.first_month)}</td>
                      <td style={{ ...tdR, fontWeight: 800, color: '#e8e4dc' }}>{yen(m.total)}</td>
                      <td style={tdR}>{m.pending > 0 ? `未払い ${yen(m.pending)}` : '支払済'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h2 style={h2}>報酬の内訳</h2>
          {collaborator.rewards.length === 0 ? <p style={muted}>内訳はまだありません。</p> : (
            <div style={tableWrap}>
              <table style={table}>
                <thead><tr><th style={th}>月</th><th style={th}>掲載者</th><th style={th}>種別</th><th style={thR}>受領額(税抜)</th><th style={thR}>報酬</th></tr></thead>
                <tbody>
                  {collaborator.rewards.map(r => (
                    <tr key={r.id} style={r.status === 'void' ? { opacity: 0.45, textDecoration: 'line-through' } : null}>
                      <td style={td}>{r.month}</td>
                      <td style={td}>{r.provider_name}</td>
                      <td style={td}>{KIND[r.kind]}{r.note ? `（${r.note}）` : ''}</td>
                      <td style={tdR}>{yen(r.basis)}</td>
                      <td style={tdR}>{yen(r.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h2 style={h2}>対象の掲載者</h2>
          {collaborator.providers.length === 0 ? <p style={muted}>課金中の掲載者はまだいません。</p> : (
            <div style={tableWrap}>
              <table style={table}>
                <thead><tr><th style={th}>掲載者</th><th style={th}>プラン</th><th style={thR}>課金月数</th><th style={thR}>直近の受領額(税抜)</th><th style={thR}>累計報酬</th></tr></thead>
                <tbody>
                  {collaborator.providers.map(p => (
                    <tr key={p.provider_id}>
                      <td style={td}>{p.name}</td>
                      <td style={td}>{p.plan || '-'}</td>
                      <td style={tdR}>{p.months_paid}</td>
                      <td style={tdR}>{yen(p.last_amount)}</td>
                      <td style={tdR}>{yen(p.reward_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p style={{ ...muted, marginTop: '14px' }}>報酬は掲載2ヶ月目以降の受領額(税抜)の10%、自分が紹介した掲載者は初月に90%を別途記録します。支払いは月末締め・翌月末払いです。返金があった分は取り消しまたは翌月以降と相殺します。</p>
        </>
      ) : (
        <>
      {/* サマリー */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', margin: '20px 0' }}>
        <StatCard label="紹介人数（合計）" value={summary.total_referred} />
        <StatCard label="課金中の紹介先" value={summary.active_count} />
        <StatCard label="今月の見込み報酬" value={`¥${(summary.pending_this_month || 0).toLocaleString()}`} accent />
        <StatCard label="累計報酬額" value={`¥${(summary.total_earned_all_time || 0).toLocaleString()}`} />
      </div>

        </>
      )}

      {/* 紹介実績一覧 */}
      <h2 style={{ fontSize: '14px', fontWeight: 700, margin: '24px 0 10px', color: '#e8e4dc' }}>これまでの紹介実績</h2>
      {referrals.length === 0 ? (
        <p style={{ color: '#9ca3af', fontSize: '13px' }}>まだ紹介した掲載店舗がありません。上の紹介URLを共有して報酬を獲得しましょう。</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {referrals.map(r => (
            <div key={r.referred_id} style={{ ...card, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', margin: 0 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#e8e4dc' }}>{r.referred_name}</div>
                <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                  {r.billing_started ? `課金開始: ${String(r.billing_started).slice(0, 10)}` : 'まだ課金なし'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '99px', background: r.status === 'active' ? 'rgba(16,185,129,0.15)' : 'rgba(156,163,175,0.15)', color: r.status === 'active' ? '#34d399' : '#9ca3af' }}>
                  {r.status === 'active' ? '課金中' : '未課金'}
                </span>
                {!collaborator && <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>累計 ¥{(r.total_earned || 0).toLocaleString()}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '32px', lineHeight: '1.7' }}>
        このページのURLはあなた専用です。第三者に共有しないでください。
      </p>
    </div>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div style={{ ...card, margin: 0, padding: '14px 16px' }}>
      <div style={{ fontSize: '22px', fontWeight: 800, color: accent ? '#818cf8' : '#e8e4dc' }}>{value}</div>
      <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>{label}</div>
    </div>
  );
}

const wrap = { maxWidth: '480px', margin: '0 auto', padding: '40px 20px 60px', background: '#0d1117', minHeight: '100vh' };
const card = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(232,228,220,0.12)', borderRadius: '14px', padding: '18px 20px', margin: '0 0 0' };
const label = { fontSize: '11px', fontWeight: 700, color: '#9ca3af', letterSpacing: '.04em' };
const btn = { flex: 1, minWidth: '120px', padding: '10px 16px', borderRadius: '10px', border: '1px solid rgba(232,228,220,0.2)', background: 'rgba(255,255,255,0.06)', color: '#e8e4dc', fontSize: '13px', fontWeight: 700, cursor: 'pointer' };

const h2 = { fontSize: '14px', fontWeight: 700, margin: '26px 0 10px', color: '#e8e4dc' };
const muted = { color: '#9ca3af', fontSize: '13px' };
const tableWrap = { overflowX: 'auto', border: '1px solid rgba(232,228,220,0.12)', borderRadius: '12px' };
const table = { width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', fontVariantNumeric: 'tabular-nums' };
const th = { textAlign: 'left', padding: '10px 12px', color: '#9ca3af', fontWeight: 700, fontSize: '11px', borderBottom: '1px solid rgba(232,228,220,0.12)', whiteSpace: 'nowrap' };
const thR = { ...th, textAlign: 'right' };
const td = { padding: '10px 12px', color: '#c9c4ba', borderBottom: '1px solid rgba(232,228,220,0.06)', whiteSpace: 'nowrap' };
const tdR = { ...td, textAlign: 'right' };
