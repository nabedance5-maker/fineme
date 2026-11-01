'use client';
import { useEffect } from 'react';
import { saveRef } from '@/lib/referral-ref';

// 導入ページを紹介コード付きで開いた時に、コードをクッキーへ保存する（lib/referral-ref.js）。
export default function RefCapture({ code }) {
  useEffect(() => { saveRef(code); }, [code]);
  return null;
}
