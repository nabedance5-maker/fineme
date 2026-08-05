'use client';
// LINE Login コールバック後のセッション確立ページ
// Supabase が URL ハッシュ (#access_token=...) を自動検出してセッションをセットする
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { syncLocalDiagnosisToServer } from '@/lib/track';
import { syncLocalLogsToServer } from '@/lib/log-store';
import { syncLocalAttributesToServer } from '@/lib/attributes';

const sb = createClient(
  'https://qsfpzlvucqzmjldshwwd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzZnB6bHZ1Y3F6bWpsZHNod3dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5ODM1MzIsImV4cCI6MjA4ODU1OTUzMn0.9mBlP8-0l9jotex_UkX7Ba8ZodYtailaxoK_RIy3Kq8',
  { auth: { detectSessionInUrl: true, persistSession: true } }
);

async function syncLocalDiagnosis(accessToken) {
  // 男性版・Belle版の両方を引き継ぐ（lib/track.js に共通化）
  await syncLocalDiagnosisToServer(accessToken);
  // New Me Log のゲスト記録も同じタイミングで引き継ぐ
  await syncLocalLogsToServer(accessToken);
  // 端末に保存済みの属性（年代）もサーバへ引き継ぐ
  await syncLocalAttributesToServer(accessToken);
}

export default function LineSessionPage() {
  const [status, setStatus] = useState('LINEログイン処理中...');

  useEffect(() => {
    async function handleSession() {
      // Supabase JS が URL ハッシュからセッションを自動検出・保存する
      const { data: { session }, error } = await sb.auth.getSession();

      if (error || !session) {
        // ハッシュが処理された後もセッションがない場合は少し待ってリトライ
        await new Promise(r => setTimeout(r, 800));
        const { data: { session: retrySession } } = await sb.auth.getSession();
        if (!retrySession) {
          setStatus('ログインに失敗しました。もう一度お試しください。');
          setTimeout(() => { window.location.href = '/login?line_error=session_not_found'; }, 2000);
          return;
        }
        return handleSessionReady(retrySession);
      }

      handleSessionReady(session);
    }

    async function handleSessionReady(session) {
      setStatus('診断データを同期しています...');
      await syncLocalDiagnosis(session.access_token);

      const params = new URLSearchParams(window.location.search);
      const rawNext = params.get('next') || '';
      // オープンリダイレクト防止: 相対パスのみ許可
      const next = (rawNext.startsWith('/') && !rawNext.startsWith('//')) ? rawNext : '/mypage';
      setStatus('マイページへ移動します...');
      window.location.href = next;
    }

    handleSession();
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      gap: '16px',
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '3px solid #c9a84c',
        borderTop: '3px solid transparent',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <p style={{ fontSize: '14px', color: '#6b7280' }}>{status}</p>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
