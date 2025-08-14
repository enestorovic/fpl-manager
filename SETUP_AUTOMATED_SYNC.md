# Automated FPL Sync Setup Guide

## Overview

You now have a complete automated sync system that will:
- ✅ Run intelligent sync every hour via Vercel Cron
- ✅ Run full sync daily at 3 AM
- ✅ Track all sync operations with detailed logs
- ✅ Provide a comprehensive admin panel
- ✅ Handle errors gracefully with retries

## Setup Steps

### 1. Database Migration

First, run the new database schema:

```sql
-- Run this in your Supabase SQL editor
-- File: scripts/006-automated-sync-schema.sql
```

This adds:
- `fpl_events` table (gameweeks from FPL bootstrap)
- `sync_logs` table (sync monitoring and history)
- `sync_config` table (configuration)
- Performance indexes
- Helper functions

### 2. Environment Variables

Add to your `.env.local`:

```bash
# Required for Vercel Cron authentication
CRON_SECRET=your-random-secret-here

# Your existing variables
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. Deploy to Vercel

The `vercel.json` configuration will automatically set up:
- Hourly sync: `/api/cron/sync` (every hour)
- Daily full sync: `/api/cron/sync-full` (3 AM daily)

### 4. Test the System

1. **Manual Sync Test:**
   - Go to admin panel → Click "Bootstrap" to initialize
   - Then try "Smart Sync" to test the automation logic

2. **API Test:**
   ```bash
   # Test manual sync endpoint
   curl -X POST http://localhost:3002/api/sync/manual \
     -H "Content-Type: application/json" \
     -d '{"syncType": "bootstrap"}'
   
   # Check sync status
   curl http://localhost:3002/api/sync/manual
   ```

## How It Works

### Sync Types

1. **Bootstrap Sync**
   - Initializes FPL events (gameweeks)
   - Run once when setting up
   - Also updates events periodically

2. **Full Sync**
   - Updates all teams, league data
   - Syncs current gameweek details
   - Runs daily at 3 AM

3. **Incremental Sync**
   - Updates team standings only
   - Lightweight, fast operation
   - Default for hourly runs

4. **Scores Sync**
   - Updates current gameweek scores only
   - For live gameweek updates
   - Most efficient during active games

### Smart Sync Logic

The system automatically determines what type of sync to run:

```typescript
// Determines sync type based on:
- Time since last sync
- Current gameweek status  
- Whether data exists
- Season state (active/off-season)
```

### Monitoring

The admin panel shows:
- ✅ Last sync time and status
- ✅ Average sync duration
- ✅ Recent errors and logs
- ✅ Database record counts
- ✅ Real-time sync status

### Error Handling

- Automatic retries on API failures
- Graceful degradation when FPL API is down
- Detailed error logging
- Partial sync completion tracking

## Production Deployment

### Vercel Deployment

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Add automated sync system"
   git push
   ```

2. **Deploy to Vercel:**
   - Connect your GitHub repo
   - Add environment variables
   - Deploy

3. **Set Cron Secret:**
   ```bash
   # In Vercel dashboard → Settings → Environment Variables
   CRON_SECRET = your-random-secret-here
   ```

### Monitoring in Production

1. **Check Sync Logs:**
   - Admin panel → Recent Sync Activity
   - Database → `sync_logs` table

2. **Vercel Function Logs:**
   - Vercel dashboard → Functions tab
   - View cron execution logs

3. **Set Up Alerts:**
   - Monitor sync failures
   - Alert on consecutive errors
   - Track API rate limits

## Troubleshooting

### Common Issues

1. **No Events Data:**
   - Run Bootstrap sync first
   - Check FPL API availability

2. **Cron Not Running:**
   - Verify `CRON_SECRET` environment variable
   - Check Vercel function logs
   - Ensure correct timezone settings

3. **Sync Failures:**
   - Check recent error logs in admin panel
   - Verify database connection
   - Check FPL API rate limits

### Manual Recovery

```sql
-- Reset sync state if needed
DELETE FROM sync_logs WHERE status = 'started';

-- Check last successful sync
SELECT * FROM sync_logs 
WHERE status = 'completed' 
ORDER BY started_at DESC 
LIMIT 1;
```

## Next Steps

1. **Test thoroughly** in development
2. **Deploy to production** with monitoring
3. **Set up alerts** for sync failures
4. **Monitor performance** and optimize as needed
5. **Consider adding more detailed team data** (player lineups, transfers)

The system is designed to be:
- ⚡ **Efficient** - Only syncs what changed
- 🛡️ **Resilient** - Handles errors gracefully  
- 📊 **Monitorable** - Detailed logging and status
- 🔧 **Maintainable** - Clear separation of concerns
- 📈 **Scalable** - Can handle larger leagues and more data