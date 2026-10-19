// GET /api/b/u/[rid] → 配信停止の確認画面、POST → 配信停止（でお要望 2026-10-19：hacomono差分 #6・特定電子メール法の配信停止）
// メールのセキュリティ機能がリンクを自動で開いても止まらないよう、GETでは止めずボタン（POST）で止める。
import { getSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
const UUID = /^[0-9a-f-]{36}$/i;
const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const page = (body) => new Response(`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>配信停止</title>
<style>body{margin:0;font-family:system-ui,-apple-system,"Hiragino Sans",sans-serif;background:#fff;color:#111}main{max-width:440px;margin:60px auto;padding:0 20px;line-height:1.8}button{background:#111;color:#fff;border:0;border-radius:10px;padding:12px 22px;font-size:15px;font-weight:700;cursor:pointer}</style></head><body><main>${body}</main></body></html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });

async function lookup(rid) {
  if (!UUID.test(rid)) return null;
  const db = getSupabase();
  const { data: r } = await db.from('provider_broadcast_recipients').select('provider_id, user_id').eq('id', rid).maybeSingle();
  if (!r) return null;
  const { data: p } = await db.from('providers').select('name').eq('id', r.provider_id).maybeSingle();
  return { ...r, name: p?.name || 'このお店' };
}

export async function GET(request, { params }) {
  const { rid } = await params;
  const r = await lookup(rid);
  if (!r) return page('<p>このリンクは使えません。</p>');
  return page(`<h1 style="font-size:20px">配信停止</h1><p>${esc(r.name)}からの配信メールを停止します。予約の確認など、お手続きに関するお知らせは引き続き届きます。</p><form method="post"><button type="submit">配信を停止する</button></form>`);
}

export async function POST(request, { params }) {
  const { rid } = await params;
  const r = await lookup(rid);
  if (!r) return page('<p>このリンクは使えません。</p>');
  await getSupabase().from('provider_broadcast_optouts').upsert({ provider_id: r.provider_id, user_id: r.user_id }, { onConflict: 'provider_id,user_id' });
  return page(`<h1 style="font-size:20px">配信を停止しました</h1><p>${esc(r.name)}からの配信メールは今後届きません。</p>`);
}
