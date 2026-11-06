// POST /api/track → サイトの閲覧を1件記録する（運営管理画面のアナリティクス用。渡邉指摘 2026-11-06）。
// ブラウザの app/_components/PageViewTracker.js が、ページを開くたびに navigator.sendBeacon で送る。ログイン不要。
// 個人を特定する情報は持たない。管理画面・契約者の管理画面・個人用のURL（トークン入り）は記録しない。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const SKIP = [/^\/admin/, /^\/provider\/dashboard/, /^\/provider\/(billing|money|onboarding|log-toolkit)/, /^\/partner\//, /^\/api\//, /^\/auth\//, /^\/card-registered/, /^\/join\/[^/]+\/?$/];
const BOT = /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|embedly|vercel|monitor|curl|wget|python|node-fetch/i;
const s = (v, n) => { const t = String(v ?? '').trim().slice(0, n); return t || null; };

function sectionOf(path) {
  if (path === '/') return 'top';
  if (/^\/belle\/journal/.test(path)) return 'journal';
  if (/^\/belle/.test(path)) return 'belle';
  if (/^\/feature/.test(path)) return 'feature';
  if (/^\/(diagnosis|scan)/.test(path)) return 'diagnosis';
  if (/^\/(mirror|lp\/mirror)/.test(path)) return 'mirror';
  if (/^\/provider\//.test(path)) return 'provider_page';
  if (/^\/mypage/.test(path)) return 'mypage';
  if (/^\/(business|sales-partner|lp\/provider)/.test(path)) return 'business';
  return 'other';
}

export async function POST(request) {
  if (BOT.test(request.headers.get('user-agent') || '')) return new Response(null, { status: 204 });
  let b;
  try { b = JSON.parse(await request.text()); } catch { return new Response(null, { status: 204 }); }
  const path = s(b?.path, 300);
  if (!path || !path.startsWith('/') || SKIP.some(re => re.test(path))) return new Response(null, { status: 204 });
  let referrer = null;
  try {
    const host = new URL(String(b.ref || '')).hostname.replace(/^www\./, '');
    if (host && !/(^|\.)fineme\.me$/.test(host) && host !== 'localhost') referrer = host.slice(0, 120);
  } catch { /* 直接のアクセス */ }
  const ua = request.headers.get('user-agent') || '';
  try {
    await getSupabase().from('site_page_views').insert({
      path, section: sectionOf(path), referrer_host: referrer,
      utm_source: s(b.utm?.source, 60), utm_medium: s(b.utm?.medium, 60), utm_campaign: s(b.utm?.campaign, 80),
      visitor_id: s(b.vid, 40), session_id: s(b.sid, 40),
      device: /Mobi|Android|iPhone|iPad/i.test(ua) ? 'mobile' : 'desktop',
    });
  } catch (e) { console.error('[track]', e?.message); }
  return new Response(null, { status: 204 });
}
