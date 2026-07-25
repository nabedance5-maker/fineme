'use client';
import useTrack from '@/app/_hooks/useTrack';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { JAPAN_CITIES, PREFECTURES } from '@/app/_data/japan-cities';
import { TRACKS, setTrackExplicit, saveTrackToServer } from '@/lib/track';

export default function MypageProfilePage() {
  const { track, trackId: resolvedTrackId } = useTrack();
  const [trackId, setTrackId] = useState('fineme');
  const [trackMsg, setTrackMsg] = useState('');

  useEffect(() => { setTrackId(resolvedTrackId); }, [resolvedTrackId]);

  // トラックの明示切替。入口では選ばせず、ここは「間違えた人が戻すための訂正手段」。
  function switchTrack(id) {
    if (id === trackId) return;
    setTrackExplicit(id);
    setTrackId(id);
    saveTrackToServer(id).catch(() => {});
    setTrackMsg(`${TRACKS[id].label} に切り替えました`);
    // マイページ全体（リンク・記事・色）を新しいトラックで描き直す
    setTimeout(() => window.location.reload(), 600);
  }
  const [accessToken, setAccessToken] = useState(null);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [phone, setPhone] = useState('');
  const [area, setArea] = useState('');  // 都道府県
  const [city, setCity] = useState('');  // 市区町村
  const cityOptions = useMemo(() => JAPAN_CITIES[area] || [], [area]);
  const [shareDiagnosis, setShareDiagnosis] = useState(false);
  const [shareRoadmap, setShareRoadmap] = useState(false);
  const [lineUserId, setLineUserId] = useState(null);

  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [lineMsg, setLineMsg] = useState('');

  useEffect(() => {
    const sbKey = Object.keys(localStorage).find(
      k => k.startsWith('sb-') && k.endsWith('-auth-token')
    );
    if (sbKey) {
      try {
        const obj = JSON.parse(localStorage.getItem(sbKey));
        if (obj?.access_token && obj?.user?.id) {
          setAccessToken(obj.access_token);
          setUserId(obj.user.id);

          // APIルート経由でプロフィール取得（RLS問題を回避）
          fetch('/api/me/profile', {
            headers: { 'Authorization': `Bearer ${obj.access_token}` },
          })
            .then(r => r.json())
            .then(data => {
              if (data && !data.error) {
                setDisplayName(data.display_name || '');
                setEmail(data.email || '');
                setLastName(data.last_name || '');
                setFirstName(data.first_name || '');
                setPhone(data.phone || '');
                setArea(data.area || localStorage.getItem('fineme:user:area') || '');
                setCity(data.city || localStorage.getItem('fineme:user:city') || '');
                setShareDiagnosis(!!data.share_diagnosis);
                setShareRoadmap(!!data.share_roadmap);
                setLineUserId(data.line_user_id || null);
              }
              setLoading(false);
            })
            .catch(() => setLoading(false));

          // URL パラメータでLINE連携結果を表示
          const params = new URLSearchParams(window.location.search);
          if (params.get('line_connected') === '1') {
            setLineMsg('LINEアカウントを連携しました。リマインドが届くようになります。');
            window.history.replaceState({}, '', '/mypage/profile');
          } else if (params.get('line_error')) {
            setLineMsg(`LINE連携でエラーが発生しました（${params.get('line_error')}）`);
            window.history.replaceState({}, '', '/mypage/profile');
          }
          return;
        }
      } catch {}
    }
    window.location.href = '/login';
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!displayName.trim()) { setMessage('名前は必須です。'); return; }
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/me/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          display_name: displayName.trim(),
          last_name: lastName.trim(),
          first_name: firstName.trim(),
          phone: phone.trim(),
          area: area.trim(),
          city: city.trim(),
          share_diagnosis: shareDiagnosis,
          share_roadmap: shareRoadmap,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setMessage(`保存エラー: ${data.error || res.status}`);
      } else {
        setMessage('保存しました。');
        if (area.trim()) {
          localStorage.setItem('fineme:user:area', area.trim());
          localStorage.removeItem('fineme:user:area:skip');
        } else {
          localStorage.removeItem('fineme:user:area');
        }
        if (city.trim()) {
          localStorage.setItem('fineme:user:city', city.trim());
          // 市区町村を手動変更した場合、既存の座標キャッシュをクリア（再設定をLocationPromptに委ねる）
          localStorage.removeItem('fineme:user:lat');
          localStorage.removeItem('fineme:user:lon');
        } else {
          localStorage.removeItem('fineme:user:city');
        }
      }
    } catch {
      setMessage('保存に失敗しました。');
    }
    setSaving(false);
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '60px' }}>読み込み中...</div>;

  return (
    <main className="section">
      <div className="container mypage-layout">
        <aside className="mypage-sidenav">
          <nav className="stack" style={{ gap: '4px' }}>
            <Link href="/mypage" className="sidenav-link">ホーム</Link>
            <Link href={track.diagnosisResult} className="sidenav-link">New Me Navi</Link>
            <Link href="/mypage/navi" className="sidenav-link">New Me Map</Link>
            <Link href="/mypage/log" className="sidenav-link">New Me Log</Link>
            <Link href="/mypage/mirror" className="sidenav-link">Mirror履歴</Link>
            <Link href="/mypage/subscription" className="sidenav-link">サブスク設定</Link>
            <Link href="/mypage/favorites" className="sidenav-link">お気に入り</Link>
            <Link href="/mypage/history" className="sidenav-link">閲覧履歴</Link>
            <Link href="/my-reservations" className="sidenav-link">予約履歴</Link>
            <Link href="/mypage/story-submit" className="sidenav-link">体験談を書く</Link>
            <Link href="/mypage/profile" className="sidenav-link sidenav-link--active">プロフィール編集</Link>
          </nav>
        </aside>

        <section className="stack">
          <h1 className="section-title">プロフィール編集</h1>
          <form id="user-profile-form" className="card" style={{ padding: '24px', maxWidth: '640px' }} onSubmit={handleSubmit}>
            <div className="stack">
              <div>
                <label className="profile-label">
                  <span className="profile-label-text">表示名</span>
                  <input
                    type="text"
                    placeholder="例: たろう（ニックネーム可）"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                  />
                </label>
                <p className="display-name-note">New Me Navi・New Me Mapに表示されます。ニックネームでもOKです。他のユーザーには公開されません。</p>
              </div>
              <label className="profile-label">
                <span className="profile-label-text">メール</span>
                <input
                  type="email"
                  value={email}
                  readOnly
                  style={{ background: 'rgba(10,15,30,0.50)', color: 'rgba(232,228,220,0.55)' }}
                />
              </label>

              {/* エリア設定 */}
              <div style={{ borderTop: '1px solid rgba(232,228,220,0.15)', paddingTop: '20px', marginTop: '4px' }}>
                <p style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(232,228,220,0.75)', margin: '0 0 4px' }}>📍 お住まいのエリア</p>
                <p style={{ fontSize: '12px', color: 'rgba(232,228,220,0.55)', margin: '0 0 12px' }}>設定すると、検索結果や診断結果で近くのサービスが優先表示されます。引越し時などはここから変更できます。</p>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <select
                    value={area}
                    onChange={e => { setArea(e.target.value); setCity(''); }}
                    style={{ padding: '10px 12px', border: '1px solid rgba(232,228,220,0.15)', borderRadius: '8px', fontSize: '14px', width: '140px', boxSizing: 'border-box', background: 'rgba(10,15,30,0.65)'}}
                  >
                    <option value="">都道府県</option>
                    {PREFECTURES.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <select
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    disabled={!area}
                    style={{ padding: '10px 12px', border: '1px solid rgba(232,228,220,0.15)', borderRadius: '8px', fontSize: '14px', flex: 1, minWidth: '140px', boxSizing: 'border-box', background: 'rgba(10,15,30,0.65)'}}
                  >
                    <option value="">{area ? '市区町村を選ぶ（任意）' : '都道府県を先に選択'}</option>
                    {cityOptions.map(c => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 予約者情報 */}
              <div style={{ borderTop: '1px solid rgba(232,228,220,0.15)', paddingTop: '20px', marginTop: '4px' }}>
                <p style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(232,228,220,0.75)', margin: '0 0 4px' }}>予約者情報</p>
                <p style={{ fontSize: '12px', color: 'rgba(232,228,220,0.55)', margin: '0 0 14px' }}>予約が成立した際に掲載者へ公開されます。任意入力ですが、入力しておくとスムーズです。</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(232,228,220,0.75)' }}>姓</label>
                    <input
                      type="text"
                      placeholder="山田"
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      style={{ padding: '10px 12px', border: '1px solid rgba(232,228,220,0.15)', borderRadius: '8px', fontSize: '14px', width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(232,228,220,0.75)' }}>名</label>
                    <input
                      type="text"
                      placeholder="太郎"
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      style={{ padding: '10px 12px', border: '1px solid rgba(232,228,220,0.15)', borderRadius: '8px', fontSize: '14px', width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(232,228,220,0.75)' }}>電話番号</label>
                  <input
                    type="tel"
                    placeholder="090-0000-0000"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    style={{ padding: '10px 12px', border: '1px solid rgba(232,228,220,0.15)', borderRadius: '8px', fontSize: '14px', width: '100%', boxSizing: 'border-box', maxWidth: '240px' }}
                  />
                </div>
              </div>

              {/* 表示中のトラック（Me Scan / Mirror の初回で決まる。ここは訂正手段） */}
              <div style={{ borderTop: '1px solid rgba(232,228,220,0.15)', paddingTop: '20px', marginTop: '4px' }}>
                <p style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(232,228,220,0.75)', margin: '0 0 6px' }}>表示中のトラック</p>
                <p style={{ fontSize: '12px', color: 'rgba(232,228,220,0.55)', margin: '0 0 14px' }}>
                  最初に受けた Me Scan / Mirror で決まります。診断・Mirror・読み物・New Me Map がこの内容に切り替わります。
                </p>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {['fineme', 'belle'].map((id) => {
                    const t = TRACKS[id];
                    const isActive = trackId === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => switchTrack(id)}
                        style={{
                          flex: '1 1 160px', textAlign: 'left', cursor: isActive ? 'default' : 'pointer',
                          padding: '14px 16px', borderRadius: '12px', fontFamily: 'inherit',
                          background: isActive ? `rgba(${t.accentRgb},0.12)` : 'rgba(255,255,255,0.03)',
                          border: `1.5px solid rgba(${t.accentRgb},${isActive ? 0.55 : 0.2})`,
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{
                            width: '14px', height: '14px', borderRadius: '50%', flexShrink: 0,
                            border: `1.5px solid rgba(${t.accentRgb},0.7)`,
                            background: isActive ? t.accent : 'transparent',
                          }} />
                          <span style={{ fontSize: '14px', fontWeight: 800, color: 'rgba(232,228,220,0.92)' }}>{t.label}</span>
                        </span>
                        <span style={{ display: 'block', fontSize: '11px', color: 'rgba(232,228,220,0.5)', paddingLeft: '22px' }}>{t.subLabel}</span>
                      </button>
                    );
                  })}
                </div>
                {trackMsg && (
                  <p style={{ margin: '10px 0 0', fontSize: '13px', color: '#059669' }}>{trackMsg}</p>
                )}
              </div>

              {/* LINE 連携セクション */}
              <div style={{ borderTop: '1px solid rgba(232,228,220,0.15)', paddingTop: '20px', marginTop: '4px' }}>
                <p style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(232,228,220,0.75)', margin: '0 0 6px' }}>LINE 連携</p>
                <p style={{ fontSize: '12px', color: 'rgba(232,228,220,0.55)', margin: '0 0 14px' }}>連携すると、診断完了後に変容リマインドがLINEで届きます。</p>
                {lineUserId ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(6,200,99,0.07)', border: '1px solid rgba(6,200,99,0.3)', borderRadius: '10px', padding: '10px 14px' }}>
                    <span style={{ fontSize: '18px' }}>✅</span>
                    <div>
                      <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#059669' }}>LINE連携済み</p>
                      <p style={{ margin: 0, fontSize: '11px', color: 'rgba(232,228,220,0.55)' }}>リマインドが届く設定になっています</p>
                    </div>
                  </div>
                ) : (
                  <a
                    href={`/api/me/line-connect?user_id=${userId || ''}`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#06C755', color: '#fff', padding: '10px 20px', borderRadius: '10px', fontWeight: 700, fontSize: '14px', textDecoration: 'none' }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.077 2 11.1c0 2.65 1.09 5.03 2.844 6.73C4.59 18.97 4 20.516 4 22c0 .166.1.315.25.382C4.397 22.46 4.558 22.437 4.68 22.34L7.6 20H12c5.523 0 10-4.077 10-9.1C22 6.077 17.523 2 12 2z"/></svg>
                    LINEで連携する
                  </a>
                )}
                {lineMsg && (
                  <p style={{ margin: '10px 0 0', fontSize: '13px', color: lineMsg.includes('エラー') ? '#dc2626' : '#059669' }}>{lineMsg}</p>
                )}
              </div>

              {/* 掲載者への公開設定 */}
              <div style={{ borderTop: '1px solid rgba(232,228,220,0.15)', paddingTop: '20px', marginTop: '4px' }}>
                <p style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(232,228,220,0.75)', margin: '0 0 12px' }}>掲載者への公開設定</p>
                <p style={{ fontSize: '12px', color: 'rgba(232,228,220,0.55)', margin: '0 0 14px' }}>オンにした項目は、予約が承認された掲載者に公開されます。</p>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', marginBottom: '12px' }}>
                  <input
                    type="checkbox"
                    checked={shareDiagnosis}
                    onChange={e => setShareDiagnosis(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#2563eb', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '14px', color: 'rgba(232,228,220,0.90)' }}>診断結果を公開する</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={shareRoadmap}
                    onChange={e => setShareRoadmap(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#2563eb', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '14px', color: 'rgba(232,228,220,0.90)' }}>変容ロードマップを公開する</span>
                </label>
              </div>

              <div className="row" style={{ gap: '12px', alignItems: 'center' }}>
                <button className="btn" type="submit" disabled={saving}>
                  {saving ? '保存中...' : '保存'}
                </button>
                {message && <span className="muted" aria-live="polite">{message}</span>}
              </div>
            </div>
          </form>
        </section>
      </div>

      <style>{`
        .mypage-layout { display: grid; grid-template-columns: 200px 1fr; gap: 32px; align-items: start; }
        .mypage-sidenav { background: rgba(10,15,30,0.65); backdrop-filter: blur(8px); border: 1px solid rgba(201,168,76,0.28); border-radius: 14px; padding: 12px; position: sticky; top: 80px; }
        @media (max-width: 640px) { .mypage-layout { grid-template-columns: 1fr; } .mypage-sidenav { position: static; padding: 8px; border-radius: 12px; margin-bottom: 8px; overflow: hidden; } .mypage-sidenav nav { display: flex; flex-direction: row; overflow-x: auto; gap: 4px; scrollbar-width: none; } .mypage-sidenav nav::-webkit-scrollbar { display: none; } .mypage-sidenav nav > * { margin-top: 0 !important; } .sidenav-link { white-space: nowrap; padding: 6px 14px; font-size: 13px; flex-shrink: 0; } }
        .sidenav-link { display: block; padding: 8px 12px; border-radius: 8px; font-size: 14px; font-weight: 500; color: rgba(232,228,220,0.75); text-decoration: none; transition: background .15s; }
        .sidenav-link:hover { background: rgba(201,168,76,0.1); color: #0a0f1e; }
        .sidenav-link--active { background: rgba(201,168,76,0.14); font-weight: 700; color: #0a0f1e; border-left: 3px solid #c9a84c; padding-left: 9px; }
        .profile-label { display: grid; grid-template-columns: 160px 1fr; align-items: center; gap: 12px; }
        .profile-label input { grid-column: 2; width: 100%; min-width: 0; }
        .display-name-note { font-size: 11px; color: #9ca3af; margin: 6px 0 0 172px; }
        @media (max-width: 640px) { .profile-label { grid-template-columns: 1fr; } .profile-label input { grid-column: auto; } .display-name-note { margin-left: 0; } }
      `}</style>
    </main>
  );
}
