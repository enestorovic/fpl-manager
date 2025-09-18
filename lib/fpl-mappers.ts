import type { Team, TeamSummary, Chip, LeagueMetadata } from "./supabase"
import type { 
  FPLLeagueStandingsResponse, 
  FPLManagerHistoryResponse, 
  FPLManagerResponse 
} from "./fpl-data-service"

// Map FPL league standings to database schema
export function mapLeagueStandingsToTeams(
  standingsData: FPLLeagueStandingsResponse
): Omit<Team, 'created_at' | 'updated_at'>[] {
  // Check if we have standings data (season started) or new_entries data (season not started)
  const teamsData = standingsData.standings.results.length > 0 
    ? standingsData.standings.results 
    : standingsData.new_entries?.results || []

  return teamsData.map((team: any, index: number) => {
    // Handle both formats: standings format vs new_entries format
    if ('total' in team) {
      // Standings format (season started)
      return {
        id: team.entry,
        entry_name: team.entry_name,
        player_name: team.player_name,
        total: team.total,
        event_total: team.event_total,
        rank: team.rank,
        last_rank: team.last_rank,
        captain: null
      }
    } else {
      // New entries format (season not started)
      return {
        id: team.entry,
        entry_name: team.entry_name,
        player_name: `${team.player_first_name} ${team.player_last_name}`,
        total: 0, // No games played yet
        event_total: 0, // No current gameweek points
        rank: index + 1, // Temporary rank based on join order
        last_rank: index + 1, // Same as current rank
        captain: null
      }
    }
  })
}

// Map FPL league metadata to database schema
export function mapLeagueMetadata(
  standingsData: FPLLeagueStandingsResponse,
  currentEvent?: number
): Omit<LeagueMetadata, 'id' | 'last_updated'> {
  // Get total entries from standings or new_entries
  const totalEntries = standingsData.standings.results.length > 0
    ? standingsData.standings.results.length
    : standingsData.new_entries?.results.length || 0

  return {
    league_id: standingsData.league.id,
    league_name: standingsData.league.name,
    total_entries: totalEntries,
    current_event: currentEvent || standingsData.league.start_event || 1 // Use passed current event, fallback to start_event
  }
}

// Map FPL manager history to team summaries
export function mapManagerHistoryToSummaries(
  historyData: FPLManagerHistoryResponse,
  entryId: number
): Omit<TeamSummary, 'id' | 'created_at'>[] {
  return historyData.current.map(gameweek => ({
    team_id: entryId,
    event_number: gameweek.event,
    points: gameweek.points,
    transfers: gameweek.event_transfers,
    transfers_cost: gameweek.event_transfers_cost,
    overall_rank: gameweek.overall_rank,
    value: gameweek.value,
    bank: gameweek.bank,
    chip_used: null // Will be populated from chips data
  }))
}

// Map FPL chips to database schema
export function mapChipsToDatabase(
  historyData: FPLManagerHistoryResponse,
  entryId: number
): Omit<Chip, 'id'>[] {
  return historyData.chips.map(chip => ({
    team_id: entryId,
    chip_type: chip.name,
    event_number: chip.event,
    used_at: chip.time
  }))
}

// Update team summaries with chip information
export function addChipsToSummaries(
  summaries: Omit<TeamSummary, 'id' | 'created_at'>[],
  chips: Omit<Chip, 'id'>[]
): Omit<TeamSummary, 'id' | 'created_at'>[] {
  const chipsByEvent = new Map<number, string>()
  
  chips.forEach(chip => {
    chipsByEvent.set(chip.event_number, chip.chip_type)
  })

  return summaries.map(summary => ({
    ...summary,
    chip_used: chipsByEvent.get(summary.event_number) || null
  }))
}

// Create default team summary for teams without detailed history
export function createDefaultTeamSummary(
  entryId: number,
  eventNumber: number = 38,
  eventTotal: number = 0
): Omit<TeamSummary, 'id' | 'created_at'> {
  return {
    team_id: entryId,
    event_number: eventNumber,
    points: eventTotal,
    transfers: 0,
    transfers_cost: 0,
    overall_rank: 0, // Would need to be fetched from individual manager data
    value: 1000, // Default starting value
    bank: 0,
    chip_used: null
  }
}

// Helper function to get the latest gameweek data for a team
export function getLatestGameweekData(
  summaries: Omit<TeamSummary, 'id' | 'created_at'>[]
): Omit<TeamSummary, 'id' | 'created_at'> | null {
  if (summaries.length === 0) return null
  
  return summaries.reduce((latest, current) => 
    current.event_number > latest.event_number ? current : latest
  )
}

// Validate team data before database insertion
export function validateTeamData(team: Omit<Team, 'created_at' | 'updated_at'>): boolean {
  return !!(
    team.id &&
    team.entry_name &&
    team.player_name &&
    typeof team.total === 'number' &&
    typeof team.event_total === 'number' &&
    typeof team.rank === 'number' &&
    typeof team.last_rank === 'number'
  )
}

// Validate team summary data
export function validateTeamSummary(summary: Omit<TeamSummary, 'id' | 'created_at'>): boolean {
  return !!(
    summary.team_id &&
    typeof summary.event_number === 'number' &&
    typeof summary.points === 'number' &&
    typeof summary.transfers === 'number' &&
    typeof summary.transfers_cost === 'number' &&
    typeof summary.overall_rank === 'number' &&
    typeof summary.value === 'number' &&
    typeof summary.bank === 'number'
  )
}

// Helper to merge team data with additional manager details
export function enrichTeamWithManagerData(
  team: Omit<Team, 'created_at' | 'updated_at'>,
  managerData?: FPLManagerResponse
): Omit<Team, 'created_at' | 'updated_at'> {
  if (!managerData) return team

  return {
    ...team,
    // Could add captain information here if we had current team data
    // For now, keeping the existing structure
  }
}
