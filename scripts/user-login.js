// ユーザーログイン / 新規登録 — Supabase Auth 対応版
import { supabase } from './supabase.js';

const BASE_PREFIX = (location.hostname && /github\.io$/i.test(location.hostname)) ? '/fineme' : '';

function qs(s, root = document) { return root.querySelector(s); }

function switchTab(which) {
  const loginTab = qs('#tab-login');
  const regTab = qs('#tab-register');
  const loginForm = qs('#login-form');
  const regForm = qs('#register-form');
  const isLogin = which === 'login';
  if (loginTab) { loginTab.classList.toggle('is-active', isLogin); loginTab.setAttribute('aria-selected', String(isLogin)); }
  if (regTab) { regTab.classList.toggle('is-active', !isLogin); regTab.setAttribute('aria-selected', String(!isLogin)); }
  if (loginForm) loginForm.style.display = isLogin ? '' : 'none';
  if (regForm) regForm.style.display = isLogin ? 'none' : '';
}

async function onLoginSubmit(e) {
  e.preventDefault();
  const fd = new FormData(e.currentTarget);
  const email = (fd.get('loginId') || '').toString().trim();
  const password = (fd.get('password') || '').toString();
  const msg = qs('#login-message');
  if (msg) { msg.textContent = ''; msg.classList.remove('error'); }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (msg) { msg.textContent = 'メールアドレスまたはパスワードが正しくありません。'; msg.classList.add('error'); }
    return;
  }

  // 診断結果があればSupabaseに保存
  try { await _syncDiagnosisToSupabase(); } catch {}

  try {
    const next = new URLSearchParams(location.search).get('next');
    if (next) { location.replace(decodeURIComponent(next)); return; }
  } catch {}
  location.href = BASE_PREFIX + '/pages/mypage/index.html';
}

async function onRegisterSubmit(e) {
  e.preventDefault();
  const fd = new FormData(e.currentTarget);
  const displayName = (fd.get('displayName') || '').toString().trim();
  const email = (fd.get('loginId') || '').toString().trim();
  const password = (fd.get('password') || '').toString();
  const msg = qs('#register-message');
  if (msg) { msg.textContent = ''; msg.classList.remove('error'); }

  if (!displayName || !email || !password) {
    if (msg) msg.textContent = '必須項目が未入力です。';
    return;
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });

  if (error) {
    if (msg) {
      msg.textContent = error.message.includes('already registered')
        ? 'そのメールアドレスは既に登録されています。'
        : `登録に失敗しました: ${error.message}`;
      msg.classList.add('error');
    }
    return;
  }

  // 確認メール送信の場合はメッセージ表示
  if (msg) msg.textContent = '確認メールを送信しました。メールのリンクをクリックしてください。';

  // 診断結果があればSupabaseに保存
  try { await _syncDiagnosisToSupabase(); } catch {}

  try {
    const next = new URLSearchParams(location.search).get('next');
    if (next) { location.replace(decodeURIComponent(next)); return; }
  } catch {}
  // 登録後は診断ページへ（新規ユーザーは診断が先）
  location.href = BASE_PREFIX + '/pages/diagnosis.html';
}

// ローカルの診断結果をSupabaseに同期する
async function _syncDiagnosisToSupabase() {
  const raw = localStorage.getItem('fineme:diagnosis:v2') || localStorage.getItem('fineme:diagnosis:latest');
  if (!raw) return;
  const diagData = JSON.parse(raw);
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return;
  await supabase.from('diagnosis_results').upsert({
    user_id: session.user.id,
    scores: diagData.scores || null,
    result: diagData.result || null,
    raw_data: diagData,
  }, { onConflict: 'user_id' });
}

document.addEventListener('DOMContentLoaded', () => {
  const loginTab = qs('#tab-login');
  const regTab = qs('#tab-register');
  const loginForm = qs('#login-form');
  const regForm = qs('#register-form');
  if (loginTab) loginTab.addEventListener('click', () => switchTab('login'));
  if (regTab) regTab.addEventListener('click', () => switchTab('register'));
  if (loginForm) loginForm.addEventListener('submit', onLoginSubmit);
  if (regForm) regForm.addEventListener('submit', onRegisterSubmit);
  if (location.hash === '#register') {
    try { switchTab('register'); } catch {}
  }
});
