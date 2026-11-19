'use client';
// 店舗向けの記事の編集は特集管理（/admin/features）の「店舗向けの記事」タブにまとめた（2026-11-19 渡邉指摘：既存の記事編集に統合）。
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminBizGuidesRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/admin/features?tab=shop'); }, [router]);
  return null;
}
