'use client';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function DetailRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const id = searchParams.get('id') || searchParams.get('slug');
    if (id) {
      router.replace(`/provider/${id}`);
    } else {
      router.replace('/search');
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

export default function DetailPage() {
  return (
    <Suspense fallback={<main className="section"><div className="container"><p className="muted">読み込み中...</p></div></main>}>
      <DetailRedirect />
    </Suspense>
  );
}
