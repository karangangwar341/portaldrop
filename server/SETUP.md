# Database Setup — 3 Steps

## Step 1 — Add your connection string

Open `server/.env` and replace the placeholder:

```env
DATABASE_URL="postgres://8d0e68f360318c647fad76019a47ac34b66b4d0ca16a4925aabea09e9df4d3a7:sk_CvV0B6OnImYIsQf9oCaxF@db.prisma.io:5432/postgres?sslmode=require"
```

That's the only thing you need to edit.

---

## Step 2 — Install dependencies & generate Prisma client

```bash
cd server
npm install
npm run db:generate
```

---

## Step 3 — Push schema to database

```bash
# Option A — Quick (no migration files, fine for dev/small projects):
npm run db:push

# Option B — Production-grade (creates migration history):
npm run db:migrate
```

Both commands create these tables in your Prisma DB:
- `users`
- `sessions`
- `transfer_records`

---

## Optional: Prisma Accelerate (connection pooling)

If you enabled **Prisma Accelerate** in console.prisma.io, you get two URLs:
- **Accelerate URL** — starts with `prisma://`
- **Direct URL** — the raw `postgres://` string

Edit `server/.env`:
```env
DATABASE_URL="prisma://accelerate.prisma-data.net/?api_key=..."
DIRECT_URL="postgres://8d0e...@db.prisma.io:5432/postgres?sslmode=require"
```

And uncomment `directUrl` in `prisma/schema.prisma`:
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")   # ← uncomment this line
}
```

---

## Useful commands

| Command | What it does |
|---|---|
| `npm run db:push` | Sync schema to DB (no migration files) |
| `npm run db:migrate` | Create + apply a migration |
| `npm run db:studio` | Open Prisma Studio (visual DB browser) |
| `npm run db:generate` | Re-generate Prisma Client after schema changes |
| `npm run db:reset` | Drop all data and re-apply migrations |
| `GET /health` | Returns `{ db: "connected" }` when DB is reachable |

