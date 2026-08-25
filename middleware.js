import { NextResponse } from 'next/server'

export function middleware(request) {
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

export const config = {
  matcher: '/:path*',
}
