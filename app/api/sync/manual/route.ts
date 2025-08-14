import { NextRequest, NextResponse } from 'next/server'
import { automatedSyncService } from '@/lib/automated-sync-service'

// Manual sync endpoint for admin panel
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { syncType = 'auto', force = false } = body

    console.log('[Manual] Starting manual sync...', { syncType, force })
    
    let result
    
    switch (syncType) {
      case 'bootstrap':
        result = await automatedSyncService.runBootstrapSync('manual')
        break
      case 'full':
        result = await automatedSyncService.runFullSync('manual')
        break
      case 'incremental':
        result = await automatedSyncService.runIncrementalSync('manual')
        break
      case 'scores':
        result = await automatedSyncService.runScoresSync('manual')
        break
      default:
        result = await automatedSyncService.runScheduledSync('manual')
    }
    
    console.log('[Manual] Sync completed:', {
      success: result.success,
      syncType: result.syncType,
      duration: result.data?.duration
    })

    return NextResponse.json(result)

  } catch (error) {
    console.error('[Manual] Sync failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Get sync status
export async function GET() {
  try {
    const status = await automatedSyncService.getSyncStatus()
    
    return NextResponse.json({
      success: true,
      status,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[Manual] Failed to get sync status:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}