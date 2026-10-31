import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const appPassword = process.env.APP_PASSWORD;

  // If no APP_PASSWORD is set, auth is disabled
  if (!appPassword) {
    return NextResponse.next();
  }

  // Allow static files and font assets without auth
  const pathname = request.nextUrl.pathname;
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/fonts') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.endsWith('.woff2') ||
    pathname.endsWith('.woff')
  ) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const [scheme, encoded] = authHeader.split(' ');
    if (scheme === 'Basic' && encoded) {
      try {
        const decoded = atob(encoded);
        // format is username:password
        const colonIdx = decoded.indexOf(':');
        const password = colonIdx >= 0 ? decoded.substring(colonIdx + 1) : decoded;

        if (password === appPassword) {
          return NextResponse.next();
        }
      } catch {
        // Fall through to 401
      }
    }
  }

  return new NextResponse('認証が必要です', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Shift Manager"',
    },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|fonts).*)'],
};
