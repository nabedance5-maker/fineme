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
  return NextResponse.next()
}

export const config = {
  matcher: '/:path*',
}
