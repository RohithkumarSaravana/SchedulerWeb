# Roster Control — Cleaning Roster Scheduler (Stage 2)

A professional web build of the cleaning-contractor roster scheduler, replacing the Stage 1
Python/Streamlit prototype (`../cleanroom`). Same scheduling logic — general weekly roster
with workload balancing, same-day sick cover, and the nightly cleanroom relay (CCRI → PAO1 →
PAO2, PAO3 on Wed/Sun) — rebuilt as a real app with a designed UI and a proper database.

## Stack

- **Next.js 16** (App Router, Turbopack, Server Actions) + **TypeScript**
- **Tailwind CSS v4** with a custom design system (see below)
- **Prisma 7** + **Postgres** (via the `@prisma/adapter-neon` driver adapter — HTTP-based,
  built for serverless; works well on Vercel)
- Radix UI primitives (dialog, select, tabs, checkbox, switch) restyled to match the design
- `html-to-image` + `jsPDF` for client-side PNG/PDF export of rosters and the daily sheet

## Design

"Facility control room" identity — a dark graphite sidebar (the control panel frame) around
a light "readout" workspace, a single safety-yellow accent, and functional clean/dirty-side
color semantics pulled from the client's own vocabulary. Typeface: IBM Plex Sans (UI/body) +
IBM Plex Mono (data, timestamps, room/role codes). Full light/dark theme support.

The signature element is the **Tonight's Relay** timeline on the Overview page — a timed
node-path (21:30 clock-in → pre-step → CCRI → PAO1→PAO2 → target finish, with PAO3 inserted
first on Wed/Sun) that mirrors the real shift, not a generic progress bar.

## Run it

Needs a Postgres database — the free [Neon](https://neon.tech) tier works well, and is also
available as a one-click integration from the Vercel dashboard's Storage tab.

```bash
npm install
cp .env.example .env   # then fill in DATABASE_URL with your Postgres connection string
npx prisma generate
npx prisma db push
npx tsx prisma/seed.ts
npm run dev
```

Opens at http://localhost:3000. The dummy dataset (32 employees, 52 tasks, ported from the
Python prototype's seed) is loaded by `prisma/seed.ts` — it wipes and reseeds every time it's
run, so it's always safe to rerun.

## Deploying to Vercel

1. Push this repo to GitHub.
2. In Vercel: **Storage → Create Database → Postgres (Neon)** — this sets `DATABASE_URL` on
   the project automatically. (Or bring your own Postgres and set `DATABASE_URL` yourself
   under Project Settings → Environment Variables.)
3. Import the GitHub repo as a new Vercel project — it auto-detects Next.js, no config needed.
   `npm run build` will run `prisma generate` first via the `postinstall` script.
4. Before or after the first deploy, run the schema push and seed **against the same
   `DATABASE_URL`** from your machine:
   ```bash
   DATABASE_URL="<paste the Vercel/Neon connection string>" npx prisma db push
   DATABASE_URL="<paste the Vercel/Neon connection string>" npx tsx prisma/seed.ts
   ```
   (Vercel doesn't run migrations automatically — this is a one-time step per environment.)

## Verify the scheduling engine

```bash
npx tsx scripts/verify.ts
```

Port of the Python prototype's test suite — checks the TypeScript engine produces identical
results (same headcounts, same workload balance, same relay structure) against the same seed
data.

## Layout

```
prisma/           schema.prisma, seed.ts
src/lib/          domain.ts, scheduler.ts, cleanroomRelay.ts   (engine, ported from Python)
                   prisma.ts, export-client.ts, utils.ts
src/app/actions/  Server Actions (CRUD, roster/relay generation, leave)
src/app/*/page.tsx  one route per screen (Overview, Employees, General Tasks,
                   Cleanroom Setup, Weekly Roster, Daily Schedule, Leave, Settings)
src/components/   ui/ (design-system primitives), layout/, employees/, tasks/,
                   cleanroom/, roster/, daily/, leave/, settings/, relay-timeline.tsx
```

## Notes

- `src/lib/cleanroomRelay.ts` and `src/lib/scheduler.ts` import Prisma directly and must
  never be imported from a `"use client"` component (pulls the Neon driver adapter and its
  Node dependencies into the browser bundle). Shared display-only constants (`ROOM_ORDER`,
  `PHASE_ORDER`) live in `src/lib/domain.ts` instead, which has no server dependencies.
- Every data-driven page is `export const dynamic = "force-dynamic"` — this is a live admin
  tool, not a marketing site; nothing should be statically frozen at build time.
- No login in this stage either (single shared-browser tool for supervisor + manager), same
  as the Python prototype's Stage 1 decision.
