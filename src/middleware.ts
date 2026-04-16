import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const secret = request.headers.get('x-caddy-auth');
  if (secret !== process.env.PROXY_SECRET) {
    return new NextResponse('Forbidden', { status: 403 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
