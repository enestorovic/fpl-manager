name: FPL Hourly Sync

on:
  schedule:
    # Every hour during FPL season (adjust as needed)
    - cron: '0 * * * *'
  workflow_dispatch: # Manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger FPL Sync
        run: |
          echo "Triggering FPL sync..."
          response=$(curl -s -o /dev/null -w "%{http_code}" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            "https://${{ secrets.VERCEL_URL }}/api/cron/sync")
          
          if [ $response -eq 200 ]; then
            echo "✅ Sync triggered successfully"
          else
            echo "❌ Sync failed with status: $response"
            exit 1
          fi