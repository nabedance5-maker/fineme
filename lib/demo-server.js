// サーバー側（Route Handler の中）だけで使う：今の要求がデモのログインから来ているか。
// middleware（edge）からは読み込まない（next/headers を含めないため lib/demo.js と分けた）。
import { demoClaimsFromAuth } from './demo';

// メール・LINEの送信の入口で使う。リクエストの外（cron 等）では false
export async function isDemoRequest() {
  try {
    const { headers } = await import('next/headers');
    const h = await headers();
    return !!demoClaimsFromAuth(h.get('authorization'));
  } catch { return false; }
}
