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

export function unlock() {
  if (!voiceAvailable()) return;
  pickVoice();
  try { window.speechSynthesis.onvoiceschanged = pickVoice; } catch {}
  say('', { interrupt: true });
}

// interrupt: 今しゃべっている途中でも止めて言う（回数の数え上げなど、遅れると意味がないもの）
export function say(text, { interrupt = false } = {}) {
  if (!voiceAvailable()) return;
  try {
    const synth = window.speechSynthesis;
    if (interrupt) synth.cancel();
    const u = new window.SpeechSynthesisUtterance(String(text));
    u.lang = 'ja-JP';
    if (jaVoice) u.voice = jaVoice;
    u.rate = 1.05;
    u.volume = 1;
    synth.speak(u);
  } catch {}
}

export function hush() {
  try { window.speechSynthesis?.cancel(); } catch {}
}
