import { supabase } from "./supabase"
import { fplDataService } from "./fpl-data-service"
import {
  mapLeagueStandingsToTeams,
  mapLeagueMetadata,
  mapManagerHistoryToSummaries,
  mapChipsToDatabase,
  addChipsToSummaries,
  validateTeamData,
  validateTeamSummary
} from "./fpl-mappers"
import type { 
  Team, 
  TeamSummary, 
  Chip, 
  LeagueMetadata, 
  FPLEvent, 
  SyncLog, 
  SyncConfig 
} from "./supabase"

export interface AutomatedSyncResult {
  success: boolean
  syncId: number
  syncType: 'full' | 'incremental' | 'scores' | 'bootstrap'
  message: string
  data?: {
    teamsUpdated: number
    summariesUpdated: number
    eventsUpdated: number
    chipsUpdated: number
    apiCalls: number
    duration: number
  }
  error?: string
}

export class AutomatedSyncService {
  private readonly LEAGUE_ID = 66185
  private apiCallCount = 0

  // Main entry point - determines what type of sync to run
  async runScheduledSync(triggeredBy: string = 'cron'): Promise<AutomatedSyncResult> {
    this.apiCallCount = 0
    
    try {
      // Check what type of sync we need
      const syncType = await this.determineSyncType()
      console.log(`[AutoSync] Determined sync type: ${syncType}`)
      
      switch (syncType) {
        case 'bootstrap':
          return await this.runBootstrapSync(triggeredBy)
        case 'full':
          return await this.runFullSync(triggeredBy)
        case 'incremental':
          return await this.runIncrementalSync(triggeredBy)
        case 'scores':
          return await this.runScoresSync(triggeredBy)
        default:
          throw new Error(`Unknown sync type: ${syncType}`)
      }
    } catch (error) {
      console.error('[AutoSync] Sync failed:', error)
      return {
        success: false,
        syncId: -1,
        syncType: 'incremental',
        message: 'Sync failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Determine what type of sync we need based on current state
  private async determineSyncType(): Promise<'bootstrap' | 'full' | 'incremental' | 'scores'> {
    // Check if we have events data
    const { data: events } = await supabase
      .from('fpl_events')
      .select('*')
      .limit(1)
    
    if (!events || events.length === 0) {
      return 'bootstrap' // Need to initialize events first
    }

    // Check last sync
    const { data: lastSync } = await supabase
      .from('sync_logs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(1)

    // If no sync in last 24 hours, do full sync
    if (!lastSync || lastSync.length === 0) {
      return 'full'
    }

    const lastSyncTime = new Date(lastSync[0].started_at)
    const hoursSinceLastSync = (Date.now() - lastSyncTime.getTime()) / (1000 * 60 * 60)

    // Get current event info
    const { data: currentEvent } = await supabase
      .from('fpl_events')
      .select('*')
      .eq('is_current', true)
      .single()

    // If it's been more than 24 hours or we have a new gameweek, do full sync
    if (hoursSinceLastSync > 24 || (currentEvent && !currentEvent.data_checked)) {
      return 'full'
    }

    // If current gameweek is active and not finished, update scores
    if (currentEvent && currentEvent.is_current && !currentEvent.finished) {
      return 'scores'
    }

    // Default to incremental sync
    return 'incremental'
  }

  // Bootstrap sync - Initialize events and basic data
  async runBootstrapSync(triggeredBy: string): Promise<AutomatedSyncResult> {
    const syncId = await this.logSyncStart('bootstrap', triggeredBy)
    const startTime = Date.now()

    try {
      console.log('[AutoSync] Running bootstrap sync...')

      // Fetch bootstrap data
      const bootstrapData = await fplDataService.getBootstrapData()
      this.apiCallCount++

      // Process events
      const eventsUpdated = await this.syncEvents(bootstrapData.events)

      // Get current event for context
      const currentEvent = bootstrapData.events.find(event => event.is_current)
      
      await this.logSyncComplete(syncId, 'completed', {
        eventsUpdated,
        apiCalls: this.apiCallCount,
        duration: Date.now() - startTime
      })

      return {
        success: true,
        syncId,
        syncType: 'bootstrap',
        message: `Bootstrap sync completed: ${eventsUpdated} events updated`,
        data: {
          teamsUpdated: 0,
          summariesUpdated: 0,
          eventsUpdated,
          chipsUpdated: 0,
          apiCalls: this.apiCallCount,
          duration: Date.now() - startTime
        }
      }

    } catch (error) {
      await this.logSyncError(syncId, error)
      throw error
    }
  }

  // Full sync - Complete refresh of all data
  async runFullSync(triggeredBy: string): Promise<AutomatedSyncResult> {
    const syncId = await this.logSyncStart('full', triggeredBy)
    const startTime = Date.now()

    try {
      console.log('[AutoSync] Running full sync...')

      // 1. Update events first
      const bootstrapData = await fplDataService.getBootstrapData()
      this.apiCallCount++
      const eventsUpdated = await this.syncEvents(bootstrapData.events)

      // 2. Update league standings and teams
      const standingsData = await fplDataService.getLeagueStandings(this.LEAGUE_ID)
      this.apiCallCount++

      const teamsData = mapLeagueStandingsToTeams(standingsData)
      const validTeams = teamsData.filter(validateTeamData)
      const teamsUpdated = await this.upsertTeams(validTeams)

      // 3. Update metadata
      const metadataData = {
        ...mapLeagueMetadata(standingsData),
        current_event: bootstrapData.events.find(e => e.is_current)?.id || 1
      }
      await this.upsertLeagueMetadata(metadataData)

      // 4. Sync detailed data for all completed gameweeks + current gameweek
      const currentEvent = bootstrapData.events.find(e => e.is_current)
      let summariesUpdated = 0
      let chipsUpdated = 0

      if (currentEvent) {
        // Sync data for all finished gameweeks plus current
        const completedEvents = bootstrapData.events.filter(e => e.finished || e.is_current)
        console.log(`[AutoSync] Syncing detailed data for ${completedEvents.length} gameweeks`)

        const result = await this.syncAllTeamsAllGameweeks(validTeams, completedEvents)
        summariesUpdated = result.summariesUpdated
        chipsUpdated = result.chipsUpdated
      }

      await this.logSyncComplete(syncId, 'completed', {
        teamsUpdated,
        summariesUpdated,
        eventsUpdated,
        chipsUpdated,
        apiCalls: this.apiCallCount,
        duration: Date.now() - startTime
      })

      return {
        success: true,
        syncId,
        syncType: 'full',
        message: `Full sync completed: ${teamsUpdated} teams, ${summariesUpdated} summaries, ${eventsUpdated} events`,
        data: {
          teamsUpdated,
          summariesUpdated,
          eventsUpdated,
          chipsUpdated,
          apiCalls: this.apiCallCount,
          duration: Date.now() - startTime
        }
      }

    } catch (error) {
      await this.logSyncError(syncId, error)
      throw error
    }
  }

  // Incremental sync - Update only changed data
  async runIncrementalSync(triggeredBy: string): Promise<AutomatedSyncResult> {
    const syncId = await this.logSyncStart('incremental', triggeredBy)
    const startTime = Date.now()

    try {
      console.log('[AutoSync] Running incremental sync...')

      // Just update team standings (lightweight)
      const standingsData = await fplDataService.getLeagueStandings(this.LEAGUE_ID)
      this.apiCallCount++

      const teamsData = mapLeagueStandingsToTeams(standingsData)
      const validTeams = teamsData.filter(validateTeamData)
      const teamsUpdated = await this.upsertTeams(validTeams)

      await this.logSyncComplete(syncId, 'completed', {
        teamsUpdated,
        summariesUpdated: 0,
        eventsUpdated: 0,
        chipsUpdated: 0,
        apiCalls: this.apiCallCount,
        duration: Date.now() - startTime
      })

      return {
        success: true,
        syncId,
        syncType: 'incremental',
        message: `Incremental sync completed: ${teamsUpdated} teams updated`,
        data: {
          teamsUpdated,
          summariesUpdated: 0,
          eventsUpdated: 0,
          chipsUpdated: 0,
          apiCalls: this.apiCallCount,
          duration: Date.now() - startTime
        }
      }

    } catch (error) {
      await this.logSyncError(syncId, error)
      throw error
    }
  }

  // Scores sync - Update current gameweek scores only
  async runScoresSync(triggeredBy: string): Promise<AutomatedSyncResult> {
    const syncId = await this.logSyncStart('scores', triggeredBy)
    const startTime = Date.now()

    try {
      console.log('[AutoSync] Running scores sync...')

      // Get current event
      const { data: currentEvent } = await supabase
        .from('fpl_events')
        .select('*')
        .eq('is_current', true)
        .single()

      if (!currentEvent) {
        throw new Error('No current event found')
      }

      // Update team standings (includes current gameweek scores)
      const standingsData = await fplDataService.getLeagueStandings(this.LEAGUE_ID)
      this.apiCallCount++

      const teamsData = mapLeagueStandingsToTeams(standingsData)
      const validTeams = teamsData.filter(validateTeamData)
      const teamsUpdated = await this.upsertTeams(validTeams)

      await this.logSyncComplete(syncId, 'completed', {
        teamsUpdated,
        summariesUpdated: 0,
        eventsUpdated: 0,
        chipsUpdated: 0,
        apiCalls: this.apiCallCount,
        duration: Date.now() - startTime
      })

      return {
        success: true,
        syncId,
        syncType: 'scores',
        message: `Scores sync completed: ${teamsUpdated} teams updated`,
        data: {
          teamsUpdated,
          summariesUpdated: 0,
          eventsUpdated: 0,
          chipsUpdated: 0,
          apiCalls: this.apiCallCount,
          duration: Date.now() - startTime
        }
      }

    } catch (error) {
      await this.logSyncError(syncId, error)
      throw error
    }
  }

  // Helper: Sync events data
  private async syncEvents(eventsData: any[]): Promise<number> {
    const events = eventsData.map(event => ({
      id: event.id,
      name: event.name,
      deadline_time: event.deadline_time,
      is_current: event.is_current || false,
      is_next: event.is_next || false,
      is_previous: event.is_previous || false,
      finished: event.finished || false,
      data_checked: event.finished || false,
      average_entry_score: event.average_entry_score || 0,
      highest_score: event.highest_score || 0,
      chip_plays: event.chip_plays || null,
      updated_at: new Date().toISOString()
    }))

    const { error } = await supabase
      .from('fpl_events')
      .upsert(events)

    if (error) {
      throw new Error(`Failed to sync events: ${error.message}`)
    }

    return events.length
  }

  // Helper: Sync current gameweek detailed data
  private async syncCurrentGameweekData(
    teams: Omit<Team, 'created_at' | 'updated_at'>[],
    eventId: number
  ): Promise<{ summariesUpdated: number, chipsUpdated: number }> {
    // For now, just sync one detailed team (Erik's) to avoid hitting API limits
    const erikTeam = teams.find(t => t.id === 89341)
    
    if (!erikTeam) {
      return { summariesUpdated: 0, chipsUpdated: 0 }
    }

    try {
      const [historyData, managerData] = await Promise.all([
        fplDataService.getManagerHistory(erikTeam.id),
        fplDataService.getManagerDetails(erikTeam.id)
      ])
      this.apiCallCount += 2

      const summariesData = mapManagerHistoryToSummaries(historyData, erikTeam.id)
      const chipsData = mapChipsToDatabase(historyData, erikTeam.id)
      const enrichedSummaries = addChipsToSummaries(summariesData, chipsData)
      const validSummaries = enrichedSummaries.filter(validateTeamSummary)

      // Only update current gameweek summary
      const currentSummary = validSummaries.find(s => s.event_number === eventId)
      
      if (currentSummary) {
        const { error } = await supabase
          .from('team_summaries')
          .upsert([{
            ...currentSummary,
            created_at: new Date().toISOString()
          }])

        if (error) {
          console.error('Failed to update current summary:', error)
          return { summariesUpdated: 0, chipsUpdated: 0 }
        }

        return { summariesUpdated: 1, chipsUpdated: 0 }
      }

      return { summariesUpdated: 0, chipsUpdated: 0 }

    } catch (error) {
      console.error(`Failed to sync detailed data for team ${erikTeam.id}:`, error)
      return { summariesUpdated: 0, chipsUpdated: 0 }
    }
  }

  // Helper: Update teams data - Replace all teams with current API teams
  private async upsertTeams(teamsData: Omit<Team, 'created_at' | 'updated_at'>[]): Promise<number> {
    if (teamsData.length === 0) return 0

    console.log(`[AutoSync] Replacing all teams with ${teamsData.length} current API teams`)

    // First, get current API team IDs
    const apiTeamIds = teamsData.map(team => team.id)

    // Delete teams that are no longer in the API (like "ANTI ECDA FC")
    const { error: deleteError } = await supabase
      .from('teams')
      .delete()
      .not('id', 'in', `(${apiTeamIds.join(',')})`)

    if (deleteError) {
      console.warn('Warning: Failed to clean up old teams:', deleteError.message)
    } else {
      console.log('[AutoSync] Cleaned up teams not in current API')
    }

    // Now insert/update current API teams
    const teamsWithTimestamps = teamsData.map(team => ({
      ...team,
      updated_at: new Date().toISOString()
    }))

    const { error } = await supabase
      .from('teams')
      .upsert(teamsWithTimestamps)

    if (error) {
      throw new Error(`Failed to update teams: ${error.message}`)
    }

    console.log(`[AutoSync] Successfully synced ${teamsData.length} teams from API`)
    return teamsData.length
  }

  // Helper: Update league metadata
  private async upsertLeagueMetadata(metadataData: Omit<LeagueMetadata, 'id' | 'last_updated'>): Promise<void> {
    const { error } = await supabase
      .from('league_metadata')
      .upsert({
        ...metadataData,
        last_updated: new Date().toISOString()
      }, {
        onConflict: 'league_id'
      })

    if (error) {
      throw new Error(`Failed to update league metadata: ${error.message}`)
    }
  }

  // Logging helpers
  private async logSyncStart(syncType: string, triggeredBy: string, currentEvent?: number): Promise<number> {
    const { data, error } = await supabase
      .from('sync_logs')
      .insert({
        sync_type: syncType,
        status: 'started',
        triggered_by: triggeredBy,
        current_event: currentEvent
      })
      .select('id')
      .single()

    if (error || !data) {
      throw new Error(`Failed to log sync start: ${error?.message}`)
    }

    return data.id
  }

  private async logSyncComplete(
    syncId: number,
    status: 'completed' | 'partial' = 'completed',
    data: {
      teamsUpdated?: number
      summariesUpdated?: number
      eventsUpdated?: number
      chipsUpdated?: number
      apiCalls?: number
      duration?: number
    }
  ): Promise<void> {
    const { error } = await supabase
      .from('sync_logs')
      .update({
        status,
        completed_at: new Date().toISOString(),
        duration_ms: data.duration || 0,
        records_processed: (data.teamsUpdated || 0) + (data.summariesUpdated || 0) + (data.eventsUpdated || 0),
        teams_updated: data.teamsUpdated || 0,
        summaries_updated: data.summariesUpdated || 0,
        events_updated: data.eventsUpdated || 0,
        fpl_api_calls: data.apiCalls || 0,
        errors_count: 0
      })
      .eq('id', syncId)

    if (error) {
      console.error('Failed to log sync completion:', error)
    }
  }

  private async logSyncError(syncId: number, error: any): Promise<void> {
    const { error: logError } = await supabase
      .from('sync_logs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        errors_count: 1,
        error_details: error instanceof Error ? error.message : String(error)
      })
      .eq('id', syncId)

    if (logError) {
      console.error('Failed to log sync error:', logError)
    }
  }

  // Get sync status for monitoring
  async getSyncStatus(): Promise<{
    lastSync: SyncLog | null
    activeSync: SyncLog | null
    recentErrors: SyncLog[]
    avgDuration: number
  }> {
    const [lastSyncResult, activeSyncResult, errorsResult] = await Promise.all([
      supabase
        .from('sync_logs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(1),
      supabase
        .from('sync_logs')
        .select('*')
        .eq('status', 'started')
        .order('started_at', { ascending: false })
        .limit(1),
      supabase
        .from('sync_logs')
        .select('*')
        .eq('status', 'failed')
        .order('started_at', { ascending: false })
        .limit(5)
    ])

    // Calculate average duration from last 10 completed syncs
    const { data: recentSyncs } = await supabase
      .from('sync_logs')
      .select('duration_ms')
      .eq('status', 'completed')
      .not('duration_ms', 'is', null)
      .order('started_at', { ascending: false })
      .limit(10)

    const avgDuration = recentSyncs && recentSyncs.length > 0
      ? recentSyncs.reduce((sum, sync) => sum + (sync.duration_ms || 0), 0) / recentSyncs.length
      : 0

    return {
      lastSync: lastSyncResult.data?.[0] || null,
      activeSync: activeSyncResult.data?.[0] || null,
      recentErrors: errorsResult.data || [],
      avgDuration
    }
  }

  // Helper: Sync all teams for all completed gameweeks using REAL FPL API data
  private async syncAllTeamsAllGameweeks(
    teams: Omit<Team, 'created_at' | 'updated_at'>[],
    events: any[]
  ): Promise<{ summariesUpdated: number, chipsUpdated: number }> {
    console.log(`[AutoSync] Syncing REAL data for ${teams.length} teams from FPL API`)

    let totalSummariesUpdated = 0
    let totalChipsUpdated = 0

    // Fetch real data for each team from FPL API
    for (const team of teams) {
      try {
        console.log(`[AutoSync] Fetching real data for team ${team.id} (${team.entry_name})`)

        // Get real manager history and details from FPL API
        const [historyData, managerData] = await Promise.all([
          fplDataService.getManagerHistory(team.id),
          fplDataService.getManagerDetails(team.id)
        ])
        this.apiCallCount += 2

        // Map the REAL history data to summaries
        const summariesData = mapManagerHistoryToSummaries(historyData, team.id)

        // Map the REAL chips data
        const chipsData = mapChipsToDatabase(historyData, team.id)

        // Add chip information to summaries
        const enrichedSummaries = addChipsToSummaries(summariesData, chipsData)

        // Validate and insert real data
        const validSummaries = enrichedSummaries.filter(validateTeamSummary)

        if (validSummaries.length > 0) {
          const summariesWithTimestamps = validSummaries.map(summary => ({
            ...summary,
            created_at: new Date().toISOString()
          }))

          const { error: summariesError } = await supabase
            .from('team_summaries')
            .upsert(summariesWithTimestamps, { onConflict: 'team_id,event_number' })

          if (summariesError) {
            console.error(`[AutoSync] Failed to update summaries for team ${team.id}:`, summariesError)
          } else {
            totalSummariesUpdated += validSummaries.length
          }
        }

        // Insert real chips data
        if (chipsData.length > 0) {
          const { error: chipsError } = await supabase
            .from('chips')
            .upsert(chipsData, { onConflict: 'team_id,chip_type,event_number' })

          if (chipsError) {
            console.error(`[AutoSync] Failed to update chips for team ${team.id}:`, chipsError)
          } else {
            totalChipsUpdated += chipsData.length
          }
        }

        console.log(`[AutoSync] ✅ Synced real data for team ${team.id}: ${validSummaries.length} summaries, ${chipsData.length} chips`)

        // Add small delay to avoid hitting API rate limits
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (error) {
        console.error(`[AutoSync] ❌ Failed to fetch real data for team ${team.id}:`, error)
        // Continue with next team instead of failing entire sync
      }
    }

    console.log(`[AutoSync] Completed real data sync: ${totalSummariesUpdated} summaries, ${totalChipsUpdated} chips`)

    return {
      summariesUpdated: totalSummariesUpdated,
      chipsUpdated: totalChipsUpdated
    }
  }
}

// Export singleton instance
export const automatedSyncService = new AutomatedSyncService()