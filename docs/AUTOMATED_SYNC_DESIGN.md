# FPL Automated Sync Architecture

## Database Schema Improvements

### 1. Add Events Table (from Bootstrap)
```sql
CREATE TABLE fpl_events (
    id INTEGER PRIMARY KEY,              -- Event ID from FPL
    name VARCHAR(255) NOT NULL,          -- "Gameweek 1"
    deadline_time TIMESTAMP,             -- When deadline passes
    is_current BOOLEAN DEFAULT FALSE,    -- Current gameweek
    is_next BOOLEAN DEFAULT FALSE,       -- Next gameweek
    is_previous BOOLEAN DEFAULT FALSE,   -- Previous gameweek
    finished BOOLEAN DEFAULT FALSE,      -- Event finished
    data_checked BOOLEAN DEFAULT FALSE,  -- Has final data been processed
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2. Add Sync Monitoring
```sql
CREATE TABLE sync_logs (
    id SERIAL PRIMARY KEY,
    sync_type VARCHAR(50) NOT NULL,      -- 'full', 'incremental', 'scores'
    status VARCHAR(20) NOT NULL,         -- 'started', 'completed', 'failed'
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    duration_ms INTEGER,
    records_processed INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,
    error_details TEXT,
    triggered_by VARCHAR(50)             -- 'cron', 'manual', 'webhook'
);
```

### 3. Optimize Team Summaries
```sql
-- Add indexes for better performance
CREATE INDEX idx_team_summaries_team_event ON team_summaries(team_id, event_number);
CREATE INDEX idx_team_summaries_event ON team_summaries(event_number);
CREATE INDEX idx_teams_updated ON teams(updated_at);
```

## Sync Strategy

### Hourly Sync Types
1. **Score Updates** (during active gameweeks)
   - Only update current gameweek scores
   - Fast, lightweight updates
   
2. **Full Sync** (daily or when gameweek changes)
   - Update all teams, new gameweek data
   - Run once daily or on gameweek transitions
   
3. **Bootstrap Sync** (weekly)
   - Update events, player data
   - Less frequent, more comprehensive

### Automation Options

#### Option 1: Vercel Cron Functions (Recommended for web hosting)
```typescript
// app/api/cron/sync-scores/route.ts
export async function GET() {
  return await scheduledSync('scores')
}

// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/sync-scores",
      "schedule": "0 * * * *"  // Every hour
    },
    {
      "path": "/api/cron/sync-full", 
      "schedule": "0 3 * * *"   // Daily at 3 AM
    }
  ]
}
```

#### Option 2: GitHub Actions (Alternative)
```yaml
# .github/workflows/sync.yml
name: FPL Sync
on:
  schedule:
    - cron: '0 * * * *'  # Every hour
  workflow_dispatch:      # Manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Sync
        run: curl -X POST ${{ secrets.SYNC_WEBHOOK_URL }}
```

## Implementation Plan

### Phase 1: Database Migration
- [ ] Add new tables (events, sync_logs)
- [ ] Add indexes for performance
- [ ] Migrate existing data

### Phase 2: Incremental Sync Logic
- [ ] Smart sync that only updates changed data
- [ ] Proper error handling and retry logic
- [ ] Sync monitoring and alerting

### Phase 3: Automation Setup
- [ ] Vercel cron functions
- [ ] Monitoring dashboard
- [ ] Error notifications

### Phase 4: Performance Optimization
- [ ] Database query optimization
- [ ] Caching strategy
- [ ] Rate limiting for FPL API

## Benefits of New Approach

1. **Efficient**: Only syncs what changed
2. **Reliable**: Proper error handling and retries
3. **Monitorable**: Track sync performance and issues
4. **Scalable**: Can handle larger leagues and more data
5. **Web-friendly**: Uses Vercel cron for hosting