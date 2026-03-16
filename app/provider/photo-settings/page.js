'use client';
import { useEffect, useRef } from 'react';

export default function PhotoSettingsPage() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    function requireProviderAuth() {
      try {
        const raw = sessionStorage.getItem('glowup:providerSession');
        if (!raw) { window.location.href = '/login'; return null; }
        return JSON.parse(raw);
      } catch { window.location.href = '/login'; return null; }
    }
    function signOutProvider() {
      sessionStorage.removeItem('glowup:providerSession');
      window.location.href = '/login';
    }

    const session = requireProviderAuth();
    if (session) {
      const area = document.getElementById('provider-session-area');
      if (area) {
        const span = document.createElement('span');
        span.className = 'muted';
        span.textContent = `${session.name} でログイン中`;
        const btn = document.createElement('button');
        btn.className = 'btn btn-ghost';
        btn.id = 'provider-logout-btn';
        btn.textContent = 'ログアウト';
        area.appendChild(span);
        area.appendChild(btn);
        area.addEventListener('click', (e) => {
          if (e.target && e.target.id === 'provider-logout-btn') signOutProvider();
        });
      }
    }
  }, []);

  return (
    <main className="section">
      <div className="container stack">
        <h1 className="section-title">写真設定</h1>
        <p className="muted">一覧/詳細ページに表示する画像を登録できます（ダミー）。</p>
        <div className="card" style={{ padding: '24px' }}>
          <p>画像アップロード（ダミーUI）</p>
          <button className="btn" type="button">画像を選択</button>
        </div>
      </div>
    </main>
  );
}
