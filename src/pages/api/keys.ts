import type { APIRoute } from 'astro';
import db from '@/lib/db';
import { generateKey } from '@/lib/words';

function isAdmin(locals: App.Locals): boolean {
  return Boolean(locals.authKey?.is_admin);
}

export const GET: APIRoute = async ({ locals }) => {
  if (!isAdmin(locals)) {
    return new Response(JSON.stringify({ error: 'Admin access required' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const keys = db.prepare('SELECT id, key, label, is_admin, created_at FROM auth_keys ORDER BY created_at DESC').all();

  return new Response(JSON.stringify(keys), {
    headers: { 'Content-Type': 'application/json' }
  });
};

export const POST: APIRoute = async ({ request, locals }) => {
  if (!isAdmin(locals)) {
    return new Response(JSON.stringify({ error: 'Admin access required' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const body = await request.json().catch(() => ({}));
  const label = body.label || null;

  // Generate a unique key
  let key = generateKey();
  let attempts = 0;
  while (attempts < 10) {
    const existing = db.prepare('SELECT id FROM auth_keys WHERE key = ?').get(key);
    if (!existing) break;
    key = generateKey();
    attempts++;
  }

  const result = db.prepare('INSERT INTO auth_keys (key, label) VALUES (?, ?)').run(key, label);

  // Create a timer row for this key
  db.prepare('INSERT INTO timer (key_id, duration, remaining, is_running) VALUES (?, 0, 0, 0)').run(result.lastInsertRowid);

  return new Response(JSON.stringify({
    id: result.lastInsertRowid,
    key,
    label,
    message: 'Key created successfully'
  }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' }
  });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  if (!isAdmin(locals)) {
    return new Response(JSON.stringify({ error: 'Admin access required' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { id } = await request.json();

  if (!id) {
    return new Response(JSON.stringify({ error: 'Key ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Prevent deleting yourself
  if (id === locals.authKey.id) {
    return new Response(JSON.stringify({ error: 'Cannot delete your own key' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  db.prepare('DELETE FROM auth_keys WHERE id = ?').run(id);

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
};
