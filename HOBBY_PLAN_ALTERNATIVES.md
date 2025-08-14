# Vercel Hobby Plan: Sync Alternatives

## Issue
Vercel Hobby plans only allow **daily cron jobs**, not hourly. I've updated the configuration to work within these limits.

## ✅ Updated Configuration

### Current Setup (Hobby Plan Compatible)
```json
{
  "crons": [
    {
      "path": "/api/cron/sync",
      "schedule": "0 8,20 * * *"  // Twice daily: 8 AM & 8 PM
    }
  ]
}
```

**Schedule:** 
- **8 AM UTC** - Morning sync (catches overnight changes)
- **8 PM UTC** - Evening sync (catches gameweek updates)

## 🚀 Alternative Sync Solutions

### Option 1: Manual Sync (Current - No Cost)
- Use admin panel for manual syncing
- Run sync before checking scores
- Perfect for personal use

### Option 2: GitHub Actions (Free Alternative)
```yaml
# .github/workflows/sync.yml
name: FPL Sync
on:
  schedule:
    - cron: '0 * * * *'  # Every hour (free on GitHub)
  workflow_dispatch:     # Manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Sync
        run: |
          curl -X GET \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            "https://your-app.vercel.app/api/cron/sync"
```

**Setup:**
1. Add `CRON_SECRET` to GitHub repository secrets
2. Create the workflow file
3. GitHub will trigger your Vercel endpoint hourly (free)

### Option 3: External Cron Service (Free Tiers Available)
- **Cron-job.org** (free)
- **EasyCron** (free tier)
- **cron-job.org** setup:
  1. Go to cron-job.org
  2. Create account
  3. Add URL: `https://your-app.vercel.app/api/cron/sync`
  4. Add header: `Authorization: Bearer YOUR_CRON_SECRET`
  5. Set schedule: every hour

### Option 4: Upgrade to Vercel Pro ($20/month)
- Unlimited cron frequency
- Better function performance
- More concurrent executions

## 🎯 Recommended Approach

### For Personal Use (Free)
**Use the current twice-daily setup:**
- Runs at 8 AM & 8 PM UTC
- Covers most important sync windows
- Use manual sync for gameweek days

### For Production/Sharing (Free)
**GitHub Actions approach:**
- True hourly syncing
- Completely free
- Easy to set up and monitor

### For Professional Use
**Vercel Pro:**
- Most reliable
- Native Vercel integration
- Best performance

## 🔧 Implementation

### Current Setup (Twice Daily)
Your app is already configured for this! Just deploy and it will:
- Sync twice daily automatically
- Allow manual sync anytime
- Work perfectly within Hobby plan limits

### GitHub Actions Setup (Hourly - Free)
1. **Create workflow file:**
```bash
mkdir -p .github/workflows
```

2. **Add the workflow** (I can create this file if you want)

3. **Add secret to GitHub:**
   - Go to your repo → Settings → Secrets
   - Add `CRON_SECRET` with value: `JAf0DMwfJQtCnKtACyNmUxkF46C2UWrAzIeIKPN5TLw=`

## 🕐 Timing Strategy

### Optimal Sync Times
- **8 AM UTC (3 AM EST):** Catch overnight changes
- **8 PM UTC (3 PM EST):** Catch gameweek updates

### Gameweek Days
Use manual sync for:
- **Before deadline** (typically Saturday 11:30 AM GMT)
- **During matches** (Saturday/Sunday)
- **After final whistle** (Sunday evening)

## 📊 Performance Comparison

| Option | Frequency | Cost | Setup | Reliability |
|--------|-----------|------|-------|-------------|
| Twice Daily | 2x/day | Free | ✅ Ready | High |
| GitHub Actions | Hourly | Free | 5 min | High |
| External Cron | Hourly | Free | 10 min | Medium |
| Vercel Pro | Any | $20/mo | ✅ Ready | Highest |

## 🎯 Your Current Status

✅ **Ready to deploy** with twice-daily sync
✅ **Manual sync** available anytime in admin panel
✅ **No changes needed** for Hobby plan deployment

The twice-daily schedule will work great for most FPL tracking needs. You can always upgrade or add GitHub Actions later if you need more frequent updates!

## Next Steps

1. **Deploy with current config** (twice daily)
2. **Test manual sync** for gameweek days
3. **Optionally add GitHub Actions** for hourly sync
4. **Monitor performance** and adjust as needed