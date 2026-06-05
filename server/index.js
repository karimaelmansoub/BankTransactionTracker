import express from 'express';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, initDb } from './db.js';
import { startJob, stopJob, runCheck, restoreJobs } from './scheduler.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());

// Serve built React client in production
const clientDist = join(__dirname, '../client/dist');
app.use(express.static(clientDist));

// ── Stats ────────────────────────────────────────────────────────────────────
app.get('/api/stats', (_req, res) => {
  const total   = db.prepare('SELECT COUNT(*) as n FROM tracked_items').get().n;
  const running = db.prepare("SELECT COUNT(*) as n FROM tracked_items WHERE is_running=1").get().n;
  const credited = db.prepare("SELECT COUNT(*) as n FROM tracked_items WHERE status IN ('Payee credited','Changed')").get().n;
  const errors  = db.prepare("SELECT COUNT(*) as n FROM tracked_items WHERE status='Error'").get().n;
  res.json({ tracked: total, running, credited, errors });
});

// ── List ─────────────────────────────────────────────────────────────────────
app.get('/api/items', (_req, res) => {
  res.json(db.prepare('SELECT * FROM tracked_items ORDER BY created_at DESC').all());
});

// ── Single + history ──────────────────────────────────────────────────────────
app.get('/api/items/:id', (req, res) => {
  const item = db.prepare('SELECT * FROM tracked_items WHERE id=?').get(+req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  const history = db.prepare('SELECT * FROM status_history WHERE tracked_item_id=? ORDER BY recorded_at DESC LIMIT 100').all(+req.params.id);
  res.json({ item, history });
});

// ── Add ───────────────────────────────────────────────────────────────────────
app.post('/api/items', (req, res) => {
  const { category, identifier, bank, amount, currency, note, interval_minutes, start_immediately } = req.body;
  if (!category || !identifier) return res.status(400).json({ error: 'category and identifier required' });

  let url;
  if (category === 'uetr') {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier))
      return res.status(400).json({ error: 'UETR must be a valid UUID' });
    url = `https://www.commbank.com.au/business-banking/paymenttracker/?UETR=${identifier}`;
  } else {
    url = identifier;
    try { new URL(url); } catch { return res.status(400).json({ error: 'Invalid URL' }); }
  }

  const mins = [1,2,5,10,60].includes(+interval_minutes) ? +interval_minutes : 5;
  const r = db.prepare(`INSERT INTO tracked_items (category,identifier,url,bank,amount,currency,note,interval_minutes)
    VALUES (?,?,?,?,?,?,?,?)`).run(category, identifier, url, bank||null, amount||null, currency||'AUD', note||null, mins);

  if (start_immediately) startJob(r.lastInsertRowid);
  res.status(201).json(db.prepare('SELECT * FROM tracked_items WHERE id=?').get(r.lastInsertRowid));
});

// ── Delete ────────────────────────────────────────────────────────────────────
app.delete('/api/items/:id', (req, res) => {
  const id = +req.params.id;
  stopJob(id);
  db.prepare('DELETE FROM status_history WHERE tracked_item_id=?').run(id);
  db.prepare('DELETE FROM tracked_items WHERE id=?').run(id);
  res.json({ ok: true });
});

// ── Start / Stop / Check ──────────────────────────────────────────────────────
app.post('/api/items/:id/start', (req, res) => { startJob(+req.params.id); res.json({ ok: true }); });
app.post('/api/items/:id/stop',  (req, res) => { stopJob(+req.params.id);  res.json({ ok: true }); });
app.post('/api/items/:id/check', async (req, res) => {
  const id = +req.params.id;
  await runCheck(id);
  const item    = db.prepare('SELECT * FROM tracked_items WHERE id=?').get(id);
  const history = db.prepare('SELECT * FROM status_history WHERE tracked_item_id=? ORDER BY recorded_at DESC LIMIT 100').all(id);
  res.json({ item, history });
});

// ── SPA fallback ──────────────────────────────────────────────────────────────
app.get('*', (_req, res) => res.sendFile(join(clientDist, 'index.html')));

// ── Boot ───────────────────────────────────────────────────────────────────────
initDb();
restoreJobs();
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`BankTransactionTracker on http://0.0.0.0:${PORT}`));
