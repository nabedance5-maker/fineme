import { NextResponse } from 'next/server'
import { permOfApi, normalizePerms, PERM_DEFS } from './lib/member-perms'
import { contractActive, contractFreeApi } from './lib/provider-contract'

// ── スタッフ個別ログインの権限チェック（でお要望 2026-10-19） ──
// スタッフのログインで呼ばれた掲載者向けAPIを、役割ごとに許可されたメニュー分類だけに絞る。
// トークンの署名検証は各APIが行う（ここで偽のトークンを通しても、API側で401になる）。
const MEMBER_CACHE_MS = 30 * 1000
const memberCache = new Map()
function decodeClaims(token) {
  try {
    const part = token.split('.')[1]
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((part.length + 3) % 4))
    return JSON.parse(json) || null
  } catch { return null }
}
const decodeSub = token => decodeClaims(token)?.sub || null
async function memberPerms(sub) {
  const hit = memberCache.get(sub)
  if (hit && Date.now() - hit.at < MEMBER_CACHE_MS) return hit.value
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  let value = null
  // Supabase が応答しない時に入口で25秒待って止まらないよう、5秒で打ち切る（2026-10-28 の障害）。
  // 確かめられなかった時は権限を緩めず「一時的に確認できない」を返す（キャッシュもしない）
  const h = { apikey: key, Authorization: `Bearer ${key}` }
  const r = await fetch(`${base}/rest/v1/provider_members?user_id=eq.${sub}&status=eq.active&select=provider_id,role&limit=1`, { headers: h, signal: AbortSignal.timeout(5000) })
  if (!r.ok) throw new Error(`members ${r.status}`)
  const rows = await r.json()
  if (rows[0]) {
    const pr = await fetch(`${base}/rest/v1/provider_role_permissions?provider_id=eq.${rows[0].provider_id}&role=eq.${rows[0].role}&select=perms`, { headers: h, signal: AbortSignal.timeout(5000) })
    if (!pr.ok) throw new Error(`perms ${pr.status}`)
    const prow = await pr.json()
    value = normalizePerms(rows[0].role, prow[0]?.perms)
  }
  memberCache.set(sub, { at: Date.now(), value })
  return value
}
async function guardMemberApi(request) {
  const auth = request.headers.get('authorization') || ''
  if (!auth.startsWith('Bearer ')) return null
  const perm = permOfApi(request.nextUrl.pathname, request.method)
  if (!perm) return null
  const sub = decodeSub(auth.slice(7))
  if (!sub) return null
  let perms
  try { perms = await memberPerms(sub) } catch {
    return NextResponse.json({ error: 'ただいまサーバーにつながりにくくなっています。少し時間をおいて、もう一度お試しください', code: 'upstream_unavailable' }, { status: 503 })
  }
  if (!perms || perms[perm]) return null
  const label = PERM_DEFS.find(p => p.key === perm)?.label || perm
  return NextResponse.json({ error: `この操作（${label}）の権限がありません。店舗のオーナーに権限の変更を依頼してください`, code: 'no_permission', perm }, { status: 403 })
}

// ── Fineme の利用契約のチェック（2026-10-30） ──
// 月額プランを申し込んでいない（払っていない）お店は、契約画面に要るAPI以外の /api/provider/* を使えない。
// 管理画面の表示（ContractGate）だけで隠すと、APIを直接呼べば使えてしまうため、入口で止める。
// 有効と確かめられた店だけ1分覚える（払った直後に止まり続けないよう、無効は覚えない）。
// Supabase が応答しない時は止めない（払っているお店を障害で締め出さない。機能の権限チェックとは逆の倒し方）。
const CONTRACT_CACHE_MS = 60 * 1000
const contractCache = new Map()
async function contractOkFor(claims) {
  const hit = contractCache.get(claims.sub)
  if (hit && Date.now() - hit < CONTRACT_CACHE_MS) return true
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  const h = { apikey: key, Authorization: `Bearer ${key}` }
  const get = async path => {
    const r = await fetch(`${base}/rest/v1/${path}`, { headers: h, signal: AbortSignal.timeout(5000) })
    if (!r.ok) throw new Error(`contract ${r.status}`)
    return r.json()
  }
  let rows = claims.email ? await get(`providers?email=eq.${encodeURIComponent(claims.email)}&select=plan,billing_status&limit=1`) : []
  if (!rows[0]) {
    // スタッフ個別ログイン：所属するお店の契約で決める
    const m = await get(`provider_members?user_id=eq.${claims.sub}&status=eq.active&select=provider_id&limit=1`)
    if (m[0]) rows = await get(`providers?id=eq.${m[0].provider_id}&select=plan,billing_status&limit=1`)
  }
  // お店のアカウントでなければ、ここでは判断しない（各APIが401/404を返す）
  if (!rows[0]) return true
  const ok = contractActive(rows[0])
  if (ok) contractCache.set(claims.sub, Date.now())
  return ok
}
async function guardContract(request) {
  const path = request.nextUrl.pathname
  if (!path.startsWith('/api/provider/') || contractFreeApi(path)) return null
  const auth = request.headers.get('authorization') || ''
  if (!auth.startsWith('Bearer ')) return null
  const claims = decodeClaims(auth.slice(7))
  if (!claims?.sub) return null
  try { if (await contractOkFor(claims)) return null } catch { return null }
  return NextResponse.json({ error: 'Finemeの月額プランをお申し込みいただくと使えます。管理画面からお申し込みください', code: 'contract_required' }, { status: 402 })
}

export async function middleware(request) {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return (await guardMemberApi(request)) || (await guardContract(request)) || NextResponse.next()
  }
  const host = request.headers.get('host') || ''
  if (host === 'finemenextjs.vercel.app') {
    const url = request.nextUrl.clone()
    url.host = 'fineme.me'
    url.protocol = 'https:'
    url.port = ''
    return NextResponse.redirect(url, { status: 301 })
  }

  // /index.html → / に 301 リダイレクト（重複コンテンツ対策）
  if (request.nextUrl.pathname === '/index.html') {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url, { status: 301 })
  }

  // 旧予約履歴ページ → /my-reservations に統合
  if (request.nextUrl.pathname === '/pages/mypage/reservations.html') {
    const url = request.nextUrl.clone()
    url.pathname = '/my-reservations'
    return NextResponse.redirect(url, { status: 301 })
  }

  // 旧検索ページ → Next.js /search に統合（Supabaseデータを表示）
  if (request.nextUrl.pathname === '/pages/search.html') {
    const url = request.nextUrl.clone()
    url.pathname = '/search'
    return NextResponse.redirect(url, { status: 301 })
  }

  // business/ 配下は一般公開はしない（noindex + robots.js disallow）が、
  // 協業先へ都度URLを渡す運用のため管理者Cookie認証は課さない。
  // URLを知っている人のみアクセスできる状態（2026-08-07 でお判断）。

  return NextResponse.next()
}

// でお報告2026-09-18「掲載者管理画面全体的に読み込みがめっちゃ遅い」を受けてVercelの
// 実際のランタイムログを確認したところ、ダッシュボード1回の読み込みで発生する
// 11本前後のAPI呼び出しが、全てこのミドルウェアも経由していた（edge-middleware→
// serverlessの2段階）。ここにあるルール（ホストリダイレクト・旧HTML/検索ページの
// リダイレクト）はどれも/api/*やNext内部アセットには関係ないため、対象から除外して
// 無駄な処理を減らす。
export const config = {
  matcher: ['/((?!api/|_next/static|_next/image|favicon\\.ico).*)', '/api/provider/:path*', '/api/reservations/:path*', '/api/reservations', '/api/stripe/connect/:path*'],
}
