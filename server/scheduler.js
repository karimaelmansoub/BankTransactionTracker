import cron from 'node-cron';
import { db } from './db.js';
import { checkUETR } from './scrapers/uetr.js';
import { checkPublicUrl } from './scrapers/public.js';

const activeTasks = new Map();
const TERMINAL = ['Payee credited', 'Failed'];

function intervalToCron(minutes) {
  return minutes < 60 ? `*/${minutes} * * * *` : `0 * * * *`;
}

export async function runCheck(itemId) {
  const item = db.prepare('SELECT * FROM tracked_items WHERE id = ?').get(itemId);
  if (!item) return;

  const result = item.category === 'uetr'
    ? await checkUETR(item.identifier)
    : await checkPublicUrl(item.url);

  const now = new Date().toISOString();

  if (item.category === 'uetr') {
    const statusChanged = item.status !== result.status;
    db.prepare(`UPDATE tracked_items SET
      status=?, last_status_detail=?, content_hash=?, last_checked_at=?, last_changed_at=?
      WHERE id=?`).run(
      result.status,
      result.detail ?? null,
      result.contentHash ?? item.content_hash,
      now,
      statusChanged ? now : item.last_changed_at,
      itemId
    );

    if (statusChanged || !item.status || item.status === 'pending') {
      db.prepare(`INSERT INTO status_history (tracked_item_id, status, detail, bank_update_time, recorded_at)
        VALUES (?,?,?,?,?)`).run(itemId, result.status, result.detail ?? null, result.bankUpdateTime ?? null, now);
    }

    if (TERMINAL.includes(result.status)) {
      console.log(`[${now}] Auto-stopping item ${itemId}: "${result.status}"`);
      stopJob(itemId);
    }
  } else {
    const changed = result.contentHash && item.content_hash !== result.contentHash;
    const status = result.success ? (changed ? 'Changed' : 'No change') : 'Error';

    db.prepare(`UPDATE tracked_items SET
      status=?, last_status_detail=?, content_hash=?, last_checked_at=?, last_changed_at=?
      WHERE id=?`).run(
      status,
      result.snippet ?? null,
      result.contentHash ?? item.content_hash,
      now,
      changed ? now : item.last_changed_at,
      itemId
    );

    db.prepare(`INSERT INTO status_history (tracked_item_id, status, detail, recorded_at)
      VALUES (?,?,?,?)`).run(itemId, status, result.snippet ?? null, now);
  }

  console.log(`[${now}] Checked #${itemId} (${item.category}): ${result.status ?? 'done'}`);
}

export function startJob(itemId) {
  if (activeTasks.has(itemId)) return;
  const item = db.prepare('SELECT * FROM tracked_items WHERE id = ?').get(itemId);
  if (!item) return;
  if (item.category === 'uetr' && TERMINAL.includes(item.status)) return;

  const task = cron.schedule(intervalToCron(item.interval_minutes), () => runCheck(itemId));
  activeTasks.set(itemId, task);
  db.prepare('UPDATE tracked_items SET is_running=1 WHERE id=?').run(itemId);
  runCheck(itemId); // immediate first check
  console.log(`Started job #${itemId} (${intervalToCron(item.interval_minutes)})`);
}

export function stopJob(itemId) {
  const task = activeTasks.get(itemId);
  if (task) { task.stop(); activeTasks.delete(itemId); }
  db.prepare('UPDATE tracked_items SET is_running=0 WHERE id=?').run(itemId);
}

export function restoreJobs() {
  const running = db.prepare('SELECT id FROM tracked_items WHERE is_running=1').all();
  for (const { id } of running) startJob(id);
  if (running.length) console.log(`Restored ${running.length} jobs`);
}

export function isRunning(id) { return activeTasks.has(id); }
