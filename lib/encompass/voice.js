'use client';
// 声の案内（ブラウザの読み上げ・Web Speech API）。タブレットを見なくても、回数・次の種目・休憩が分かるように。
// 端末に日本語の声が無い・読み上げが使えない時は何もしない（画面の表示だけで進む）。
// iPhone・iPad は、最初に画面を押した時に一度鳴らしておかないと声が出ないため、unlock() を「始める」で呼ぶ。

let jaVoice = null;
function pickVoice() {
  try {
    const vs = window.speechSynthesis?.getVoices?.() || [];
    jaVoice = vs.find(v => /^ja(-|_|$)/i.test(v.lang)) || null;
  } catch { jaVoice = null; }
}

export function voiceAvailable() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function';
}

// 「はじめる」を押した時（＝画面を触った直後）に呼ぶ。空の文だと iPhone・iPad で声が有効にならないため、短い言葉を実際に言う
export function unlock(text = 'はじめます') {
  if (!voiceAvailable()) return;
  pickVoice();
  try { window.speechSynthesis.onvoiceschanged = pickVoice; } catch {}
  speakNow(text);
}

function speakNow(text) {
  try {
    const synth = window.speechSynthesis;
    if (synth.paused) synth.resume();
    const u = new window.SpeechSynthesisUtterance(String(text));
    u.lang = 'ja-JP';
    if (jaVoice) u.voice = jaVoice;
    u.rate = 1.05;
    u.volume = 1;
    synth.speak(u);
  } catch {}
}

// interrupt: 今しゃべっている途中でも止めて言う（回数の数え上げなど、遅れると意味がないもの）。
// 止めた直後に続けて言わせると声が出ないブラウザがある（2026-11-20 実機で回数が数えられなかった）ため、
// 止めた時だけ少し待ってから言う。しゃべっていない時は、止めずにそのまま言う。
let pendingTimer = null;
export function say(text, { interrupt = false } = {}) {
  if (!voiceAvailable() || !String(text).trim()) return;
  const synth = window.speechSynthesis;
  if (pendingTimer) { clearTimeout(pendingTimer); pendingTimer = null; }
  let busy = false;
  try { busy = synth.speaking || synth.pending; } catch {}
  if (interrupt && busy) {
    try { synth.cancel(); } catch {}
    pendingTimer = setTimeout(() => { pendingTimer = null; speakNow(text); }, 120);
    return;
  }
  speakNow(text);
}

export function hush() {
  if (pendingTimer) { clearTimeout(pendingTimer); pendingTimer = null; }
  try { window.speechSynthesis?.cancel(); } catch {}
}
