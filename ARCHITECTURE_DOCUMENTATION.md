# FPL Manager - Technical Architecture Documentation

## Overview

FPL Manager is a **Next.js 15** application that manages Fantasy Premier League (FPL) mini-leagues. It provides real-time league standings, detailed team analytics, automated data synchronization with the official FPL API, and comprehensive league management tools.

### Core Technology Stack
- **Framework**: Next.js 15 with React 19
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS with Radix UI components
- **Charts**: Recharts for data visualization
- **Authentication**: Admin login system
- **Deployment**: Vercel

---

## Project Structure

```
fpl-manager/
├── app/                    # Next.js 13+ App Router
│   ├── api/               # API routes
│   ├── layout.tsx         # Root layout
│   └── page.tsx          # Main dashboard
├── components/            # React components
│   ├── ui/               # Reusable UI components (Radix UI)
│   ├── league-standings.tsx
│   ├── team-summary-sheet.tsx
│   └── admin-panel.tsx
├── lib/                   # Core business logic
│   ├── database.ts       # Database operations
│   ├── fpl-api.ts        # FPL API interfaces
│   ├── fpl-sync.ts       # Data synchronization
│   ├── fpl-data-service.ts
│   └── supabase.ts       # Database client & types
├── scripts/               # Database schema scripts
├── hooks/                 # Custom React hooks
├── styles/               # Global styles
└── public/               # Static assets
```

---

## Core Architecture Components

### 1. Database Layer (`/lib/database.ts`, `/lib/supabase.ts`)

**Primary Tables:**
- `teams` - Core team data (entry_name, player_name, total, event_total, rank)
- `team_summaries` - Gameweek-specific performance data
- `chips` - FPL chips usage tracking (Wildcard, Bench Boost, etc.)
- `league_metadata` - League configuration and current gameweek
- `fpl_events` - FPL gameweek/event data
- `sync_logs` - Automated sync monitoring and debugging

**Key Data Models:**
```typescript
type Team = {
  id: number          // FPL entry ID
  entry_name: string  // Team name
  player_name: string // Manager name
  total: number       // Season total points
  event_total: number // Current gameweek points
  rank: number        // Current league position
  last_rank: number   // Previous gameweek position
}

type TeamSummary = {
  team_id: number
  event_number: number    // Gameweek
  points: number         // Points scored this GW
  transfers: number      // Transfers made
  overall_rank: number   // Global FPL rank
  value: number         // Squad value
  bank: number          // Money in bank
  chip_used: string     // Chip played this GW
}
```

### 2. FPL API Integration (`/lib/fpl-data-service.ts`, `/lib/fpl-sync.ts`)

**FPL API Endpoints Used:**
- `/api/bootstrap-static/` - General FPL data, current gameweek
- `/api/leagues-classic/{league_id}/standings/` - League standings
- `/api/entry/{entry_id}/` - Team details
- `/api/entry/{entry_id}/history/` - Manager's gameweek history
- `/api/entry/{entry_id}/transfers/` - Transfer history

**Data Flow:**
1. `fplDataService` handles HTTP requests to FPL API
2. `fplMappers` transforms FPL API responses to database schema
3. `FPLSyncService` orchestrates the complete sync process
4. `automatedSyncService` manages intelligent syncing based on gameweek status

### 3. Frontend Components (`/components/`)

**Core Components:**
- `LeagueStandings` - Main league table with sorting and gameweek selection
- `TeamSummarySheet` - Detailed team performance modal
- `AdminPanel` - Manual sync controls and system monitoring
- `BottomNav` - Mobile navigation (league/cup tabs)

**UI Component Library:**
- Based on Radix UI primitives with custom Tailwind styling
- Consistent design system with dark/light mode support
- Mobile-first responsive design

### 4. API Routes (`/app/api/`)

**Sync Endpoints:**
- `GET /api/cron/sync` - Automated sync (scheduled via Vercel Cron)
- `GET /api/cron/sync-full` - Complete data refresh
- `POST /api/sync/manual` - Admin-triggered sync

**FPL Proxy Endpoints:**
- `GET /api/fpl/bootstrap` - FPL bootstrap data
- `GET /api/fpl/entry/[entryId]` - Team details
- `GET /api/fpl/entry/[entryId]/history` - Manager history
- `GET /api/fpl/entry/[entryId]/transfers` - Transfer history
- `GET /api/fpl/leagues/[leagueId]/standings` - League standings

---

## Data Synchronization System

### Automated Sync Intelligence (`/lib/automated-sync-service.ts`)

The system implements intelligent syncing based on FPL gameweek status:

**Sync Types:**
1. **Bootstrap Sync** - Updates current gameweek and basic FPL data
2. **Scores Sync** - Updates current gameweek scores only
3. **Full Sync** - Complete refresh of all team data and history
4. **Incremental Sync** - Updates since last sync

**Decision Logic:**
- During active gameweeks: Frequent score updates (every 30 minutes)
- Between gameweeks: Less frequent full syncs (once daily)
- Gameweek transition detection: Automatic full sync when new GW starts
- Error handling: Fallback to incremental syncs on failures

### Sync Monitoring (`sync_logs` table)
- Tracks every sync operation with detailed metrics
- Records API call counts, processing time, errors
- Enables debugging and performance optimization
- Admin panel displays sync history and status

---

## Key Features & Functionality

### 1. League Management
- **Real-time Standings**: Live league table with current gameweek scores
- **Historical Data**: View any previous gameweek standings
- **Rank Tracking**: Visual indicators for position changes
- **Chip Tracking**: Display FPL chips used by managers

### 2. Team Analytics
- **Performance Charts**: Points progression over gameweeks
- **Transfer Analysis**: Track transfers and costs
- **Squad Value**: Monitor team value and bank balance
- **Detailed History**: Complete gameweek-by-gameweek breakdown

### 3. Admin System
- **Manual Sync Controls**: Force data updates when needed
- **System Monitoring**: View sync logs and database status
- **Error Handling**: Debug sync issues and data inconsistencies
- **Configuration**: Manage sync settings and league parameters

### 4. Mobile-First Design
- **Responsive Layout**: Optimized for mobile and desktop
- **Touch-Friendly**: Large buttons and easy navigation
- **Bottom Navigation**: Native mobile app feel
- **Sheet Modals**: Slide-up team details

---

## Database Schema Details

### Core Tables Structure

```sql
-- teams: Main team/manager data
CREATE TABLE teams (
    id INTEGER PRIMARY KEY,        -- FPL entry ID
    entry_name VARCHAR(255),       -- Team name
    player_name VARCHAR(255),      -- Manager name
    total INTEGER DEFAULT 0,       -- Season total
    event_total INTEGER DEFAULT 0, -- Current GW total
    rank INTEGER DEFAULT 0,        -- League rank
    last_rank INTEGER DEFAULT 0,   -- Previous rank
    captain VARCHAR(255),          -- Current captain
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- team_summaries: Gameweek performance data
CREATE TABLE team_summaries (
    id SERIAL PRIMARY KEY,
    team_id INTEGER REFERENCES teams(id),
    event_number INTEGER NOT NULL,
    points INTEGER DEFAULT 0,
    transfers INTEGER DEFAULT 0,
    transfers_cost INTEGER DEFAULT 0,
    overall_rank INTEGER DEFAULT 0,
    value INTEGER DEFAULT 0,
    bank INTEGER DEFAULT 0,
    chip_used VARCHAR(50),
    created_at TIMESTAMP,
    UNIQUE(team_id, event_number)
);

-- chips: FPL chips usage tracking
CREATE TABLE chips (
    id SERIAL PRIMARY KEY,
    team_id INTEGER REFERENCES teams(id),
    chip_type VARCHAR(50) NOT NULL,  -- 'wildcard', 'bboost', 'tcaptain', 'freehit'
    event_number INTEGER NOT NULL,
    used_at TIMESTAMP
);

-- league_metadata: League configuration
CREATE TABLE league_metadata (
    id SERIAL PRIMARY KEY,
    league_id INTEGER UNIQUE NOT NULL,
    league_name VARCHAR(255) NOT NULL,
    total_entries INTEGER DEFAULT 0,
    current_event INTEGER DEFAULT 1,
    last_updated TIMESTAMP
);
```

### Automated Sync Tables

```sql
-- fpl_events: FPL gameweek data
CREATE TABLE fpl_events (
    id INTEGER PRIMARY KEY,        -- FPL event ID
    name VARCHAR(255),             -- "Gameweek 1"
    deadline_time TIMESTAMP,       -- Transfer deadline
    is_current BOOLEAN,
    is_next BOOLEAN,
    is_previous BOOLEAN,
    finished BOOLEAN,              -- Gameweek completed
    data_checked BOOLEAN,          -- Official data available
    average_entry_score INTEGER,   -- Global average
    highest_score INTEGER,         -- Highest score globally
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- sync_logs: Sync operation tracking
CREATE TABLE sync_logs (
    id SERIAL PRIMARY KEY,
    sync_type VARCHAR(20),         -- 'full', 'incremental', 'scores', 'bootstrap'
    status VARCHAR(20),            -- 'started', 'completed', 'failed', 'partial'
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    duration_ms INTEGER,
    records_processed INTEGER,
    teams_updated INTEGER,
    summaries_updated INTEGER,
    events_updated INTEGER,
    errors_count INTEGER,
    error_details TEXT,
    triggered_by VARCHAR(50),      -- 'cron', 'manual', 'admin'
    fpl_api_calls INTEGER,
    current_event INTEGER,
    metadata JSONB                 -- Additional sync context
);
```

---

## Configuration & Environment

### Required Environment Variables
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
CRON_SECRET=your_cron_authentication_secret
```

### Deployment Configuration (`vercel.json`)
```json
{
  "crons": [
    {
      "path": "/api/cron/sync",
      "schedule": "*/30 8-23 * * 0,1,2,3,4,5,6"
    }
  ]
}
```

---

## Development & Maintenance

### Setup Process
1. **Database Setup**: Run SQL scripts in order:
   - `001-create-tables.sql` - Core tables
   - `003-fix-existing-tables.sql` - Schema fixes
   - `006-automated-sync-schema.sql` - Sync system tables
   - `002-seed-data.sql` - Initial data

2. **Environment Configuration**: Set up Supabase project and environment variables

3. **Initial Data Sync**: Run manual sync through admin panel

### Monitoring & Debugging
- **Sync Logs**: Monitor in admin panel or directly in database
- **API Rate Limits**: FPL API has rate limiting (handled in `fplDataService`)
- **Error Handling**: Comprehensive error logging in sync operations
- **Performance**: Track sync duration and API call counts

### Key Files for Development
- **Adding Features**: Start with `app/page.tsx` and `components/`
- **Database Changes**: Update `lib/database.ts` and add migration scripts
- **API Integration**: Modify `lib/fpl-data-service.ts` and `lib/fpl-mappers.ts`
- **Sync Logic**: Enhance `lib/automated-sync-service.ts`

---

## League Configuration

**Current Setup:**
- **League ID**: 66185 ("La Jungla LV - Premier Legue")
- **Total Entries**: 32 managers
- **Primary Focus**: League standings and performance tracking
- **Future Features**: Cup competition support (UI prepared)

This architecture provides a robust foundation for managing FPL mini-leagues with real-time data synchronization, comprehensive analytics, and scalable monitoring systems.