'use client';
import useTrack from '@/app/_hooks/useTrack';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const AXIS_LABELS = { body:'体型・ボディ', eyebrow:'眉毛', fashion:'服・コーデ', hair:'髪・ヘア', skin:'肌・エステ', teeth:'歯・口元', nail:'爪' };
const AXIS_ICONS  = { body:'💪', eyebrow:'✂️', fashion:'👔', hair:'💇', skin:'✨', teeth:'🦷', nail:'💅' };
const PATH_LABELS = { virgin:'初挑戦タイプ', quit:'リスタートタイプ', blind:'客観化タイプ', lapsed:'再開タイプ' };

export default function StorySubmitPage() {
  const { track } = useTrack();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [diagnosis, setDiagnosis] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [selectedReservation, setSelectedReservation] = useState(null);

  const [axisId, setAxisId] = useState('');
  const [pathType, setPathType] = useState('');
  const [providerName, setProviderName] = useState('');
  const [answers, setAnswers] = useState(['', '', '', '']);
  const [milestoneReached, setMilestoneReached] = useState('');

  const [accessToken, setAccessToken] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const sbKey = Object.keys(localStorage).find(
      k => k.startsWith('sb-') && k.endsWith('-auth-token')
    );
    if (!sbKey) { window.location.href = '/login'; return; }
    try {
      const obj = JSON.parse(localStorage.getItem(sbKey));
      const uid = obj?.user?.id;
      if (!uid) { window.location.href = '/login'; return; }
      setUserId(uid);
      setAccessToken(obj?.access_token || null);

      // 診断データ
      try {
        const raw = localStorage.getItem('fineme:diagnosis:latest');
        if (raw) {
          const d = JSON.parse(raw);
          setDiagnosis(d);
          if (d.compass_first) setAxisId(d.compass_first);
          const tvRaw = d.transform_vectors || {};
          const vectors = Array.isArray(tvRaw)
            ? tvRaw
            : Object.entries(tvRaw).map(([id, v]) => ({ id, ...v }));
          const compassVec = vectors.find(v => v.id === d.compass_first);
          if (compassVec?.path_type) setPathType(compassVec.path_type);
        }
      } catch {}

      // 閲覧履歴からプロバイダー名マップを作る（providerId → providerName）
      let historyMap = {};
      try {
        const hist = JSON.parse(localStorage.getItem('fineme:history') || '[]');
        hist.forEach(h => { if (h.providerId) historyMap[h.providerId] = h.providerName || ''; });
      } catch {}

      // 予約一覧を取得
      fetch(`/api/reservations?userId=${uid}`, {
        headers: obj?.access_token ? { 'Authorization': `Bearer ${obj.access_token}` } : {}
      })
        .then(r => r.ok ? r.json() : [])
        .then(data => {
          const approved = (data || []).filter(r =>
            r.status === 'approved' || r.status === 'completed'
          );
          // 閲覧履歴からプロバイダー名を補完
          const enriched = approved.map(r => ({
            ...r,
            providerNameResolved: historyMap[r.provider_id] || '',
          }));
          setReservations(enriched);
          setLoading(false);
        })
        .catch(() => { setReservations([]); setLoading(false); });
    } catch {
      window.location.href = '/login';
    }
  }, []);

  function selectReservation(res) {
    setSelectedReservation(res);
    if (res.providerNameResolved) setProviderName(res.providerNameResolved);
  }

  function setAnswer(i, val) {
    setAnswers(prev => { const a = [...prev]; a[i] = val; return a; });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!answers[0].trim() || !answers[1].trim()) {
      setError('Q1・Q2は必須です');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}) },
        body: JSON.stringify({
          answers,
          userId,
          providerId: selectedReservation?.provider_id || '',
          serviceName: providerName.trim() || null,
          axisId: axisId || null,
          pathType: pathType || null,
          milestoneReached: milestoneReached.trim() || null,
          tags: axisId ? [axisId] : [],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || '送信エラー');
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '60px' }}>読み込み中...</div>;

  if (done) {
    return (
      <main className="section">
        <div className="container" style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'rgba(232,228,220,0.90)', marginBottom: '10px' }}>体験談を投稿しました</h1>
          <p style={{ color: 'rgba(232,228,220,0.55)', fontSize: '14px', lineHeight: 1.7, marginBottom: '28px' }}>
            あなたの変容ストーリーは、同じ悩みを持つ誰かの「最初の一歩」になります。<br />
            投稿ありがとうございました。
          </p>
          <Link href="/mypage" className="btn" style={{ fontSize: '14px', padding: '10px 24px' }}>マイページに戻る</Link>
        </div>
      </main>
    );
  }

  const axisList = Object.keys(AXIS_LABELS);

  return (
    <main className="section">
      <div className="container mypage-layout">
        <aside className="mypage-sidenav">
          <nav className="stack" style={{ gap: '4px' }}>
            <Link href="/mypage" className="sidenav-link">ホーム</Link>
            <Link href={track.diagnosisResult} className="sidenav-link">診断結果</Link>
            <Link href="/mypage/navi" className="sidenav-link">New Me Map</Link>
            <Link href="/mypage/log" className="sidenav-link">New Me Log</Link>
            <Link href="/mypage/mirror" className="sidenav-link">Mirror履歴</Link>
            <Link href="/mypage/subscription" className="sidenav-link">サブスク設定</Link>
            <Link href="/mypage/favorites" className="sidenav-link">お気に入り</Link>
            <Link href="/mypage/history" className="sidenav-link">閲覧履歴</Link>
            <Link href="/my-reservations" className="sidenav-link">予約履歴</Link>
            <Link href="/mypage/story-submit" className="sidenav-link sidenav-link--active">体験談を書く</Link>
            <Link href="/mypage/profile" className="sidenav-link">プロフィール編集</Link>
          </nav>
        </aside>

        <section style={{ maxWidth: 640 }}>
          <div style={{ marginBottom: '24px' }}>
            <p style={{ fontSize: '11px', fontWeight: 800, color: '#6366f1', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '.06em' }}>変容の記録</p>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'rgba(232,228,220,0.90)', margin: '0 0 6px' }}>体験談を投稿する</h1>
            <p style={{ fontSize: '14px', color: 'rgba(232,228,220,0.55)', margin: 0, lineHeight: 1.6 }}>
              実際に利用・来店したサービスについての体験談を残しましょう。<br />同じ悩みを持つ人の地図になります。
            </p>
          </div>

          {/* STEP 1: 予約を選ぶ */}
          {!selectedReservation ? (
            <div>
              <p style={{ fontSize: '14px', fontWeight: 700, color: 'rgba(232,228,220,0.90)', marginBottom: '12px' }}>
                どの来店・サービス利用について書きますか？
              </p>

              {reservations.length === 0 ? (
                <div style={{ background: 'rgba(10,15,30,0.50)', border: '1px solid rgba(232,228,220,0.15)', borderRadius: '14px', padding: '32px 24px', textAlign: 'center', backdropFilter: 'blur(8px)' }}>
                  <p style={{ fontSize: '32px', margin: '0 0 12px' }}>📅</p>
                  <p style={{ fontSize: '15px', fontWeight: 700, color: 'rgba(232,228,220,0.75)', marginBottom: '8px' }}>
                    まだ承認済みの予約がありません
                  </p>
                  <p style={{ fontSize: '13px', color: 'rgba(232,228,220,0.55)', marginBottom: '20px', lineHeight: 1.6 }}>
                    体験談は、実際に利用・来店したサービスについてのみ投稿できます。<br />
                    まずはガイドを探して予約してみましょう。
                  </p>
                  <Link href="/search" className="btn" style={{ fontSize: '14px', padding: '10px 24px', textDecoration: 'none' }}>
                    ガイドを探す
                  </Link>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {reservations.map(res => {
                    const dateStr = res.reserved_date
                      ? new Date(res.reserved_date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
                      : '日付不明';
                    const name = res.providerNameResolved || `サービスID: ${res.provider_id?.slice(0, 8)}…`;
                    return (
                      <button
                        key={res.id}
                        type="button"
                        onClick={() => selectReservation(res)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '16px',
                          padding: '16px 20px', background: 'rgba(10,15,30,0.65)',
                          border: '1px solid rgba(232,228,220,0.15)', borderRadius: '14px',
                          cursor: 'pointer', textAlign: 'left', transition: 'border-color .15s, box-shadow .15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#c9a84c'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(201,168,76,.12)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(232,228,220,0.15)'; e.currentTarget.style.boxShadow = 'none'; }}
                      >
                        <div style={{ fontSize: '28px', flexShrink: 0 }}>🗓</div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: '15px', fontWeight: 700, color: 'rgba(232,228,220,0.90)', margin: '0 0 4px' }}>{name}</p>
                          <p style={{ fontSize: '13px', color: 'rgba(232,228,220,0.55)', margin: 0 }}>{dateStr}</p>
                        </div>
                        <div style={{ fontSize: '18px', color: '#c9a84c', flexShrink: 0 }}>→</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* STEP 2: 体験談フォーム */
            <form onSubmit={handleSubmit} className="stack" style={{ gap: '20px' }}>

              {/* 選択中の予約表示 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'rgba(201,168,76,0.06)', border: '1.5px solid rgba(201,168,76,0.3)', borderRadius: '12px' }}>
                <span style={{ fontSize: '20px' }}>🗓</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(232,228,220,0.90)', margin: 0 }}>
                    {providerName || '掲載者名を入力してください'}
                  </p>
                  <p style={{ fontSize: '12px', color: 'rgba(232,228,220,0.40)', margin: 0 }}>
                    {selectedReservation.reserved_date
                      ? new Date(selectedReservation.reserved_date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
                      : '日付不明'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setSelectedReservation(null); setProviderName(''); }}
                  style={{ fontSize: '12px', color: 'rgba(232,228,220,0.40)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
                >
                  変更
                </button>
              </div>

              {/* 掲載者・サービス名 */}
              <div className="form-block">
                <label className="form-label">掲載者・サービス名</label>
                <input
                  type="text"
                  value={providerName}
                  onChange={e => setProviderName(e.target.value)}
                  placeholder="例：〇〇パーソナルジム、田中スタイリストなど"
                  maxLength={100}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(232,228,220,0.15)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              {/* 変容軸 */}
              <div className="form-block">
                <label className="form-label">どの軸の体験ですか？</label>
                <p className="form-hint">{diagnosis?.compass_first ? `診断結果から「${AXIS_LABELS[diagnosis.compass_first]}」が自動選択されています` : '変容した分野を選んでください'}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                  {axisList.map(id => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setAxisId(id)}
                      style={{
                        padding: '7px 14px', borderRadius: '99px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                        background: axisId === id ? '#6366f1' : 'rgba(10,15,30,0.45)',
                        color: axisId === id ? '#fff' : 'rgba(232,228,220,0.75)',
                        border: axisId === id ? '1.5px solid #6366f1' : '1px solid rgba(232,228,220,0.15)',
                        transition: 'all .15s',
                      }}
                    >
                      {AXIS_ICONS[id]} {AXIS_LABELS[id]}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setAxisId('')}
                    style={{
                      padding: '7px 14px', borderRadius: '99px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                      background: axisId === '' ? '#6366f1' : 'rgba(10,15,30,0.45)',
                      color: axisId === '' ? '#fff' : 'rgba(232,228,220,0.75)',
                      border: axisId === '' ? '1.5px solid #6366f1' : '1px solid rgba(232,228,220,0.15)',
                    }}
                  >
                    指定しない
                  </button>
                </div>
              </div>

              {/* 来た道タイプ */}
              {axisId && (
                <div className="form-block">
                  <label className="form-label">来た道タイプ（任意）</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                    {Object.entries(PATH_LABELS).map(([val, label]) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setPathType(pathType === val ? '' : val)}
                        style={{
                          padding: '6px 14px', borderRadius: '99px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                          background: pathType === val ? '#e0e7ff' : 'rgba(10,15,30,0.45)',
                          color: pathType === val ? '#4f46e5' : 'rgba(232,228,220,0.55)',
                          border: pathType === val ? '1.5px solid #c7d2fe' : '1px solid rgba(232,228,220,0.15)',
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Q1 */}
              <div className="form-block">
                <label className="form-label">
                  <span className="q-badge required">Q1 必須</span>
                  変容前の悩みを教えてください
                </label>
                <p className="form-hint">外見・自信・恋愛など、どんな状態でしたか？</p>
                <textarea
                  value={answers[0]}
                  onChange={e => setAnswer(0, e.target.value)}
                  placeholder="例：ジムに3回通っては辞めるを繰り返し、自分はどうせ変われないと思っていた。"
                  maxLength={500}
                  rows={4}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(232,228,220,0.15)', fontSize: '14px', resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: 1.7 }}
                />
                <p style={{ fontSize: '11px', color: 'rgba(232,228,220,0.40)', margin: '4px 0 0', textAlign: 'right' }}>{answers[0].length}/500</p>
              </div>

              {/* Q2 */}
              <div className="form-block">
                <label className="form-label">
                  <span className="q-badge required">Q2 必須</span>
                  どんな変化がありましたか？
                </label>
                <p className="form-hint">外見・習慣・マインドなど、具体的に書くほど伝わります。</p>
                <textarea
                  value={answers[1]}
                  onChange={e => setAnswer(1, e.target.value)}
                  placeholder="例：週3で通えるようになり、3ヶ月でウエスト5cm減。鏡を見るのが楽しくなった。"
                  maxLength={600}
                  rows={4}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(232,228,220,0.15)', fontSize: '14px', resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: 1.7 }}
                />
                <p style={{ fontSize: '11px', color: 'rgba(232,228,220,0.40)', margin: '4px 0 0', textAlign: 'right' }}>{answers[1].length}/600</p>
              </div>

              {/* Q3 */}
              <div className="form-block">
                <label className="form-label">
                  <span className="q-badge optional">Q3 任意</span>
                  恋愛・人間関係への影響はありましたか？
                </label>
                <textarea
                  value={answers[2]}
                  onChange={e => setAnswer(2, e.target.value)}
                  placeholder="例：マッチングアプリで会う約束が取れるようになった。自信がついて話しかけやすくなった。"
                  maxLength={500}
                  rows={3}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(232,228,220,0.15)', fontSize: '14px', resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: 1.7 }}
                />
                <p style={{ fontSize: '11px', color: 'rgba(232,228,220,0.40)', margin: '4px 0 0', textAlign: 'right' }}>{answers[2].length}/500</p>
              </div>

              {/* Q4 */}
              <div className="form-block">
                <label className="form-label">
                  <span className="q-badge optional">Q4 任意</span>
                  どんな人におすすめしたいですか？
                </label>
                <textarea
                  value={answers[3]}
                  onChange={e => setAnswer(3, e.target.value)}
                  placeholder="例：過去の自分みたいに「どうせ変われない」と思っている人。ダイエットを何度も挫折した人。"
                  maxLength={400}
                  rows={3}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(232,228,220,0.15)', fontSize: '14px', resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: 1.7 }}
                />
                <p style={{ fontSize: '11px', color: 'rgba(232,228,220,0.40)', margin: '4px 0 0', textAlign: 'right' }}>{answers[3].length}/400</p>
              </div>

              {/* マイルストーン */}
              <div className="form-block">
                <label className="form-label">
                  <span className="q-badge optional">任意</span>
                  到達したマイルストーン・成果
                </label>
                <input
                  type="text"
                  value={milestoneReached}
                  onChange={e => setMilestoneReached(e.target.value)}
                  placeholder="例：ウエスト-5cm、マッチングアプリのマッチ率2倍、初めてスーツを褒められた"
                  maxLength={200}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(232,228,220,0.15)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              {error && (
                <p style={{ fontSize: '14px', color: '#ef4444', background: 'rgba(239,68,68,0.10)', padding: '10px 14px', borderRadius: '10px', margin: 0 }}>
                  {error}
                </p>
              )}

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', paddingTop: '4px' }}>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn"
                  style={{ fontSize: '15px', padding: '12px 28px', opacity: submitting ? 0.6 : 1 }}
                >
                  {submitting ? '送信中...' : '体験談を投稿する'}
                </button>
                <Link href="/mypage" className="muted" style={{ fontSize: '13px' }}>キャンセル</Link>
              </div>
            </form>
          )}
        </section>
      </div>

      <style>{`
        .mypage-layout { display: grid; grid-template-columns: 200px 1fr; gap: 32px; align-items: start; }
        .mypage-sidenav { background: rgba(10,15,30,0.65); backdrop-filter: blur(8px); border: 1px solid rgba(201,168,76,0.28); border-radius: 14px; padding: 12px; position: sticky; top: 80px; }
        @media (max-width: 640px) { .mypage-layout { grid-template-columns: 1fr; } .mypage-sidenav { position: static; padding: 8px; border-radius: 12px; margin-bottom: 8px; overflow: hidden; } .mypage-sidenav nav { display: flex; flex-direction: row; overflow-x: auto; gap: 4px; scrollbar-width: none; } .mypage-sidenav nav::-webkit-scrollbar { display: none; } .mypage-sidenav nav > * { margin-top: 0 !important; } .sidenav-link { white-space: nowrap; padding: 6px 14px; font-size: 13px; flex-shrink: 0; } }
        .sidenav-link { display: block; padding: 8px 12px; border-radius: 8px; font-size: 14px; font-weight: 500; color: rgba(232,228,220,0.75); text-decoration: none; transition: background .15s; }
        .sidenav-link:hover { background: rgba(201,168,76,0.1); color: #0a0f1e; }
        .sidenav-link--active { background: rgba(201,168,76,0.14); font-weight: 700; color: #0a0f1e; border-left: 3px solid #c9a84c; padding-left: 9px; }
        .form-block { display: flex; flex-direction: column; gap: 4px; }
        .form-label { font-size: 14px; font-weight: 700; color: rgba(232,228,220,0.90); display: flex; align-items: center; gap: 8px; }
        .form-hint { font-size: 12px; color: rgba(232,228,220,0.40); margin: 0; line-height: 1.5; }
        .q-badge { display: inline-block; font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 99px; letter-spacing: .04em; }
        .q-badge.required { background: #fef2f2; color: #ef4444; border: 1px solid #fecaca; }
        .q-badge.optional { background: rgba(10,15,30,0.45); color: rgba(232,228,220,0.40); border: 1px solid rgba(232,228,220,0.15); }
        textarea:focus, input:focus { border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,.1); }
      `}</style>
    </main>
  );
}
