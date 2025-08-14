import { NextRequest, NextResponse } from 'next/server'
import { automatedSyncService } from '@/lib/automated-sync-service'

// Main cron endpoint - runs intelligent sync
export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Cron] Starting scheduled sync...')
    
    const result = await automatedSyncService.runScheduledSync('cron')
    
    console.log('[Cron] Sync completed:', {
      success: result.success,
      syncType: result.syncType,
      duration: result.data?.duration,
      apiCalls: result.data?.apiCalls
    })

    return NextResponse.json({
      success: result.success,
      syncId: result.syncId,
      syncType: result.syncType,
      message: result.message,
      data: result.data,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[Cron] Sync failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}