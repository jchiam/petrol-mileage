import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const pa = enc.encode(a.padEnd(64));
  const pb = enc.encode(b.padEnd(64));
  let diff = 0;
  for (let i = 0; i < pa.length; i++) diff |= pa[i] ^ pb[i];
  return diff === 0 && a.length === b.length;
}

export function middleware(request: NextRequest) {
  const secret = request.headers.get('x-caddy-auth') ?? '';
  const expected = process.env.PROXY_SECRET ?? '';
  if (!safeEqual(secret, expected)) {
    return new NextResponse(null, { status: 404 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
