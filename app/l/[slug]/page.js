'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const _sb = createClient(
  'https://qsfpzlvucqzmjldshwwd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzZnB6bHZ1Y3F6bWpsZHNod3dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5ODM1MzIsImV4cCI6MjA4ODU1OTUzMn0.9mBlP8-0l9jotex_UkX7Ba8ZodYtailaxoK_RIy3Kq8'
);

// お客様が店舗の公式LINEを友だち追加した上でこのページを開くと、
// その店舗チャネル上のuserIdをFinemeのアカウントに連携する（フェーズ2）。
// LINEのuserIdはチャネル(公式アカウント)ごとに別の値になるため、
// Fineme公式チャネルのuserIdとは別にこの連携が必要になる。
export default function LineConnectPage({ params }) {
  const { slug } = params;
  const [status, setStatus] = useState('loading'); // loading | need-login | not-connected | connecting | done | error
  const [providerName, setProviderName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const infoRes = await fetch(`/api/providers/${slug}/liff-id`);
      const info = await infoRes.json();
      if (cancelled) return;
      setProviderName(info.providerName || '');

      if (!info.connected) {
        setStatus('not-connected');
        return;
      }

      const { data: { session } } = await _sb.auth.getSession();
      if (!session) {
        setStatus('need-login');
        return;
      }

      setStatus('connecting');
      try {
        await loadLiffSdk();
        // eslint-disable-next-line no-undef
        await liff.init({ liffId: info.liffId });
        // eslint-disable-next-line no-undef
        if (!liff.isLoggedIn()) {
          // eslint-disable-next-line no-undef
          liff.login({ redirectUri: window.location.href });
          return;
        }
        // eslint-disable-next-line no-undef
        const profile = await liff.getProfile();

        const res = await fetch('/api/me/line-links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
          body: JSON.stringify({ provider_slug: slug, store_line_user_id: profile.userId }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error || '連携に失敗しました');
        }
        if (!cancelled) setStatus('done');
      } catch (e) {
        if (!cancelled) { setStatus('error'); setErrorMsg(e.message); }
      }
    })();

    return () => { cancelled = true; };
  }, [slug]);

  function loadLiffSdk() {
    return new Promise((resolve, reject) => {
      if (window.liff) return resolve();
      const s = document.createElement('script');
      s.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js';
      s.onload = resolve;
      s.onerror = () => reject(new Error('LIFF SDKの読み込みに失敗しました'));
      document.head.appendChild(s);
    });
  }

  return (
    <main className="section">
      <div className="container stack" style={{ maxWidth: '420px', margin: '0 auto', textAlign: 'center', padding: '48px 0' }}>
        {status === 'loading' && <p>確認中…</p>}

        {status === 'not-connected' && (
          <p>このお店はまだLINE連携に対応していません。New Me Logへの登録は<a href="/log">こちら</a>から続けられます。</p>
        )}

        {status === 'need-login' && (
          <>
            <p>{providerName}の公式LINEと連携するには、先にFinemeにログインしてください。</p>
            <p><a className="btn" href="/user/login">ログインする</a></p>
            <p className="muted" style={{ fontSize: '13px' }}>ログイン後、もう一度このQRコードを読み取ってください。</p>
          </>
        )}

        {status === 'connecting' && <p>連携中…</p>}

        {status === 'done' && (
          <>
            <p>{providerName}の公式LINEと連携しました。</p>
            <p className="muted" style={{ fontSize: '13px' }}>これで、New Me Logの次回タイミングのお知らせがこの店舗の公式LINEから届くようになります。</p>
          </>
        )}

        {status === 'error' && (
          <p style={{ color: '#ef4444' }}>連携に失敗しました：{errorMsg}</p>
        )}
      </div>
    </main>
  );
}
