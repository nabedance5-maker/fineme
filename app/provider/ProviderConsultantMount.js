'use client';
import { usePathname } from 'next/navigation';
import ConsultantWidget from './dashboard/ConsultantWidget';

// ダッシュボード本体は自前でウィジェットを載せている。公開店舗ページ・掲載申込は対象外。
const MANAGEMENT_PATHS = [
  'billing', 'compatibility', 'inquiry', 'log-toolkit', 'onboarding', 'philosophy', 'photo-settings',
  'profile', 'referral', 'requests', 'reservations', 'schedule', 'service-form', 'staff',
];

export default function ProviderConsultantMount() {
  const pathname = usePathname() || '';
  const seg = pathname.split('/').filter(Boolean)[1];
  if (!MANAGEMENT_PATHS.includes(seg)) return null;
  return <ConsultantWidget />;
}
