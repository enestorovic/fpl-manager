# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm run dev      # Start development server (Next.js 15, port 3000)
npm run build    # Production build
npm run lint     # ESLint (note: build ignores lint errors per next.config.mjs)
npm run start    # Start production server
```

There are no tests configured in this project.

### Triggering Syncs Locally

The sync API routes require `Authorization: Bearer <CRON_SECRET>` header. The local `.env.local` `CRON_SECRET` differs from the Vercel production secret.

## Environment Variables

Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `CRON_SECRET` - Bearer token for cron/sync API routes

## Architecture Overview

### Data Flow

```
FPL Official API → fpl-data-service.ts → fpl-mappers.ts → Supabase DB → Next.js frontend
```

1. `lib/fpl-data-service.ts` — Singleton HTTP client (`fplDataService`) for all FPL API calls. FPL API base: `https://fantasy.premierleague.com/api/`. Endpoints: `/bootstrap-static/`, `/leagues-classic/{id}/standings/`, `/entry/{id}/`, `/entry/{id}/history/`, `/entry/{id}/transfers/`.

2. `lib/fpl-mappers.ts` — Pure transformation functions: API response objects → Supabase row shapes.

3. `lib/automated-sync-service.ts` — Active sync orchestrator (`automatedSyncService` singleton). Four sync modes:
   - `runBootstrapSync()` — Updates gameweek/event metadata
   - `runFullSync()` — All 36 teams, complete history rewrite
   - `runIncrementalSync()` — Only changed data since last sync
   - `runScoresSync()` — Current gameweek scores only

4. `lib/database.ts` — All Supabase query functions. Standings calculation lives here (`getTeamsWithCorrectTotals()` recalculates totals from `team_summaries` to avoid stale data).

5. `lib/supabase.ts` — Supabase client + TypeScript types for all DB tables.

### Database Schema (key tables)

| Table | Purpose |
|-------|---------|
| `teams` | One row per FPL entry: name, player, rank, totals |
| `team_summaries` | One row per team per gameweek: points, value, chip_used, transfers, overall_rank |
| `chips` | Chips usage per team per gameweek |
| `league_metadata` | Single row: league config, current gameweek |
| `fpl_events` | Gameweek metadata (deadlines, `data_checked`, `finished`) |
| `sync_logs` | Sync run history for debugging |
| `tournaments` / `tournament_matches` / `tournament_standings` | Cup competition data |

### API Routes

```
/api/cron/sync-full      → Full sync (triggered by GitHub Actions daily at 8 AM UTC)
/api/cron/sync           → Intelligent sync (checks gameweek state, picks mode)
/api/sync/manual         → Manual trigger + status check (admin UI)
/api/fpl/*               → Proxy routes to FPL API (avoids CORS)
```

### Frontend Structure

Single-page app (`app/page.tsx`) with four tabs: **league**, **cup**, **bases**, **stats**.

- `components/league-standings.tsx` — Main league table, gameweek selector
- `components/tournament-viewer.tsx` / `public-tournament-viewer.tsx` — Cup brackets; reads from `team_summaries`
- `components/group-stage-viewer.tsx` — Self-contained; fetches its own data internally
- `components/automated-admin-panel.tsx` — Admin controls for sync triggers and config
- `components/stats-table.tsx` — Season statistics table
- `components/bases-viewer.tsx` — Static bases/calendar viewer

### Tournament System

Tournaments are stored in Supabase and managed via admin UI. `lib/tournament-utils.ts` contains scheduling logic (round-robin, knockout seeding). Tournament scores are derived from `team_summaries.points` for each relevant gameweek.

### Sync Strategy & Known Issues

The GitHub Actions workflow (`.github/workflows/sync.yml`) calls `/api/cron/sync-full` daily. The `VERCEL_URL` secret must be set to `fpl-manager-eight.vercel.app` (no `https://` prefix — the workflow prepends it).

**Known bug**: During Double Gameweeks (DGW), `history/` API only reflects the first fixture's score until `data_checked=true` (~1-2h after all fixtures finish). Fix requires calculating live scores from `/entry/{id}/event/{eventId}/picks/` + `/event/{eventId}/live/` endpoints — not yet implemented.

### Styling

Tailwind CSS with a custom "jungla" retro theme (pink/purple/dark). Component library is Radix UI (files in `components/ui/`). Use the `cn()` utility from `lib/utils.ts` for conditional class merging.
