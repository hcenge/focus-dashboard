import Database from 'better-sqlite3';
import { join } from 'path';

const dbPath = join(process.cwd(), 'data/tasks.db');

const db = new Database(dbPath);

// Auth keys table
db.exec(`
  CREATE TABLE IF NOT EXISTS auth_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    label TEXT,
    is_admin INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Add is_admin column if it doesn't exist (migration for existing DBs)
try {
  db.exec('ALTER TABLE auth_keys ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0');
} catch (e) {
  // Column already exists
}

// Tasks table with key_id
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'upcoming',
    position INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    key_id INTEGER,
    FOREIGN KEY (key_id) REFERENCES auth_keys(id) ON DELETE CASCADE
  )
`);

// Add key_id column if it doesn't exist (migration for existing DBs)
try {
  db.exec('ALTER TABLE tasks ADD COLUMN key_id INTEGER REFERENCES auth_keys(id) ON DELETE CASCADE');
} catch (e) {
  // Column already exists
}

// Timer table with key_id
db.exec(`
  CREATE TABLE IF NOT EXISTS timer (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key_id INTEGER NOT NULL UNIQUE,
    duration INTEGER NOT NULL DEFAULT 0,
    remaining INTEGER NOT NULL DEFAULT 0,
    is_running INTEGER NOT NULL DEFAULT 0,
    started_at INTEGER,
    task_id INTEGER,
    FOREIGN KEY (key_id) REFERENCES auth_keys(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
  )
`);

export interface AuthKey {
  id: number;
  key: string;
  label: string | null;
  is_admin: boolean;
  created_at: string;
}

export interface Task {
  id: number;
  text: string;
  status: 'upcoming' | 'doing' | 'done';
  position: number;
  created_at: string;
  key_id: number;
}

export function getKeyByValue(key: string): AuthKey | undefined {
  return db.prepare('SELECT * FROM auth_keys WHERE key = ?').get(key) as AuthKey | undefined;
}

export function getKeyById(id: number): AuthKey | undefined {
  return db.prepare('SELECT * FROM auth_keys WHERE id = ?').get(id) as AuthKey | undefined;
}

export default db;
