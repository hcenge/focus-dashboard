import { defineMiddleware } from 'astro:middleware';
import { getKeyByValue } from '@/lib/db';

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/auth/logout'];

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // Allow public paths
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return next();
  }

  // Allow static assets
  if (pathname.startsWith('/_astro') || pathname.match(/\.(css|js|ico|png|svg|jpg|jpeg|gif|webp|woff|woff2)$/)) {
    return next();
  }

  // Check for auth cookie
  const authKey = context.cookies.get('auth_key')?.value;

  if (!authKey) {
    return context.redirect('/login');
  }

  // Validate the key
  const keyRecord = getKeyByValue(authKey);

  if (!keyRecord) {
    // Invalid key, clear cookie and redirect
    context.cookies.delete('auth_key', { path: '/' });
    return context.redirect('/login');
  }

  // Attach key info to locals for use in pages/API routes
  context.locals.authKey = keyRecord;

  return next();
});
