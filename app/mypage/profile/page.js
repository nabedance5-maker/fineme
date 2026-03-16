'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabaseAnon = createClient(
  'https://qsfpzlvucqzmjldshwwd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzZnB6bHZ1Y3F6bWpsZHNod3dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5ODM1MzIsImV4cCI6MjA4ODU1OTUzMn0.9mBlP8-0l9jotex_UkX7Ba8ZodYtailaxoK_RIy3Kq8'
);

function isValidEmail(email) {
  return /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email);
}

export default function MypageProfilePage() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const sbKey = Object.keys(localStorage).find(
      k => k.startsWith('sb-') && k.endsWith('-auth-token')
    );
    if (sbKey) {
      try {
        const obj = JSON.parse(localStorage.getItem(sbKey));
        if (obj?.user?.id) {
          setSession(obj);
          setLoading(false);
          // プロフィール初期値取得
          supabaseAnon.auth.getUser().then(({ data: { user } }) => {
            if (!user) return;
            setDisplayName(user.user_metadata?.display_name || '');
            setEmail(user.email || '');
            supabaseAnon
              .from('profiles')
              .select('bio')
              .eq('id', user.id)
              .single()
              .then(({ data: profile }) => {
                if (profile?.bio) setBio(profile.bio);
              });
          });
          return;
        }
      } catch {}
    }
    window.location.href = '/login';
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!displayName.trim()) { setMessage('名前は必須です。'); return; }
    if (!isValidEmail(email)) { setMessage('メールアドレスの形式が正しくありません。'); return; }
    setSaving(true);
    setMessage('');
    try {
      const { error: authError } = await supabaseAnon.auth.updateUser({
        data: { display_name: displayName.trim() },
      });
      if (authError) { setMessage(`更新に失敗しました: ${authError.message}`); setSaving(false); return; }

      const userId = session?.user?.id;
      const { error: profileError } = await supabaseAnon
        .from('profiles')
        .upsert({ id: userId, display_name: displayName.trim(), bio, updated_at: new Date().toISOString() }, { onConflict: 'id' });
      if (profileError) { setMessage(`プロフィール保存エラー: ${profileError.message}`); setSaving(false); return; }

      setMessage('保存しました。');
    } catch (err) {
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
            <Link href="/mypage/diagnosis" className="sidenav-link">診断結果</Link>
            <Link href="/mypage/profile" className="sidenav-link sidenav-link--active">プロフィール編集</Link>
            <Link href="/mypage/favorites" className="sidenav-link">お気に入り</Link>
            <Link href="/mypage/history" className="sidenav-link">閲覧履歴</Link>
            <Link href="/my-reservations" className="sidenav-link">予約履歴</Link>
          </nav>
        </aside>

        <section className="stack">
          <h1 className="section-title">プロフィール編集</h1>
          <form id="user-profile-form" className="card" style={{ padding: '24px', maxWidth: '640px' }} onSubmit={handleSubmit}>
            <div className="stack">
              <label className="profile-label">
                <span className="profile-label-text">名前</span>
                <input
                  id="profile-displayName"
                  name="displayName"
                  type="text"
                  placeholder="山田太郎"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                />
              </label>
              <label className="profile-label">
                <span className="profile-label-text">メール</span>
                <input
                  id="profile-email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </label>
              <label className="profile-label">
                <span className="profile-label-text">自己紹介</span>
                <textarea
                  id="profile-bio"
                  name="bio"
                  rows={4}
                  placeholder="自己紹介を入力"
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                />
              </label>
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
        @media (max-width: 640px) { .mypage-layout { grid-template-columns: 1fr; } .mypage-sidenav { display: flex; flex-direction: row; overflow-x: auto; gap: 4px; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb; margin-bottom: 8px; } .sidenav-link { white-space: nowrap; padding: 6px 14px; font-size: 13px; } }
        .sidenav-link { display: block; padding: 8px 12px; border-radius: 8px; font-size: 14px; font-weight: 500; color: #374151; text-decoration: none; transition: background .15s; }
        .sidenav-link:hover { background: #f3f4f6; }
        .sidenav-link--active { background: #f3f4f6; font-weight: 700; color: #111; }
        .profile-label { display: grid; grid-template-columns: 160px 1fr; align-items: center; gap: 12px; }
        .profile-label input, .profile-label textarea { grid-column: 2; width: 100%; min-width: 0; }
        @media (max-width: 640px) { .profile-label { grid-template-columns: 1fr; } .profile-label input, .profile-label textarea { grid-column: auto; } }
      `}</style>
    </main>
  );
}
