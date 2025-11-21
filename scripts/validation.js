// @ts-nocheck
// Simple validation helpers for nicknames and content
export async function loadBadWords(){
  try{
    const res = await fetch('/assets/data/badwords.json', { cache: 'no-store' });
    if(!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data.map(s=>String(s).toLowerCase()) : [];
  }catch{ return []; }
}

export async function isNicknameAllowed(nick){
  if(!nick) return { ok:false, reason:'ニックネームが空です' };
  const s = String(nick).trim();
  if(!s) return { ok:false, reason:'ニックネームが空です' };
  // reject urls
  const urlPattern = /(https?:\/\/|www\.)/i;
  if(urlPattern.test(s)) return { ok:false, reason:'URL の記載は許可されていません' };
  // reject emails
  const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
  if(emailPattern.test(s)) return { ok:false, reason:'メールアドレスの記載は許可されていません' };
  // reject phone-like
  const phonePattern = /\d{2,4}[-\s]?\d{2,4}[-\s]?\d{3,4}/;
  if(phonePattern.test(s)) return { ok:false, reason:'電話番号の記載は許可されていません' };
  // reject repetitive characters (aaa... or 連続同字) longer than 4
  if(/(.)\1{4,}/.test(s)) return { ok:false, reason:'同じ文字の連続は許可されていません' };
  // basic bad words
  const bad = await loadBadWords();
  const lower = s.toLowerCase();
  for(const w of bad){ if(!w) continue; if(lower.includes(w)) return { ok:false, reason:'不適切な語句が含まれています' }; }
  return { ok:true };
}
