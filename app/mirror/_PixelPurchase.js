'use client';
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function PixelPurchase() {
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.get('purchased') === '1' && typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', 'Purchase', {
        value: 500,
        currency: 'JPY',
        content_name: 'Fineme Mirror',
      });
    }
  }, [searchParams]);
  return null;
}
