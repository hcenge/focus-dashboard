#!/usr/bin/env node
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, '../data/tasks.db');

const db = new Database(dbPath);

// Word list (subset for the script)
const words = [
  'apple', 'arrow', 'beach', 'berry', 'blade', 'blaze', 'bloom', 'brave',
  'brick', 'brook', 'cabin', 'candy', 'cedar', 'chain', 'chalk', 'charm',
  'chess', 'cliff', 'cloud', 'coral', 'crane', 'dance', 'delta', 'dream',
  'eagle', 'earth', 'ember', 'fable', 'feast', 'flame', 'flora', 'forge',
  'frost', 'ghost', 'glade', 'gleam', 'globe', 'grace', 'grape', 'grove',
  'haven', 'hazel', 'heart', 'heron', 'honey', 'horse', 'ivory', 'jewel',
  'karma', 'lemon', 'light', 'lilac', 'lotus', 'lunar', 'magic', 'maple',
  'marsh', 'melon', 'mirth', 'mocha', 'moon', 'noble', 'north', 'oasis',
  'ocean', 'olive', 'orbit', 'otter', 'pearl', 'petal', 'piano', 'prism',
  'quartz', 'raven', 'ridge', 'river', 'robin', 'royal', 'sage', 'shore',
  'silver', 'slate', 'smoke', 'solar', 'spark', 'spice', 'spring', 'star',
  'stone', 'storm', 'sugar', 'swift', 'terra', 'tiger', 'torch', 'tulip',
  'umbra', 'vapor', 'velvet', 'violet', 'water', 'wheat', 'willow', 'winter',
  'woods', 'zebra', 'zephyr', 'coral', 'dune', 'ember', 'fern', 'glow'
];

function generateKey() {
  const w1 = words[Math.floor(Math.random() * words.length)];
  const w2 = words[Math.floor(Math.random() * words.length)];
  const w3 = words[Math.floor(Math.random() * words.length)];
  return `${w1}.${w2}.${w3}`;
}

// Ensure tables exist
db.exec(`
  CREATE TABLE IF NOT EXISTS auth_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    label TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Check if timer table has key_id column, if not recreate it
const timerInfo = db.prepare("PRAGMA table_info(timer)").all();
const hasKeyId = timerInfo.some(col => col.name === 'key_id');

if (!hasKeyId && timerInfo.length > 0) {
  // Old timer table exists without key_id - drop it
  db.exec('DROP TABLE timer');
}

db.exec(`
  CREATE TABLE IF NOT EXISTS timer (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key_id INTEGER NOT NULL UNIQUE,
    duration INTEGER NOT NULL DEFAULT 0,
    remaining INTEGER NOT NULL DEFAULT 0,
    is_running INTEGER NOT NULL DEFAULT 0,
    started_at INTEGER,
    task_id INTEGER,
    FOREIGN KEY (key_id) REFERENCES auth_keys(id) ON DELETE CASCADE
  )
`);

// Generate unique key
let key = generateKey();
let attempts = 0;
while (attempts < 10) {
  const existing = db.prepare('SELECT id FROM auth_keys WHERE key = ?').get(key);
  if (!existing) break;
  key = generateKey();
  attempts++;
}

// Parse arguments
const args = process.argv.slice(2);
const isAdmin = args.includes('--admin');
const label = args.filter(a => a !== '--admin')[0] || null;

const result = db.prepare('INSERT INTO auth_keys (key, label, is_admin) VALUES (?, ?, ?)').run(key, label, isAdmin ? 1 : 0);

// Create timer for this key
db.prepare('INSERT INTO timer (key_id, duration, remaining, is_running) VALUES (?, 0, 0, 0)').run(result.lastInsertRowid);

console.log('\n✓ Created new access key:\n');
console.log(`  ${key}`);
if (label) console.log(`  Label: ${label}`);
if (isAdmin) console.log(`  Admin: yes`);
console.log('\nUse this key to log in at /login\n');
