import type { APIRoute } from 'astro';
import db from '@/lib/db';

interface TimerState {
  duration: number;
  remaining: number;
  is_running: boolean;
  started_at: number | null;
  task_id: number | null;
}

function getTimerState(keyId: number): TimerState {
  const row = db.prepare('SELECT * FROM timer WHERE key_id = ?').get(keyId) as any;

  if (!row) {
    // Create timer for this key if it doesn't exist
    db.prepare('INSERT INTO timer (key_id, duration, remaining, is_running) VALUES (?, 0, 0, 0)').run(keyId);
    return { duration: 0, remaining: 0, is_running: false, started_at: null, task_id: null };
  }

  let remaining = row.remaining;

  // If running, calculate actual remaining time
  if (row.is_running && row.started_at) {
    const elapsed = Math.floor((Date.now() - row.started_at) / 1000);
    remaining = Math.max(0, row.remaining - elapsed);

    // If time ran out, stop the timer
    if (remaining === 0) {
      db.prepare('UPDATE timer SET is_running = 0, remaining = 0, started_at = NULL WHERE key_id = ?').run(keyId);
    }
  }

  return {
    duration: row.duration,
    remaining,
    is_running: Boolean(row.is_running),
    started_at: row.started_at,
    task_id: row.task_id
  };
}

export const GET: APIRoute = async ({ locals }) => {
  const keyId = locals.authKey.id;
  const state = getTimerState(keyId);

  return new Response(JSON.stringify(state), {
    headers: { 'Content-Type': 'application/json' }
  });
};

export const PATCH: APIRoute = async ({ request, locals }) => {
  const keyId = locals.authKey.id;
  const updates = await request.json();
  const current = getTimerState(keyId);

  // Set duration (also resets remaining)
  if (updates.duration !== undefined) {
    db.prepare('UPDATE timer SET duration = ?, remaining = ?, is_running = 0, started_at = NULL WHERE key_id = ?')
      .run(updates.duration, updates.duration, keyId);
  }

  // Start timer
  if (updates.action === 'start') {
    const remaining = current.remaining > 0 ? current.remaining : current.duration;
    db.prepare('UPDATE timer SET is_running = 1, started_at = ?, remaining = ? WHERE key_id = ?')
      .run(Date.now(), remaining, keyId);
  }

  // Pause timer
  if (updates.action === 'pause') {
    const remaining = current.remaining;
    db.prepare('UPDATE timer SET is_running = 0, started_at = NULL, remaining = ? WHERE key_id = ?')
      .run(remaining, keyId);
  }

  // Reset timer
  if (updates.action === 'reset') {
    db.prepare('UPDATE timer SET remaining = duration, is_running = 0, started_at = NULL WHERE key_id = ?').run(keyId);
  }

  // Set focus task
  if (updates.task_id !== undefined) {
    db.prepare('UPDATE timer SET task_id = ? WHERE key_id = ?').run(updates.task_id, keyId);
  }

  const state = getTimerState(keyId);

  return new Response(JSON.stringify(state), {
    headers: { 'Content-Type': 'application/json' }
  });
};
