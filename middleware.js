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

  // business/ ディレクトリは管理者のみアクセス可（社内ツール保護用）。
  // ただし店舗向け営業資料など外部の人に見せる前提のページは個別に除外する。
  const BUSINESS_PUBLIC_PATHS = [
    '/business/store-saas-pitch-deck.html',
    '/business/line-connect-guide',
  ]
  if (
    request.nextUrl.pathname.startsWith('/business/') &&
    !BUSINESS_PUBLIC_PATHS.includes(request.nextUrl.pathname)
  ) {
    const adminCookie = request.cookies.get('fineme_admin')
    if (!adminCookie?.value) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin'
      url.search = ''
      return NextResponse.redirect(url, { status: 302 })
    }
  }


  return NextResponse.next()
}

export const config = {
  matcher: '/:path*',
}
