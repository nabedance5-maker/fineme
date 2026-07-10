'use client';
import { useEffect } from 'react';

export default function PixelTrack() {
  useEffect(() => {
    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', 'ViewContent', {
        content_name: 'Fineme Mirror',
        content_category: 'mirror',
        value: 500,
        currency: 'JPY',
      });
    }
  }, []);
  return null;
}
