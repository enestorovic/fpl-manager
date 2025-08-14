# Vercel Deployment Guide for FPL Manager

## Overview
This guide walks you through deploying your FPL Manager app to Vercel with automated hourly sync functionality.

## Pre-Deployment Checklist

### 1. Database Migration ✅
First, run the new schema on your Supabase database:

```sql
-- Copy and paste the contents of scripts/006-automated-sync-schema.sql
-- Into your Supabase SQL Editor and execute
```

### 2. Environment Variables
You'll need these environment variables:

```bash
# Supabase (you already have these)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# New: Cron Secret (generate a random string)
CRON_SECRET=your-random-secret-here
```

### 3. Generate Cron Secret
Generate a secure random string for CRON_SECRET:

```bash
# Option 1: Using openssl (recommended)
openssl rand -base64 32

# Option 2: Using node
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Option 3: Manual (any random 32+ character string)
```

## Deployment Steps

### Step 1: Prepare Your Repository

1. **Commit all changes:**
```bash
git add .
git commit -m "Add automated sync system for production"
git push origin main
```

2. **Verify vercel.json is in place:**
```json
{
  "crons": [
    {
      "path": "/api/cron/sync",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/sync-full", 
      "schedule": "0 3 * * *"
    }
  ],
  "functions": {
    "app/api/cron/sync/route.ts": {
      "maxDuration": 60
    },
    "app/api/cron/sync-full/route.ts": {
      "maxDuration": 300
    }
  }
}
```

### Step 2: Deploy to Vercel

#### Option A: Vercel Dashboard (Recommended for first-time)

1. **Go to [vercel.com](https://vercel.com) and sign in**

2. **Click "New Project"**

3. **Import your GitHub repository:**
   - Connect GitHub if not already connected
   - Select your `fpl-manager` repository
   - Click "Import"

4. **Configure project settings:**
   - **Framework Preset:** Next.js (should auto-detect)
   - **Root Directory:** `./` (default)
   - **Build Command:** `npm run build` (default)
   - **Output Directory:** `.next` (default)

5. **Add Environment Variables:**
   ```
   NEXT_PUBLIC_SUPABASE_URL = your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY = your-supabase-key
   CRON_SECRET = your-generated-secret
   ```

6. **Click "Deploy"**

#### Option B: Vercel CLI

1. **Install Vercel CLI:**
```bash
npm i -g vercel
```

2. **Login to Vercel:**
```bash
vercel login
```

3. **Deploy:**
```bash
# From your project root
vercel

# Follow the prompts:
# ? Set up and deploy "~/Sites/fpl-manager"? [Y/n] y
# ? Which scope do you want to deploy to? [your-account]
# ? Link to existing project? [y/N] n
# ? What's your project's name? fpl-manager
# ? In which directory is your code located? ./
```

4. **Add environment variables:**
```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY  
vercel env add CRON_SECRET
```

5. **Redeploy with environment variables:**
```bash
vercel --prod
```

### Step 3: Configure Production Database

1. **Access your deployed app:**
   - Go to your Vercel dashboard
   - Click on your project
   - Click "Visit" to open your deployed app

2. **Run database migration:**
   - Log into admin panel (click Settings icon)
   - Click "Reset Database" (to clear any test data)
   - **In Supabase SQL Editor, run:**
   ```sql
   -- Copy and paste scripts/006-automated-sync-schema.sql
   ```

3. **Initialize data:**
   - In admin panel, click "Bootstrap" to load events
   - Then click "Smart Sync" to load league data

### Step 4: Verify Cron Jobs

1. **Check Vercel Functions:**
   - In Vercel dashboard → Your Project → Functions tab
   - You should see your cron functions listed

2. **Test cron endpoints manually:**
```bash
# Replace YOUR_DOMAIN with your Vercel URL
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
     https://YOUR_DOMAIN.vercel.app/api/cron/sync

# Should return sync success response
```

3. **Monitor cron execution:**
   - Vercel dashboard → Functions → View logs
   - Look for cron execution logs

## Post-Deployment Verification

### 1. Test Core Functionality
- ✅ App loads correctly
- ✅ League standings display
- ✅ Admin panel accessible
- ✅ Manual sync works

### 2. Test Automated Sync
- ✅ Bootstrap sync loads events
- ✅ Full sync loads league data
- ✅ Sync logs are recorded
- ✅ Admin panel shows sync status

### 3. Monitor Cron Jobs
- ✅ Check Vercel function logs after first hour
- ✅ Verify sync runs at scheduled times
- ✅ Monitor for any errors in logs

## Troubleshooting Common Issues

### 1. Environment Variables Not Working
```bash
# Verify env vars are set in Vercel
vercel env ls

# If missing, add them:
vercel env add CRON_SECRET production
```

### 2. Cron Jobs Not Running
- Check that `CRON_SECRET` is set correctly
- Verify `vercel.json` is in project root
- Check function logs in Vercel dashboard

### 3. Database Connection Issues
- Verify Supabase URL and key are correct
- Check that database migration ran successfully
- Test database connection in admin panel

### 4. FPL API Rate Limiting
- Monitor sync logs for API failures
- Adjust sync frequency if needed
- Verify User-Agent headers are set

### 5. Sync Failures
```bash
# Check recent sync logs in admin panel
# Or query directly in Supabase:
SELECT * FROM sync_logs 
WHERE status = 'failed' 
ORDER BY started_at DESC 
LIMIT 10;
```

## Monitoring & Maintenance

### 1. Regular Monitoring
- **Admin Panel:** Check sync status weekly
- **Vercel Logs:** Monitor function execution
- **Supabase:** Check database performance

### 2. Sync Schedule Optimization
```json
// Adjust vercel.json if needed:
{
  "crons": [
    {
      "path": "/api/cron/sync",
      "schedule": "0 * * * *"     // Every hour
    },
    {
      "path": "/api/cron/sync-full",
      "schedule": "0 3 * * *"      // Daily at 3 AM
    }
  ]
}
```

### 3. Error Alerts (Optional)
Set up monitoring alerts for:
- Consecutive sync failures
- High API error rates
- Database connection issues

## Performance Optimization

### 1. Vercel Settings
- **Function Regions:** Set to closest to your users
- **Edge Network:** Leverages Vercel's global CDN
- **Analytics:** Enable for performance insights

### 2. Database Optimization
- **Indexes:** Already included in migration
- **Connection Pooling:** Supabase handles this
- **Query Optimization:** Monitor slow queries

## Scaling Considerations

### 1. When to Scale
- More than 100 teams in league
- Multiple leagues
- Sub-second response time requirements

### 2. Scaling Options
- **Vercel Pro:** Higher function limits
- **Database:** Supabase Pro for better performance
- **Caching:** Add Redis for frequently accessed data

## Security Best Practices

### 1. Environment Variables
- ✅ Never commit secrets to git
- ✅ Use strong CRON_SECRET
- ✅ Rotate secrets periodically

### 2. API Security
- ✅ Verify authorization headers
- ✅ Rate limiting on manual sync
- ✅ Input validation on all endpoints

### 3. Database Security
- ✅ Use Supabase RLS policies
- ✅ Regular backups
- ✅ Monitor unusual activity

## Success Metrics

After deployment, you should see:
- 📊 **Sync Success Rate:** >95% successful syncs
- ⚡ **Performance:** <1s average sync time
- 🕐 **Uptime:** 99.9% availability
- 📈 **Data Freshness:** Teams updated hourly

## Support & Updates

### 1. Updating the App
```bash
# Push updates
git push origin main

# Vercel auto-deploys from main branch
# Or manually trigger:
vercel --prod
```

### 2. Database Migrations
```sql
-- Run new migrations in Supabase SQL Editor
-- Test in development first
-- Monitor sync logs after migration
```

### 3. Monitoring
- **Vercel Analytics:** Built-in performance monitoring
- **Supabase Dashboard:** Database metrics
- **Admin Panel:** Sync status and logs

---

🎉 **Congratulations!** Your FPL Manager app is now deployed with automated hourly sync functionality!