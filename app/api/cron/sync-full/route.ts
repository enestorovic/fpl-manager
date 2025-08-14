import { NextRequest, NextResponse } from 'next/server'
import { automatedSyncService } from '@/lib/automated-sync-service'

// Force full sync - runs daily
export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Cron] Starting full sync...')
    
    const result = await automatedSyncService.runFullSync('cron-daily')
    
    console.log('[Cron] Full sync completed:', {
      success: result.success,
      duration: result.data?.duration,
      teamsUpdated: result.data?.teamsUpdated,
      summariesUpdated: result.data?.summariesUpdated
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
    console.error('[Cron] Full sync failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}