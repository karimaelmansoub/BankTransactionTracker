import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const DB_PATH = process.env.DB_PATH || './data/uetr.db';

// Ensure directory exists
mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tracked_items (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      category    TEXT NOT NULL CHECK(category IN ('uetr','public')),
      identifier  TEXT NOT NULL,
      url         TEXT NOT NULL,
      bank        TEXT,
      amount      REAL,
      currency    TEXT DEFAULT 'AUD',
      note        TEXT,
      interval_minutes INTEGER DEFAULT 5,
      status      TEXT DEFAULT 'pending',
      last_status_detail TEXT,
      content_hash TEXT,
      last_checked_at TEXT,
      last_changed_at TEXT,
      created_at  TEXT DEFAULT (datetime('now')),
      is_running  INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS status_history (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      tracked_item_id INTEGER NOT NULL,
      status          TEXT NOT NULL,
      detail          TEXT,
      bank_update_time TEXT,
      recorded_at     TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (tracked_item_id) REFERENCES tracked_items(id) ON DELETE CASCADE
    );
  `);

  console.log(`Database initialised at ${DB_PATH}`);
}
