import type { APIRoute } from 'astro';
import db, { type Task } from '@/lib/db';

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const id = params.id;
  const keyId = locals.authKey.id;
  const updates = await request.json();

  // Ensure task belongs to this user
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ? AND key_id = ?').get(id, keyId) as Task | undefined;
  if (!existing) {
    return new Response(JSON.stringify({ error: 'Task not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const fields: string[] = [];
  const values: (string | number)[] = [];

  if (updates.text !== undefined) {
    fields.push('text = ?');
    values.push(updates.text.trim());
  }

  if (updates.status !== undefined) {
    fields.push('status = ?');
    values.push(updates.status);

    // If status changed, put at end of new column
    if (updates.status !== existing.status) {
      const maxPos = db.prepare(
        'SELECT COALESCE(MAX(position), -1) + 1 as pos FROM tasks WHERE status = ? AND key_id = ?'
      ).get(updates.status, keyId) as { pos: number };
      fields.push('position = ?');
      values.push(maxPos.pos);
    }
  }

  if (updates.position !== undefined) {
    fields.push('position = ?');
    values.push(updates.position);
  }

  if (fields.length > 0) {
    values.push(Number(id));
    db.prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task;

  return new Response(JSON.stringify(task), {
    headers: { 'Content-Type': 'application/json' }
  });
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  const id = params.id;
  const keyId = locals.authKey.id;

  // Ensure task belongs to this user
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ? AND key_id = ?').get(id, keyId);
  if (!existing) {
    return new Response(JSON.stringify({ error: 'Task not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  db.prepare('DELETE FROM tasks WHERE id = ?').run(id);

  return new Response(null, { status: 204 });
};
