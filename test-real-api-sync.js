// Test script to verify the real API sync is working
const { fplSyncService } = require('./lib/fpl-sync.ts')

async function testSync() {
  try {
    console.log('Testing real FPL API sync...')
    const result = await fplSyncService.syncFromRealAPI()
    console.log('Sync result:', result)
  } catch (error) {
    console.error('Sync failed:', error)
  }
}

testSync()
