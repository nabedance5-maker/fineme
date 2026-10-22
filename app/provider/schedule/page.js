// 旧「空き枠スケジュール」画面。2026-10-21 に空き枠の仕組みを廃止したため、予約カレンダーの受付設定へ案内する。
import { redirect } from 'next/navigation';

export default function ProviderSchedulePage() {
  redirect('/provider/dashboard?tab=slots');
}
