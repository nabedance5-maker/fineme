'use client';
import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import PixelPurchase from './_PixelPurchase';

const LS_SESSIONS_KEY = 'fineme:mirror:sessions'; // ['session_id1', 'session_id2', ...]
const LS_ONE_POINT_KEY = 'fineme:mirror:one-point';

function saveSessionToLocal(sessionId) {
  try {
    const existing = JSON.parse(localStorage.getItem(LS_SESSIONS_KEY) || '[]');
    if (!existing.includes(sessionId)) {
      existing.unshift(sessionId);
      localStorage.setItem(LS_SESSIONS_KEY, JSON.stringify(existing.slice(0, 10)));
    }
  } catch {}
}

function getLocalSessionIds() {
  try { return JSON.parse(localStorage.getItem(LS_SESSIONS_KEY) || '[]'); } catch { return []; }
}

const COMPASS_TO_MIRROR_IDS = {
  body: ['body', 'posture'], eyebrow: ['eyebrow'], fashion: ['fashion', 'color'],
  hair: ['hair'], skin: ['skin'], teeth: [], nail: [],
};

function determineOnePoint(axes, compassFirst) {
  if (!axes?.length) return null;
  const visible = axes.filter(a => a.id !== 'overall');
  if (!visible.length) return null;
  if (compassFirst) {
    const mirrorIds = COMPASS_TO_MIRROR_IDS[compassFirst] || [];
    const hiMatch = visible.find(a => mirrorIds.includes(a.id) && a.potential_level === '高');
    if (hiMatch) return hiMatch;
    const anyMatch = visible.find(a => mirrorIds.includes(a.id));
    if (anyMatch) return anyMatch;
  }
  return visible.find(a => a.potential_level === '高') || visible[0];
}

function parseCompassAction(text) {
  const urlMatch = text.match(/→\s*(\/[^\s」\n]+)/);
  const url = urlMatch ? urlMatch[1].replace(/」/g, '') : null;
  const cleanText = url ? text.slice(0, text.indexOf('→')).trim() : text;
  return { cleanText, url };
}

const POTENTIAL_COLORS = {
  '高': { bg: 'rgba(201,168,76,0.12)', border: 'rgba(201,168,76,0.5)', text: '#c9a84c', label: '変容余地 高' },
  '中': { bg: 'rgba(100,160,255,0.10)', border: 'rgba(100,160,255,0.4)', text: '#7aadff', label: '変容余地 中' },
  '低': { bg: 'rgba(80,200,140,0.10)', border: 'rgba(80,200,140,0.4)', text: '#50c88c', label: 'すでに整っている' },
};

// 画像をCanvas経由で多段階圧縮・base64化（最終出力 < 4MB を保証）
async function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);

      function drawToCanvas(maxPx) {
        let { width, height } = img;
        if (width > maxPx || height > maxPx) {
          if (width > height) { height = Math.round(height * maxPx / width); width = maxPx; }
          else { width = Math.round(width * maxPx / height); height = maxPx; }
        }
        const c = document.createElement('canvas');
        c.width = width; c.height = height;
        c.getContext('2d').drawImage(img, 0, 0, width, height);
        return c;
      }

      const LIMIT = 4 * 1024 * 1024; // 4MB
      // 段階: [最大辺px, JPEG品質]
      const passes = [[1200, 0.85], [1200, 0.65], [900, 0.65], [720, 0.55], [600, 0.45]];
      for (const [maxPx, q] of passes) {
        const canvas = drawToCanvas(maxPx);
        const base64 = canvas.toDataURL('image/jpeg', q).split(',')[1];
        if (base64.length <= LIMIT) { resolve({ base64, media_type: 'image/jpeg' }); return; }
      }
      // フォールバック（ほぼ到達しないが念のため）
      const canvas = drawToCanvas(480);
      resolve({ base64: canvas.toDataURL('image/jpeg', 0.40).split(',')[1], media_type: 'image/jpeg' });
    };
    img.onerror = reject;
    img.src = url;
  });
}

export default function MirrorPage() {
  const [state, setState] = useState('idle'); // idle | analyzing | preview | full
  const [sessionId, setSessionId] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [error, setError] = useState('');
  const [purchasing, setPurchasing] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [pastSessions, setPastSessions] = useState([]);
  const [subStatus, setSubStatus] = useState(null); // { isActive, mirrorFreeRemaining }
  const [fbAccuracy, setFbAccuracy] = useState(0);
  const [fbRevisit, setFbRevisit] = useState(0);
  const [fbComment, setFbComment] = useState('');
  const [fbSent, setFbSent] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [myUserId, setMyUserId] = useState(null);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [onePointStatus, setOnePointStatus] = useState(null); // null | 'active' | 'done'
  const [determinedOnePoint, setDeterminedOnePoint] = useState(null);
  const fileInputRef = useRef(null);
  const dropRef = useRef(null);

  // Stripe支払い完了後のリダイレクト処理 + 過去セッション読み込み
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get('session_id');
    const purchased = params.get('purchased');

    // 友達紹介リンク（?ref=uuid）を捕捉して保存
    const refParam = params.get('ref');
    if (refParam) { try { localStorage.setItem('fineme:mirror:ref', refParam); } catch {} }

    if (sid && purchased === '1') {
      setState('analyzing');
      setSessionId(sid);
      saveSessionToLocal(sid);
      fetch(`/api/mirror/result?session_id=${sid}`)
        .then(r => r.json())
        .then(data => {
          if (data.paid && data.analysis) {
            setAnalysis(data.analysis);
            setState('full');
            window.history.replaceState({}, '', '/mirror');
          } else {
            setError('支払確認中にエラーが発生しました。しばらくしてから再度お試しください。');
            setState('idle');
          }
        })
        .catch(() => { setError('通信エラーが発生しました。'); setState('idle'); });
      return;
    }

    if (sid) {
      // ログイン後のリダイレクト等でsession_idが付いている場合、プレビューを復元
      setState('analyzing');
      setSessionId(sid);
      saveSessionToLocal(sid);
      fetch(`/api/mirror/result?session_id=${sid}`)
        .then(r => r.json())
        .then(data => {
          if (data.analysis) {
            setAnalysis(data.analysis);
            setState(data.paid ? 'full' : 'preview');
          } else {
            setState('idle');
          }
        })
        .catch(() => setState('idle'));
      window.history.replaceState({}, '', '/mirror');
    }

    let authUserId = null, authToken = null;
    try {
      const sbKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
      if (sbKey) {
        const obj = JSON.parse(localStorage.getItem(sbKey) || 'null');
        authUserId = obj?.user?.id || null;
        authToken = obj?.access_token || null;
      }
    } catch {}
    if (authUserId) setMyUserId(authUserId);

    // ゲスト時代（未ログイン決済）のMirrorセッションをログイン中のアカウントに紐付ける
    if (authUserId && authToken) {
      const localIdsForClaim = getLocalSessionIds();
      if (localIdsForClaim.length) {
        fetch('/api/mirror/claim-sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
          body: JSON.stringify({ session_ids: localIdsForClaim }),
        }).catch(() => {});
      }
    }

    const loadPastSessions = async () => {
      const localIds = getLocalSessionIds();
      if (!authUserId && !localIds.length) return;
      const url = authUserId
        ? `/api/mirror/sessions?user_id=${authUserId}`
        : `/api/mirror/sessions?ids=${localIds.join(',')}`;
      try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.sessions?.length) setPastSessions(data.sessions);
      } catch {}
    };

    const loadSubStatus = async () => {
      if (!authToken) return;
      try {
        const res = await fetch('/api/subscription/status', {
          headers: { 'Authorization': `Bearer ${authToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          setSubStatus({ isActive: data.isActive, mirrorFreeRemaining: data.mirrorFreeRemaining ?? 0 });
        }
      } catch {}
    };

    loadPastSessions();
    loadSubStatus();

    try { if (localStorage.getItem('fineme:mirror:feedback:sent') === '1') setFbSent(true); } catch {}
    try { const op = JSON.parse(localStorage.getItem(LS_ONE_POINT_KEY) || 'null'); if (op?.status) setOnePointStatus(op.status); } catch {}
  }, []);

  useEffect(() => {
    if (state !== 'full' || !analysis?.axes?.length) return;
    let cf = null;
    try { const d = JSON.parse(localStorage.getItem('fineme:diagnosis:latest') || 'null'); cf = d?.compass_first || null; } catch {}
    setDeterminedOnePoint(determineOnePoint(analysis.axes, cf));
  }, [state, analysis]);

  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) {
      setError('画像ファイルを選択してください（JPEG/PNG/WebP）');
      return;
    }
    setPreviewFile(URL.createObjectURL(file));
    setError('');
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleAnalyze = async () => {
    const file = fileInputRef.current?.files[0];
    if (!file) { setError('写真を選択してください'); return; }
    setError('');
    setCompressing(true);

    let base64, media_type;
    try {
      ({ base64, media_type } = await compressImage(file));
    } catch {
      setError('画像の読み込みに失敗しました。別の画像をお試しください。');
      setCompressing(false);
      return;
    }
    setCompressing(false);
    setState('analyzing');

    try {
      const sbKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
      let userId = null;
      if (sbKey) {
        const obj = JSON.parse(localStorage.getItem(sbKey) || 'null');
        userId = obj?.user?.id || null;
      }

      // Me Scan診断データ確認（ユーザー状態の判定）
      let diagnosisInfo = null;
      try {
        const diagRaw = localStorage.getItem('fineme:diagnosis:latest');
        if (diagRaw) {
          const diag = JSON.parse(diagRaw);
          diagnosisInfo = {
            compass_first: diag.compass_first || null,
            priority_order: (diag.priority_order || []).slice(0, 3),
          };
        }
      } catch {}
      const userState = !userId ? 'guest' : diagnosisInfo ? 'diagnosed' : 'member';

      let ref = null;
      try { ref = localStorage.getItem('fineme:mirror:ref') || null; } catch {}

      const res = await fetch('/api/mirror/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo_base64: base64, media_type, user_id: userId, user_state: userState, diagnosis_info: diagnosisInfo, ref }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '分析に失敗しました');

      setSessionId(data.session_id);
      setAnalysis(data.analysis);
      saveSessionToLocal(data.session_id);
      setState(data.paid ? 'full' : 'preview');
    } catch (e) {
      setError(e.message);
      setState('idle');
    }
  };

  const handlePurchase = async () => {
    if (!sessionId) return;
    // 未ログインなら決済前にアカウント作成/ログインへ誘導（払い損防止）
    if (!myUserId) {
      window.location.href = '/auth/login?redirect=' + encodeURIComponent('/mirror?session_id=' + sessionId);
      return;
    }
    setPurchasing(true);
    try {
      const res = await fetch('/api/mirror/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '決済エラー');
      window.location.href = data.url;
    } catch (e) {
      setError(e.message);
      setPurchasing(false);
    }
  };

  const handleSubscribeCheckout = async () => {
    setSubscribing(true);
    try {
      const sbKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
      const token = sbKey ? JSON.parse(localStorage.getItem(sbKey) || 'null')?.access_token : null;
      if (!token) {
        // ログイン後にMirrorのセッションを引き継いで戻れるようにsession_idをredirectに含める
        const redirectTarget = sessionId
          ? `/mirror?session_id=${sessionId}`
          : '/mypage/subscription';
        window.location.href = `/auth/login?redirect=${encodeURIComponent(redirectTarget)}`;
        return;
      }
      const res = await fetch('/api/subscription/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setError('サブスク申込みに失敗しました');
    } catch (e) { setError(e.message); }
    finally { setSubscribing(false); }
  };

  const submitFeedback = async () => {
    if (!fbAccuracy && !fbRevisit && !fbComment.trim()) return;
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page: 'mirror',
          rating_accuracy: fbAccuracy || null,
          rating_revisit: fbRevisit || null,
          comment: fbComment.trim() || null,
        }),
      });
    } catch {}
    try { localStorage.setItem('fineme:mirror:feedback:sent', '1'); } catch {}
    setFbSent(true);
  };

  const shareUrl = () => `${window.location.origin}/mirror/s/${sessionId}`;
  const SHARE_TEXT = '写真1枚で、AIが「変われる余白」を地図にしてくれた。あなたの変容余地マップも見てみて🪞';
  const shareX = () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(SHARE_TEXT)}&url=${encodeURIComponent(shareUrl())}`, '_blank', 'noopener');
  const shareLINE = () => window.open(`https://line.me/R/msg/text/?${encodeURIComponent(SHARE_TEXT + '\n' + shareUrl())}`, '_blank', 'noopener');
  const copyShareLink = async () => {
    try { await navigator.clipboard.writeText(shareUrl()); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000); } catch {}
  };

  const inviteUrl = () => `${window.location.origin}/mirror?ref=${myUserId}`;
  const copyInvite = async () => {
    try { await navigator.clipboard.writeText(inviteUrl()); setInviteCopied(true); setTimeout(() => setInviteCopied(false), 2000); } catch {}
  };

  return (
    <main style={{ minHeight: '100vh', background: 'rgba(10,15,30,0.97)', paddingBottom: '80px' }}>
      <Suspense fallback={null}><PixelPurchase /></Suspense>
      <style>{`
        .mirror-hero { padding: 64px 20px 40px; text-align: center; }
        .mirror-badge { display: inline-block; font-size: 10px; font-weight: 800; letter-spacing: .18em; color: rgba(201,168,76,0.7); text-transform: uppercase; margin-bottom: 16px; }
        .mirror-title { font-family: 'Playfair Display', Georgia, serif; font-size: clamp(32px, 7vw, 52px); font-weight: 900; color: #e8e4dc; line-height: 1.1; margin: 0 0 16px; }
        .mirror-subtitle { font-size: clamp(14px, 2.5vw, 16px); color: rgba(232,228,220,0.55); line-height: 1.8; max-width: 520px; margin: 0 auto 12px; }
        .privacy-note { font-size: 11px; color: rgba(232,228,220,0.35); max-width: 480px; margin: 0 auto; line-height: 1.6; }
        .upload-area { max-width: 560px; margin: 0 auto 32px; padding: 0 20px; }
        .drop-zone { border: 2px dashed rgba(201,168,76,0.35); border-radius: 16px; padding: 48px 20px; text-align: center; cursor: pointer; transition: border-color .2s, background .2s; background: rgba(201,168,76,0.03); }
        .drop-zone:hover, .drop-zone.dragover { border-color: rgba(201,168,76,0.7); background: rgba(201,168,76,0.06); }
        .drop-icon { font-size: 48px; margin-bottom: 16px; }
        .drop-text { font-size: 15px; color: rgba(232,228,220,0.6); margin-bottom: 8px; }
        .drop-sub { font-size: 12px; color: rgba(232,228,220,0.35); }
        .preview-img { width: 100%; max-height: 280px; object-fit: contain; border-radius: 12px; margin-top: 16px; }
        .analyze-btn { display: block; width: 100%; padding: 16px; background: linear-gradient(135deg,#c9a84c,#e8c97a); border: none; border-radius: 12px; font-size: 16px; font-weight: 800; color: #0a0f1e; cursor: pointer; margin-top: 16px; transition: opacity .2s; }
        .analyze-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .error-msg { color: #f87171; font-size: 13px; text-align: center; margin-top: 10px; }
        .analyzing-wrap { max-width: 400px; margin: 60px auto; text-align: center; padding: 0 20px; }
        .analyzing-spinner { width: 56px; height: 56px; border: 3px solid rgba(201,168,76,0.2); border-top-color: #c9a84c; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 24px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .results-wrap { max-width: 680px; margin: 0 auto; padding: 0 20px; }
        .first-impression { background: rgba(201,168,76,0.06); border: 1px solid rgba(201,168,76,0.2); border-radius: 16px; padding: 24px; margin-bottom: 32px; font-size: 15px; color: rgba(232,228,220,0.85); line-height: 1.8; }
        .axis-card { background: rgba(10,15,30,0.6); border-radius: 14px; padding: 20px; margin-bottom: 16px; position: relative; overflow: hidden; }
        .axis-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
        .axis-icon { font-size: 24px; }
        .axis-name { font-size: 15px; font-weight: 800; color: #e8e4dc; flex: 1; }
        .axis-badge { font-size: 10px; font-weight: 800; padding: 3px 10px; border-radius: 20px; letter-spacing: .06em; white-space: nowrap; }
        .axis-summary { font-size: 14px; color: rgba(232,228,220,0.7); line-height: 1.75; margin-bottom: 14px; }
        .axis-detail { font-size: 14px; color: rgba(232,228,220,0.7); line-height: 1.75; margin-bottom: 14px; }
        .axis-hints { list-style: none; padding: 0; margin: 0 0 14px; display: flex; flex-direction: column; gap: 6px; }
        .axis-hints li { font-size: 13px; color: rgba(232,228,220,0.65); padding-left: 18px; position: relative; line-height: 1.6; }
        .axis-hints li::before { content: '→'; position: absolute; left: 0; color: #c9a84c; font-weight: 700; }
        .compass-action { background: rgba(201,168,76,0.07); border-left: 3px solid rgba(201,168,76,0.5); padding: 10px 14px; border-radius: 0 8px 8px 0; font-size: 13px; color: rgba(232,228,220,0.75); line-height: 1.6; transition: background .15s; }
        a:hover .compass-action { background: rgba(201,168,76,0.14); }
        .compass-action-label { font-size: 10px; font-weight: 800; color: rgba(201,168,76,0.6); letter-spacing: .12em; text-transform: uppercase; margin-bottom: 4px; }
        .paywall-overlay { position: relative; margin-top: -8px; }
        .paywall-blur { filter: blur(5px); user-select: none; pointer-events: none; opacity: 0.5; max-height: 120px; overflow: hidden; }
        .paywall-cta { background: linear-gradient(to bottom, transparent, rgba(10,15,30,0.97) 40%); padding: 40px 24px 24px; text-align: center; }
        .paywall-title { font-family: 'Playfair Display', Georgia, serif; font-size: 18px; font-weight: 800; color: #e8e4dc; margin-bottom: 8px; }
        .paywall-desc { font-size: 13px; color: rgba(232,228,220,0.55); margin-bottom: 20px; line-height: 1.7; }
        .purchase-btn { display: inline-flex; align-items: center; gap: 8px; padding: 15px 32px; background: linear-gradient(135deg,#c9a84c,#e8c97a); border: none; border-radius: 12px; font-size: 15px; font-weight: 800; color: #0a0f1e; cursor: pointer; transition: opacity .2s; box-shadow: 0 0 32px rgba(201,168,76,0.3); }
        .purchase-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .purchase-note { font-size: 11px; color: rgba(232,228,220,0.35); margin-top: 10px; }
        .full-badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(201,168,76,0.1); border: 1px solid rgba(201,168,76,0.3); border-radius: 20px; padding: 6px 16px; font-size: 12px; color: #c9a84c; font-weight: 700; margin-bottom: 24px; }
        .overall-msg { background: rgba(201,168,76,0.05); border: 1px solid rgba(201,168,76,0.15); border-radius: 14px; padding: 24px; text-align: center; margin-top: 32px; font-family: 'Noto Serif JP', Georgia, serif; font-size: 16px; color: rgba(232,228,220,0.85); line-height: 1.8; }
        .retry-btn { display: block; margin: 24px auto 0; padding: 12px 28px; background: transparent; border: 1px solid rgba(232,228,220,0.2); border-radius: 10px; color: rgba(232,228,220,0.5); font-size: 13px; cursor: pointer; }
        .retry-btn:hover { border-color: rgba(232,228,220,0.4); color: rgba(232,228,220,0.7); }
      `}</style>

      {/* ヒーロー */}
      <div className="mirror-hero">
        <p className="mirror-badge">Fineme Mirror</p>
        <p className="mirror-subtitle">
          写真1枚。AIがあなたの「変われる余白」を地図にする。<br />
          スコアじゃない。あなたの可能性の見取り図。
        </p>
        {state === 'idle' && (
          <p className="privacy-note">
            📷 写真はAI分析のみに使用し、サーバーには保存されません。<br />
            分析完了と同時に削除されます。
          </p>
        )}
      </div>

      {/* アップロード */}
      {state === 'idle' && (
        <div className="upload-area">
          <div
            ref={dropRef}
            className="drop-zone"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); dropRef.current?.classList.add('dragover'); }}
            onDragLeave={() => dropRef.current?.classList.remove('dragover')}
            onDrop={(e) => { dropRef.current?.classList.remove('dragover'); handleDrop(e); }}
          >
            {previewFile ? (
              <img src={previewFile} alt="プレビュー" className="preview-img" />
            ) : (
              <>
                <div className="drop-icon">🪞</div>
                <p className="drop-text">写真をドラッグ＆ドロップ<br />またはタップして選択</p>
                <p className="drop-sub">顔写真 or 全身写真（JPEG/PNG/WebP）</p>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => { const f = e.target.files[0]; if (f) handleFile(f); }}
          />
          {/* サブスク残回数バッジ */}
          {subStatus?.isActive && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              marginTop: '14px', marginBottom: '4px',
            }}>
              {subStatus.mirrorFreeRemaining > 0 ? (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  background: 'rgba(80,200,140,0.10)', border: '1px solid rgba(80,200,140,0.35)',
                  borderRadius: '20px', padding: '5px 14px',
                  fontSize: '12px', fontWeight: '800', color: '#50c88c',
                }}>
                  ✓ 今月あと<span style={{ fontSize: '15px' }}>{subStatus.mirrorFreeRemaining}</span>回無料
                </span>
              ) : (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  background: 'rgba(232,228,220,0.05)', border: '1px solid rgba(232,228,220,0.12)',
                  borderRadius: '20px', padding: '5px 14px',
                  fontSize: '12px', fontWeight: '700', color: 'rgba(232,228,220,0.4)',
                }}>
                  今月の無料枠を使い切りました（¥500/回）
                </span>
              )}
            </div>
          )}

          <button
            className="analyze-btn"
            onClick={handleAnalyze}
            disabled={!previewFile || compressing}
          >
            {compressing ? '📐 画像を最適化中…' : '🔍 変容余地を分析する'}
          </button>
          {error && <p className="error-msg">{error}</p>}

          <p style={{ fontSize: '12px', color: 'rgba(232,228,220,0.3)', textAlign: 'center', marginTop: '16px', lineHeight: '1.6' }}>
            Me Scanを受けた方は、Compassとの連動アクション提案も表示されます。
          </p>

          {/* 過去セッション */}
          {pastSessions.length > 0 && (
            <div style={{ marginTop: '32px', borderTop: '1px solid rgba(232,228,220,0.08)', paddingTop: '24px' }}>
              <p style={{ fontSize: '11px', fontWeight: '800', color: 'rgba(232,228,220,0.35)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: '12px', textAlign: 'center' }}>
                過去の分析結果
              </p>
              {pastSessions.map(s => (
                <button
                  key={s.id}
                  onClick={() => {
                    setState('analyzing');
                    const endpoint = s.paid
                      ? `/api/mirror/result?session_id=${s.id}`
                      : null;
                    if (!endpoint) {
                      // 未購入プレビューを再表示するには analyze API の結果が必要（session_idだけでは取得不可）
                      // → 再分析を促す
                      setError('この結果の無料プレビューは再表示できません。新しい写真で再分析してください。');
                      setState('idle');
                      return;
                    }
                    fetch(endpoint)
                      .then(r => r.json())
                      .then(data => {
                        if (data.paid && data.analysis) {
                          setAnalysis(data.analysis);
                          setSessionId(s.id);
                          setState('full');
                        }
                      })
                      .catch(() => { setError('読み込みエラーが発生しました。'); setState('idle'); });
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%', background: 'rgba(10,15,30,0.6)',
                    border: '1px solid rgba(232,228,220,0.1)', borderRadius: '10px',
                    padding: '12px 16px', marginBottom: '8px', cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <div>
                    <p style={{ fontSize: '12px', color: 'rgba(232,228,220,0.5)', margin: '0 0 4px' }}>
                      {new Date(s.created_at).toLocaleDateString('ja-JP')} — {s.axes_count}軸分析
                    </p>
                    <p style={{ fontSize: '13px', color: 'rgba(232,228,220,0.75)', margin: 0, lineHeight: '1.5',
                      overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {s.first_impression}
                    </p>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: '800', marginLeft: '12px', flexShrink: 0,
                    color: s.paid ? '#50c88c' : 'rgba(201,168,76,0.6)',
                    background: s.paid ? 'rgba(80,200,140,0.1)' : 'rgba(201,168,76,0.08)',
                    border: `1px solid ${s.paid ? 'rgba(80,200,140,0.3)' : 'rgba(201,168,76,0.2)'}`,
                    borderRadius: '20px', padding: '3px 10px' }}>
                    {s.paid ? '購入済み' : '無料版'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 分析中 */}
      {state === 'analyzing' && (
        <div className="analyzing-wrap">
          <div className="analyzing-spinner" />
          <p style={{ color: 'rgba(232,228,220,0.6)', fontSize: '15px', marginBottom: '8px' }}>
            AIが外見を分析中…
          </p>
          <p style={{ color: 'rgba(232,228,220,0.35)', fontSize: '12px' }}>
            30〜60秒ほどかかります。そのままお待ちください。
          </p>
        </div>
      )}

      {/* 結果（preview / full 共通） */}
      {(state === 'preview' || state === 'full') && analysis && (
        <div className="results-wrap">
          {state === 'full' && (
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
              <span className="full-badge">✨ フル版 — 全軸の詳細分析</span>
            </div>
          )}

          {previewFile && (
            <div style={{ position: 'relative', width: '96px', margin: '0 auto 24px' }}>
              <img
                src={previewFile}
                alt="分析した写真"
                style={{ width: '96px', height: '96px', objectFit: 'cover', objectPosition: 'center top', borderRadius: '50%', border: '2px solid rgba(201,168,76,0.4)', display: 'block' }}
              />
              <span style={{ position: 'absolute', bottom: 0, right: 0, fontSize: '16px', lineHeight: 1 }}>🪞</span>
            </div>
          )}

          {/* 第一印象 */}
          <div className="first-impression">
            <p style={{ fontSize: '11px', fontWeight: '800', color: 'rgba(201,168,76,0.6)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: '10px' }}>First Impression</p>
            {analysis.first_impression}
          </div>

          {/* 軸カード */}
          {analysis.axes?.map((axis, i) => {
            const pot = POTENTIAL_COLORS[axis.potential_level] || POTENTIAL_COLORS['中'];
            const isPaywalled = state === 'preview' && i >= 1;

            return (
              <div
                key={axis.id || i}
                className="axis-card"
                style={{ border: `1px solid ${pot.border}` }}
              >
                <div className="axis-header">
                  <span className="axis-icon">{axis.icon}</span>
                  <span className="axis-name">{axis.name}</span>
                  <span
                    className="axis-badge"
                    style={{ background: pot.bg, border: `1px solid ${pot.border}`, color: pot.text }}
                  >
                    {pot.label}
                  </span>
                </div>

                <p className="axis-summary">{axis.summary}</p>

                {isPaywalled ? (
                  /* ペイウォール */
                  <div className="paywall-overlay">
                    <div className="paywall-blur">
                      <p className="axis-detail">{axis.detail}</p>
                      <ul className="axis-hints">
                        {(axis.hints || []).map((h, j) => <li key={j}>{h}</li>)}
                      </ul>
                    </div>
                  </div>
                ) : (
                  /* フル表示 */
                  <>
                    {axis.detail && <p className="axis-detail">{axis.detail}</p>}
                    {axis.hints?.length > 0 && (
                      <ul className="axis-hints">
                        {axis.hints.map((h, j) => <li key={j}>{h}</li>)}
                      </ul>
                    )}
                    {axis.compass_action && (() => {
                      const { cleanText, url } = parseCompassAction(axis.compass_action);
                      const inner = (
                        <div className="compass-action" style={url ? { cursor: 'pointer' } : {}}>
                          <p className="compass-action-label">🧭 Compass アクション {url && '→'}</p>
                          {cleanText}
                        </div>
                      );
                      return url
                        ? <a href={url} style={{ textDecoration: 'none', display: 'block' }}>{inner}</a>
                        : inner;
                    })()}
                  </>
                )}
              </div>
            );
          })}

          {/* ペイウォールCTA（previewのみ） */}
          {state === 'preview' && (
            <div style={{ background: 'rgba(10,15,30,0.97)', borderRadius: '16px', padding: '32px 24px', textAlign: 'center', border: '1px solid rgba(201,168,76,0.2)', marginTop: '8px' }}>
              <p style={{ fontSize: '11px', color: 'rgba(201,168,76,0.6)', fontWeight: '800', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: '12px' }}>
                残り {(analysis.axes?.length || 0) - 1} 軸の詳細分析
              </p>
              <p className="paywall-title">詳細な地図を手に入れる</p>
              <p className="paywall-desc">
                各軸の詳細分析・具体的な改善ヒント・<br />
                Me ScanのCompassに連動した「最初の一手」提案
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                <button
                  className="purchase-btn"
                  onClick={handlePurchase}
                  disabled={purchasing}
                >
                  {purchasing ? '決済画面に移動中…' : '🪞 ¥500 で全体を見る'}
                </button>

                {!subStatus?.isActive && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <button
                      onClick={handleSubscribeCheckout}
                      disabled={subscribing}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                        padding: '13px 28px',
                        border: '1px solid rgba(201,168,76,0.5)',
                        borderRadius: '12px',
                        fontSize: '14px', fontWeight: '800',
                        color: '#c9a84c',
                        background: 'rgba(201,168,76,0.06)',
                        cursor: subscribing ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      {subscribing ? '処理中…' : '♾️ ¥780/月 — 月3回まで無料で使う'}
                    </button>
                    <span style={{ fontSize: '11px', color: 'rgba(232,228,220,0.35)' }}>
                      ¥500 で1回 → 月3回使うなら ¥780/月 のほうがお得
                    </span>
                  </div>
                )}
              </div>

              <p className="purchase-note" style={{ marginTop: '12px' }}>
                {subStatus?.isActive
                  ? 'クレジットカード決済 / 7日間有効 / 一度購入すると再閲覧可能'
                  : '単発¥500 または サブスク¥780/月（月3回分含む・いつでも解約可）'}
              </p>
              {error && <p className="error-msg" style={{ marginTop: '12px' }}>{error}</p>}
            </div>
          )}

          {/* シェア（preview / full 共通・sessionIdがある時） */}
          {sessionId && (
            <div style={{ marginTop: '24px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(232,228,220,0.1)', borderRadius: '14px', padding: '20px', textAlign: 'center' }}>
              <p style={{ fontSize: '13px', fontWeight: '800', color: 'rgba(232,228,220,0.8)', margin: '0 0 4px' }}>
                この結果をシェアする
              </p>
              <p style={{ fontSize: '11px', color: 'rgba(232,228,220,0.4)', margin: '0 0 16px', lineHeight: 1.6 }}>
                共有されるのは概要のみ。写真や詳細分析は表示されません。
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button onClick={shareX} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 18px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(232,228,220,0.18)', borderRadius: '10px', color: 'rgba(232,228,220,0.85)', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
                  𝕏 でシェア
                </button>
                <button onClick={shareLINE} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 18px', background: 'rgba(6,199,85,0.12)', border: '1px solid rgba(6,199,85,0.4)', borderRadius: '10px', color: '#06c755', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
                  LINEで送る
                </button>
                <button onClick={copyShareLink} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 18px', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.35)', borderRadius: '10px', color: '#c9a84c', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
                  {linkCopied ? '✓ コピーしました' : '🔗 リンクをコピー'}
                </button>
              </div>
            </div>
          )}

          {/* 全体メッセージ（fullのみ） */}
          {state === 'full' && analysis.overall_message && (
            <div className="overall-msg">
              {analysis.overall_message}
            </div>
          )}

          {/* 動かす1点（fullのみ） */}
          {state === 'full' && determinedOnePoint && (() => {
            const isDone = onePointStatus === 'done';
            const isActive = onePointStatus === 'active';
            const saveOnePoint = (nextStatus) => {
              const entry = { axisId: determinedOnePoint.id, axisName: determinedOnePoint.name, axisIcon: determinedOnePoint.icon, status: nextStatus, savedAt: new Date().toISOString() };
              try { localStorage.setItem(LS_ONE_POINT_KEY, JSON.stringify(entry)); } catch {}
              setOnePointStatus(nextStatus);
            };
            return (
              <div style={{ marginTop: '24px', background: isDone ? 'rgba(16,185,129,0.06)' : 'rgba(201,168,76,0.05)', border: `1px solid ${isDone ? 'rgba(16,185,129,0.3)' : 'rgba(201,168,76,0.25)'}`, borderRadius: '16px', padding: '20px 22px' }}>
                <p style={{ fontSize: '10px', fontWeight: 800, color: isDone ? 'rgba(16,185,129,0.7)' : 'rgba(201,168,76,0.6)', letterSpacing: '.12em', textTransform: 'uppercase', margin: '0 0 10px' }}>
                  {isDone ? '✓ この30日で動かした1点' : 'この30日で動かす1点'}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: isDone ? '0' : '14px' }}>
                  <span style={{ fontSize: '28px', flexShrink: 0 }}>{determinedOnePoint.icon}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '15px', fontWeight: 800, color: '#e8e4dc', margin: '0 0 3px' }}>{determinedOnePoint.name}</p>
                    <p style={{ fontSize: '12px', color: 'rgba(232,228,220,0.5)', margin: 0, lineHeight: 1.55 }}>この1点だけ、今月やってみよう</p>
                  </div>
                  {isDone && <span style={{ fontSize: '22px', color: '#10b981', flexShrink: 0 }}>✓</span>}
                </div>
                {!isDone && (
                  <button
                    onClick={() => saveOnePoint(isActive ? 'done' : 'active')}
                    style={{ display: 'block', width: '100%', padding: '12px', background: isActive ? 'rgba(16,185,129,0.12)' : 'rgba(201,168,76,0.08)', border: `1px solid ${isActive ? 'rgba(16,185,129,0.35)' : 'rgba(201,168,76,0.3)'}`, borderRadius: '10px', fontSize: '13px', fontWeight: 800, color: isActive ? '#10b981' : '#c9a84c', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    {isActive ? 'やった！（完了を記録）' : '今月やってみる →'}
                  </button>
                )}
                {isDone && (
                  <p style={{ fontSize: '11px', color: 'rgba(16,185,129,0.6)', margin: 0, textAlign: 'center' }}>
                    New Me Map で進捗を確認 → <a href="/mypage/navi" style={{ color: '#10b981', textDecoration: 'none' }}>マイページ</a>
                  </p>
                )}
              </div>
            );
          })()}

          {/* New Me Map 生成CTA（fullのみ） */}
          {state === 'full' && (
            <div style={{ marginTop: '24px', background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '16px', padding: '28px 24px', textAlign: 'center' }}>
              <p style={{ fontSize: '11px', fontWeight: '800', color: 'rgba(201,168,76,0.6)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: '12px' }}>
                次のステップ
              </p>
              <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '17px', fontWeight: '800', color: '#e8e4dc', marginBottom: '8px' }}>
                このデータで New Me Map を生成する
              </p>
              <p style={{ fontSize: '13px', color: 'rgba(232,228,220,0.5)', marginBottom: '20px', lineHeight: '1.7' }}>
                Mirror の変容余地データが、あなた専用の行動ロードマップに変わります。
              </p>
              <button
                onClick={() => {
                  let loggedIn = false;
                  try {
                    const sbKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
                    if (sbKey) loggedIn = !!JSON.parse(localStorage.getItem(sbKey) || 'null')?.user?.id;
                  } catch {}
                  window.location.href = loggedIn ? '/mypage/navi?from=mirror' : '/auth/login?redirect=/mypage/navi?from=mirror';
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '15px 32px', background: 'linear-gradient(135deg,#c9a84c,#e8c97a)', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '800', color: '#0a0f1e', cursor: 'pointer', boxShadow: '0 0 24px rgba(201,168,76,0.25)' }}
              >
                🗺️ New Me Map を生成する →
              </button>
            </div>
          )}

          {/* サブスク upsell（full・非サブスク加入者のみ） */}
          {state === 'full' && !subStatus?.isActive && (
            <div style={{ marginTop: '16px', background: 'rgba(10,30,20,0.7)', border: '1px solid rgba(80,200,140,0.3)', borderRadius: '16px', padding: '24px', textAlign: 'center' }}>
              <p style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '.12em', color: 'rgba(80,200,140,0.6)', textTransform: 'uppercase', margin: '0 0 10px' }}>
                毎月続ける
              </p>
              <p style={{ fontSize: '16px', fontWeight: 800, color: '#e8e4dc', margin: '0 0 6px' }}>
                ¥780/月で、毎月この分析が3回無料に
              </p>
              <p style={{ fontSize: '13px', color: 'rgba(232,228,220,0.55)', margin: '0 0 16px', lineHeight: 1.7 }}>
                今回の ¥500 は1回分。サブスクなら月3回まで追加料金なし。<br />
                変容の軌跡（月次比較）も自動で蓄積されます。
              </p>
              <div style={{ display: 'inline-flex', gap: '12px', alignItems: 'center', background: 'rgba(80,200,140,0.08)', border: '1px solid rgba(80,200,140,0.2)', borderRadius: '10px', padding: '8px 16px', marginBottom: '20px', fontSize: '12px', color: 'rgba(232,228,220,0.7)' }}>
                <span>¥500 × 3回 = ¥1,500</span>
                <span style={{ color: 'rgba(232,228,220,0.3)' }}>vs</span>
                <span style={{ color: '#50c88c', fontWeight: 800 }}>¥780/月 で3回</span>
              </div>
              <br />
              <button
                onClick={handleSubscribeCheckout}
                disabled={subscribing}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '14px 32px', background: subscribing ? 'rgba(80,200,140,0.3)' : 'linear-gradient(135deg,#50c88c,#3aaa78)', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 800, color: '#0a0f1e', cursor: subscribing ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
              >
                {subscribing ? '処理中…' : '♾️ ¥780/月 のサブスクに切り替える'}
              </button>
              <p style={{ fontSize: '11px', color: 'rgba(232,228,220,0.35)', margin: '12px 0 0' }}>
                いつでも解約可能 / Stripe で安全決済
              </p>
            </div>
          )}

          {/* フィードバック収集（任意・非ブロッキング） */}
          {state === 'full' && (
            <div style={{ marginTop: '20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(232,228,220,0.1)', borderRadius: '14px', padding: '22px 20px' }}>
              {fbSent ? (
                <p style={{ textAlign: 'center', fontSize: '13px', color: 'rgba(80,200,140,0.85)', margin: 0 }}>
                  🙏 フィードバックありがとうございました。
                </p>
              ) : (
                <>
                  <p style={{ fontSize: '13px', fontWeight: '800', color: 'rgba(232,228,220,0.8)', margin: '0 0 4px', textAlign: 'center' }}>
                    この分析は役に立ちましたか？
                  </p>
                  <p style={{ fontSize: '11px', color: 'rgba(232,228,220,0.4)', margin: '0 0 16px', textAlign: 'center' }}>
                    あなたの一言が、同じ悩みを持つ誰かの背中を押します（任意）
                  </p>
                  {[
                    ['分析の的確さ', fbAccuracy, setFbAccuracy],
                    ['また使いたい', fbRevisit, setFbRevisit],
                  ].map(([label, val, setter]) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span style={{ fontSize: '12px', color: 'rgba(232,228,220,0.6)' }}>{label}</span>
                      <span style={{ display: 'inline-flex', gap: '4px' }}>
                        {[1, 2, 3, 4, 5].map(n => (
                          <button
                            key={n}
                            onClick={() => setter(n)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', lineHeight: 1, padding: 0, color: n <= val ? '#c9a84c' : 'rgba(232,228,220,0.2)' }}
                            aria-label={`${label} ${n}`}
                          >
                            ★
                          </button>
                        ))}
                      </span>
                    </div>
                  ))}
                  <textarea
                    value={fbComment}
                    onChange={(e) => setFbComment(e.target.value)}
                    placeholder="一番の気づきは？（例：清潔感がない理由が肌だと初めて分かった）"
                    maxLength={300}
                    rows={2}
                    style={{ width: '100%', boxSizing: 'border-box', marginTop: '8px', background: 'rgba(10,15,30,0.6)', border: '1px solid rgba(232,228,220,0.15)', borderRadius: '10px', padding: '10px 12px', fontSize: '13px', color: 'rgba(232,228,220,0.88)', fontFamily: 'inherit', resize: 'vertical', outline: 'none' }}
                  />
                  <button
                    onClick={submitFeedback}
                    disabled={!fbAccuracy && !fbRevisit && !fbComment.trim()}
                    style={{ display: 'block', width: '100%', marginTop: '12px', padding: '11px', background: (!fbAccuracy && !fbRevisit && !fbComment.trim()) ? 'rgba(201,168,76,0.15)' : 'rgba(201,168,76,0.9)', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '800', color: (!fbAccuracy && !fbRevisit && !fbComment.trim()) ? 'rgba(232,228,220,0.4)' : '#0a0f1e', cursor: (!fbAccuracy && !fbRevisit && !fbComment.trim()) ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
                  >
                    フィードバックを送る
                  </button>
                </>
              )}
            </div>
          )}

          {/* 友達紹介（ログイン済み・fullのみ） */}
          {state === 'full' && myUserId && (
            <div style={{ marginTop: '20px', background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: '14px', padding: '22px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>🎟️</div>
              <p style={{ fontSize: '14px', fontWeight: '800', color: '#e8e4dc', margin: '0 0 6px' }}>
                友達を招待して、おたがい1回無料
              </p>
              <p style={{ fontSize: '12px', color: 'rgba(232,228,220,0.5)', margin: '0 0 16px', lineHeight: 1.7 }}>
                招待リンク経由で友達が初めて分析すると、<br />あなたと友達の両方に詳細分析の無料チケットが1枚届きます。
              </p>
              <button
                onClick={copyInvite}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 28px', background: 'linear-gradient(135deg,#c9a84c,#e8c97a)', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '800', color: '#0a0f1e', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                {inviteCopied ? '✓ 招待リンクをコピーしました' : '🔗 招待リンクをコピー'}
              </button>
            </div>
          )}

          {/* やり直しボタン */}
          <button
            className="retry-btn"
            onClick={() => {
              setState('idle');
              setAnalysis(null);
              setSessionId(null);
              setPreviewFile(null);
              setError('');
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
          >
            別の写真で再分析する
          </button>
        </div>
      )}
    </main>
  );
}
