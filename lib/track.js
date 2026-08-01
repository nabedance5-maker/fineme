// トラック（男性=fineme / 女性=belle）の単一の真実。
// リンク先・記事・アクセント色はすべてここを経由して引く。
// ページごとに '/mirror' 等をハードコードすると、片方だけ直し忘れる事故が起きる。

export const TRACKS = {
  fineme: {
    id: 'fineme',
    label: 'Fineme',
    subLabel: '男性向け',
    home: '/',
    diagnosis: '/diagnosis',
    diagnosisResult: '/diagnosis/result',
    mirror: '/mirror',
    lpMirror: '/lp/mirror',
    articles: '/feature',
    articlePath: (slug) => `/feature/${slug}`,
    articlesSearch: (q) => `/feature?q=${encodeURIComponent(q)}`,
    articlesLabel: '特集・記事',
    accent: '#c9a84c',
    accentRgb: '201,168,76',
    storageKey: 'fineme:diagnosis:latest',
  },
  belle: {
    id: 'belle',
    label: 'Fineme Belle',
    subLabel: '女性向け',
    home: '/belle',
    diagnosis: '/belle/diagnosis',
    diagnosisResult: '/belle/diagnosis/result',
    mirror: '/belle/mirror',
    lpMirror: '/belle/lp/mirror',
    articles: '/belle/journal',
    articlePath: (slug) => `/belle/journal/${slug}`,
    // Belle Journal は現状 ?q= 検索に未対応のため一覧へ送る（対応したらここだけ直す）
    articlesSearch: () => '/belle/journal',
    articlesLabel: 'Journal',
    accent: 'rgb(220,130,160)',
    accentRgb: '200,100,140',
    storageKey: 'fineme:diagnosis:belle',
  },
};

export const TRACK_KEY = 'fineme:track';
export const DEFAULT_TRACK = 'fineme';

export function isTrackId(v) {
  return v === 'fineme' || v === 'belle';
}

// 現在のトラックID。明示保存 → 既存データからの導出 → 既定値 の順で決める。
export function getTrackId() {
  if (typeof window === 'undefined') return DEFAULT_TRACK;
  try {
    const saved = localStorage.getItem(TRACK_KEY);
    if (isTrackId(saved)) return saved;
    // 未確定：Belleの診断データだけがあるならBelle。両方ある／どちらも無いなら既定値
    const hasBelle = !!localStorage.getItem(TRACKS.belle.storageKey);
    const hasFineme = !!localStorage.getItem(TRACKS.fineme.storageKey);
    if (hasBelle && !hasFineme) return 'belle';
  } catch {}
  return DEFAULT_TRACK;
}

export function getTrack() {
  return TRACKS[getTrackId()] || TRACKS[DEFAULT_TRACK];
}

// getTrackId() は不明な場合 DEFAULT_TRACK にフォールバックするが、男女で行き先が
// 変わるリンクを出す前に「本当に分かっているか」を知りたい呼び出し元のために、
// フォールバックせず null を返す版を用意する。
export function getKnownTrackId() {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(TRACK_KEY);
    if (isTrackId(saved)) return saved;
    const hasBelle = !!localStorage.getItem(TRACKS.belle.storageKey);
    const hasFineme = !!localStorage.getItem(TRACKS.fineme.storageKey);
    if (hasBelle && !hasFineme) return 'belle';
    if (hasFineme && !hasBelle) return 'fineme';
  } catch {}
  return null;
}

// 初回確定。すでに確定済みなら何もしない。
// 「最初に受けた方で固定」＝あとで反対側を試しても体験が振り回されない（でお決定 2026-07-26）。
export function setTrackOnce(trackId) {
  if (typeof window === 'undefined' || !isTrackId(trackId)) return getTrackId();
  try {
    const saved = localStorage.getItem(TRACK_KEY);
    if (isTrackId(saved)) return saved;
    localStorage.setItem(TRACK_KEY, trackId);
  } catch {}
  return trackId;
}

// 明示切替。マイページの設定からのみ呼ぶ（入口では選ばせない）。
export function setTrackExplicit(trackId) {
  if (typeof window === 'undefined' || !isTrackId(trackId)) return getTrackId();
  try { localStorage.setItem(TRACK_KEY, trackId); } catch {}
  return trackId;
}

// ログイン中のトラックをサーバと突き合わせる。
// サーバに値があればそれを正とし、無ければローカルの確定値を昇格させる。
export async function syncTrackWithServer() {
  if (typeof window === 'undefined') return getTrackId();
  let token = null;
  try {
    const sbKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    if (sbKey) token = JSON.parse(localStorage.getItem(sbKey) || 'null')?.access_token || null;
  } catch {}
  if (!token) return getTrackId();

  try {
    const res = await fetch('/api/me/track', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const { track } = await res.json();
      if (isTrackId(track)) {
        try { localStorage.setItem(TRACK_KEY, track); } catch {}
        return track;
      }
    }
  } catch {}

  // サーバ未確定：ローカルで確定済みならそれを昇格させる
  let local = null;
  try { local = localStorage.getItem(TRACK_KEY); } catch {}
  if (isTrackId(local)) {
    try {
      await fetch('/api/me/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ track: local }),
      });
    } catch {}
    return local;
  }
  return getTrackId();
}

// ログイン直後に、端末に残っている診断データを両トラックぶんサーバへ引き継ぐ。
// 以前は 'fineme:diagnosis:latest'（男性）だけを同期していて、Belleの回答が消えていた。
export async function syncLocalDiagnosisToServer(accessToken) {
  if (typeof window === 'undefined' || !accessToken) return false;
  let synced = false;
  for (const id of ['fineme', 'belle']) {
    const key = TRACKS[id].storageKey;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (!parsed) continue;
      const res = await fetch('/api/me/diagnosis', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_data: parsed, track: id }),
      });
      // 同期成功後はローカルから削除（別アカウントへの誤引き継ぎを防ぐ）
      if (res.ok) { localStorage.removeItem(key); synced = true; }
    } catch {}
  }
  try { await syncTrackWithServer(); } catch {}
  return synced;
}

// 明示切替をサーバにも反映する
export async function saveTrackToServer(trackId) {
  if (typeof window === 'undefined' || !isTrackId(trackId)) return;
  let token = null;
  try {
    const sbKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    if (sbKey) token = JSON.parse(localStorage.getItem(sbKey) || 'null')?.access_token || null;
  } catch {}
  if (!token) return;
  try {
    await fetch('/api/me/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ track: trackId }),
    });
  } catch {}
}
