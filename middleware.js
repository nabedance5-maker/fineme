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

  // /account → /my-reservations
  if (request.nextUrl.pathname === '/account') {
    const url = request.nextUrl.clone()
    url.pathname = '/my-reservations'
    return NextResponse.redirect(url, { status: 302 })
  }

  // 旧マイページ → /my-reservations に統合
  const legacyMypage = [
    '/pages/mypage/reservations.html',
    '/pages/mypage/index.html',
    '/pages/mypage/',
    '/pages/mypage',
  ]
  if (legacyMypage.includes(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/my-reservations'
    return NextResponse.redirect(url, { status: 301 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/:path*',
}
