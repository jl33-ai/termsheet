termsheet — local dev

- prereqs: node 20+, postgres 15+
- install: `npm i`
- env: `.env.development` with `DATABASE_URL=postgres://...`
- db: `npm run db:push` (drizzle; schema `src/db/schema.ts`, no migrations)
- run: `npm run dev` → http://localhost:5173
- optional: `npm run db:reset` (wipes local db)
