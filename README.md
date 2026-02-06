# Focus Dashboard

Minimal task dashboard optimized for e-ink displays. Astro + SQLite.

## Dev

```bash
npm install
npm run dev
```

## Auth

Three-word keys (e.g., `horse.battery.staple`). Each key gets isolated tasks/timer.

```bash
# Create a key
npm run create-key "Name"

# Create an admin key
npm run create-key "Name" --admin
```

Admins can manage keys via `GET/POST/DELETE /api/keys`.

## Deploy

```bash
npm run build
npm run start  # or: node dist/server/entry.mjs
```

Set `HOST=0.0.0.0` and `PORT=4321` as needed. SQLite database lives in `data/tasks.db`.
