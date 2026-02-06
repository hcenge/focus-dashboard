import type { APIRoute } from 'astro';
import db, { type Task } from '@/lib/db';

export const GET: APIRoute = async ({ locals }) => {
  const keyId = locals.authKey.id;

  const tasks = db.prepare(
    'SELECT * FROM tasks WHERE key_id = ? ORDER BY status, position'
  ).all(keyId) as Task[];

  return new Response(JSON.stringify(tasks), {
    headers: { 'Content-Type': 'application/json' }
  });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const keyId = locals.authKey.id;
  const { text, status = 'upcoming' } = await request.json();

  if (!text?.trim()) {
    return new Response(JSON.stringify({ error: 'Text is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const maxPos = db.prepare(
    'SELECT COALESCE(MAX(position), -1) + 1 as pos FROM tasks WHERE status = ? AND key_id = ?'
  ).get(status, keyId) as { pos: number };

  const result = db.prepare(
    'INSERT INTO tasks (text, status, position, key_id) VALUES (?, ?, ?, ?)'
  ).run(text.trim(), status, maxPos.pos, keyId);

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid) as Task;

  return new Response(JSON.stringify(task), {
    status: 201,
    headers: { 'Content-Type': 'application/json' }
  });
};
