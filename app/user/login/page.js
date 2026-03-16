'use client';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function UserLoginRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const next = searchParams.get('next');
    if (next) {
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    } else {
      router.replace('/login');
    }
  }, [router, searchParams]);

  return (
    <main className="section">
      <div className="container">
        <p className="muted">転送中...</p>
      </div>
    </main>
  );
}

export default function UserLoginPage() {
  return (
    <Suspense fallback={<main className="section"><div className="container"><p className="muted">読み込み中...</p></div></main>}>
      <UserLoginRedirect />
    </Suspense>
  );
}
