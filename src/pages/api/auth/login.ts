import type { APIRoute } from 'astro';
import { getKeyByValue } from '@/lib/db';

export const POST: APIRoute = async ({ request, cookies }) => {
  const { key } = await request.json();

  if (!key || typeof key !== 'string') {
    return new Response(JSON.stringify({ error: 'Key required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const keyRecord = getKeyByValue(key.toLowerCase().trim());

  if (!keyRecord) {
    return new Response(JSON.stringify({ error: 'Invalid access key' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Set auth cookie (httpOnly, 30 days)
  cookies.set('auth_key', keyRecord.key, {
    path: '/',
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30 // 30 days
  });

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
};
