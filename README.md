# UETR Tracker

A small full‑stack app that tracks **UETR** (Unique End‑to‑end Transaction Reference) payment
statuses. You enter a payment reference in an admin panel; a background job polls the bank's
payment‑tracker API on a schedule and records a new history entry every time the payment's
`lastUpdatedTime` (or status) changes. Jobs keep running on the server whether or not the
panel is open, and they automatically resume after a restart.

> Default endpoint (configurable):
> `GET https://www.commbank.com.au/business-banking/paymenttracker/v1/payments/{uetr}/status-summary`

---

## Features

- 🔐 **Admin panel** behind a single password.
- ➕ **Add form** — UETR (required) plus optional **bank name**, **amount/currency**, **note**, and **check frequency**.
- 🔄 **Background polling** — an in‑process scheduler calls the API every _X_ seconds per UETR.
- 🧾 **Change detection** — a new history record is saved only when `lastUpdatedTime` or `status` changes.
- 📋 **Tracked list** — status badge, amount, last update, last checked, interval, and a live **Running/Stopped** indicator.
- ⏯️ **Start / Stop** each UETR's job, **Check now** on demand, and **Delete**.
- 🕓 **Detail drawer** — full metadata and a status‑history timeline.
- ♻️ **Durable** — active jobs are persisted in SQLite and resume on server/container restart.
- 🐳 **Docker‑ready** — single multi‑stage image, SQLite on a mounted volume.

## Tech stack

| Layer     | Choice                                                              |
| --------- | ------------------------------------------------------------------- |
| Backend   | Node.js + Express, built‑in **`node:sqlite`** (no native deps)      |
| Scheduler | In‑process `setInterval` per UETR, state persisted in SQLite        |
| Frontend  | React + Vite (custom CSS, no UI framework)                          |
| Auth      | Single admin password → stateless HMAC Bearer token                 |
| Packaging | Multi‑stage Docker image                                            |

---

## Running locally

Requires **Node ≥ 22.5** (for `node:sqlite`). This was built and tested on Node 25.

### Option A — build once, run the server (closest to production)

```bash
npm install          # server deps (express)
npm run build        # installs client deps and builds the React app into client/dist
npm start            # serves API + UI on http://localhost:3000
```

Set the admin password (otherwise it defaults to `admin` with a warning):

```bash
ADMIN_PASSWORD=your-password SESSION_SECRET=some-long-random-string npm start
```

Open **http://localhost:3000** and sign in.

### Option B — live dev with hot reload

```bash
npm run install:all                       # installs server + client deps
ADMIN_PASSWORD=your-password npm run dev:server   # API on :3000 (auto‑restart)
npm run dev:client                        # Vite UI on :5173, proxies /api → :3000
```

Open **http://localhost:5173**.

---

## Configuration

All settings come from environment variables (see `.env.example`):

| Variable                          | Default                          | Purpose                                              |
| --------------------------------- | -------------------------------- | ---------------------------------------------------- |
| `ADMIN_PASSWORD`                  | `admin`                          | Password for the admin panel. **Set this.**          |
| `SESSION_SECRET`                  | `dev-insecure-secret-change-me`  | Secret for deriving session tokens. **Set this.**    |
| `PORT`                            | `3000`                           | HTTP port.                                           |
| `DEFAULT_CHECK_INTERVAL_SECONDS`  | `300`                            | Default polling cadence for new UETRs.               |
| `MIN_CHECK_INTERVAL_SECONDS`      | `30`                             | Hard floor on cadence (protects the upstream API).   |
| `REQUEST_TIMEOUT_MS`              | `20000`                          | Outbound request timeout.                            |
| `PAYMENT_API_URL_TEMPLATE`        | CommBank URL                     | API URL; `{uetr}` is substituted.                    |
| `DB_PATH`                         | `./data/uetr.db`                 | SQLite file location.                                |

---

## Docker

```bash
# Build and run with a persistent volume:
docker compose up --build -d
```

Or with plain Docker:

```bash
docker build -t uetr-tracker .
docker run -d --name uetr-tracker -p 3000:3000 \
  -e ADMIN_PASSWORD=your-password \
  -e SESSION_SECRET=some-long-random-string \
  -v uetr-data:/data \
  uetr-tracker
```

The SQLite database is stored on the `/data` volume, so tracked UETRs and history survive
container restarts, and active jobs resume automatically on boot.

For production behind your server, set strong `ADMIN_PASSWORD` / `SESSION_SECRET` (e.g. via a
`.env` file that `docker compose` reads, or your orchestrator's secrets), and put it behind
your existing HTTPS/reverse proxy.

---

## How it works

- **Polling.** When a UETR is added (or started), `JobManager` runs an immediate check and then
  a `setInterval` at the configured cadence. Each tick calls the API and stores the result.
- **Change detection.** `tracker.checkUetr()` compares the API's `lastUpdatedTime`/`status`
  against the most recent saved history row. A new `status_history` row is written **only when
  something changed** (the first successful check always records one).
- **Errors.** A `BadRequest` (invalid/untrackable UETR), timeout, or network failure is recorded
  on the row (`lastError`) and surfaced in the UI; the timer keeps running and retries next tick.
- **Durability.** `uetrs.is_active` records whether a job should run. On startup,
  `JobManager.bootstrap()` resumes every active UETR (first checks are staggered to avoid a burst).

---

## API reference

All `/api/uetrs*` routes require `Authorization: Bearer <token>`.

| Method   | Path                     | Description                                  |
| -------- | ------------------------ | -------------------------------------------- |
| `POST`   | `/api/auth/login`        | `{ password }` → `{ token }`                 |
| `GET`    | `/api/auth/me`           | Validate a token                             |
| `GET`    | `/api/uetrs`             | List all tracked UETRs                       |
| `POST`   | `/api/uetrs`             | Add a UETR (`uetr`, optional metadata, `autoStart`) |
| `GET`    | `/api/uetrs/:id`         | UETR detail + full history                   |
| `PATCH`  | `/api/uetrs/:id`         | Update bank/amount/currency/note/interval    |
| `POST`   | `/api/uetrs/:id/start`   | Start the background job                     |
| `POST`   | `/api/uetrs/:id/stop`    | Stop the background job                      |
| `POST`   | `/api/uetrs/:id/check`   | Run one check immediately                    |
| `DELETE` | `/api/uetrs/:id`         | Stop and delete (and its history)            |

---

## Project layout

```
server/        Express API, SQLite access, scheduler
  config.js    env‑driven settings + token derivation
  db.js        schema + prepared statements (node:sqlite)
  tracker.js   API call + change detection
  jobManager.js background scheduler (start/stop/resume)
  auth.js      password / Bearer‑token checks
  routes.js    REST endpoints
  index.js     server entry, static client, graceful shutdown
client/        React + Vite admin panel (built to client/dist)
Dockerfile, docker-compose.yml, .env.example
```
