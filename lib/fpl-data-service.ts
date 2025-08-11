// Types matching the actual FPL API structure from your JSON files
export interface FPLLeagueStandingsResponse {
  new_entries?: {
    has_next: boolean
    page: number
    results: Array<{
      entry: number
      entry_name: string
      joined_time: string
      player_first_name: string
      player_last_name: string
    }>
  }
  last_updated_data: string | null
  league: {
    id: number
    name: string
    created: string
    closed: boolean
    max_entries: number | null
    league_type: string
    scoring: string
    admin_entry: number
    start_event: number
    code_privacy?: string
    has_cup: boolean
    cup_league: number | null
    rank: number | null
  }
  standings: {
    has_next: boolean
    page: number
    results: Array<{
      id: number
      event_total: number
      player_name: string
      rank: number
      last_rank: number
      rank_sort: number
      total: number
      entry: number
      entry_name: string
      has_played: boolean
    }>
  }
}

export interface FPLManagerHistoryResponse {
  current: Array<{
    event: number
    points: number
    total_points: number
    rank: number
    overall_rank: number
    percentile_rank: number
    bank: number
    value: number
    event_transfers: number
    event_transfers_cost: number
    points_on_bench: number
  }>
  past: Array<{
    season_name: string
    total_points: number
    rank: number
  }>
  chips: Array<{
    name: string
    time: string
    event: number
  }>
}

export interface FPLManagerResponse {
  id: number
  joined_time: string
  started_event: number
  favourite_team: number
  player_first_name: string
  player_last_name: string
  player_region_id: number
  player_region_name: string
  player_region_iso_code_short: string
  player_region_iso_code_long: string
  years_active: number
  summary_overall_points: number
  summary_overall_rank: number
  summary_event_points: number
  summary_event_rank: number
  current_event: number
  leagues: {
    classic: Array<{
      id: number
      name: string
      entry_rank: number
      entry_last_rank: number
    }>
  }
  name: string
  last_deadline_bank: number
  last_deadline_value: number
  last_deadline_total_transfers: number
}

export interface FPLTransferResponse {
  element_in: number
  element_in_cost: number
  element_out: number
  element_out_cost: number
  entry: number
  event: number
  time: string
}

class FPLDataService {
  // Get league standings from API endpoint
  async getLeagueStandings(leagueId: number): Promise<FPLLeagueStandingsResponse> {
    console.log(`Fetching league standings for league ${leagueId} from API`)
    const response = await fetch(`/api/fpl/leagues/${leagueId}/standings`)
    if (!response.ok) {
      throw new Error(`Failed to fetch league standings: ${response.statusText}`)
    }
    return response.json()
  }

  // Get manager history from API endpoint
  async getManagerHistory(entryId: number): Promise<FPLManagerHistoryResponse> {
    console.log(`Fetching manager history for entry ${entryId} from API`)
    const response = await fetch(`/api/fpl/entry/${entryId}/history`)
    if (!response.ok) {
      throw new Error(`Failed to fetch manager history: ${response.statusText}`)
    }
    return response.json()
  }

  // Get manager details from API endpoint
  async getManagerDetails(entryId: number): Promise<FPLManagerResponse> {
    console.log(`Fetching manager details for entry ${entryId} from API`)
    const response = await fetch(`/api/fpl/entry/${entryId}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch manager details: ${response.statusText}`)
    }
    return response.json()
  }

  // Get manager transfers from API endpoint
  async getManagerTransfers(entryId: number): Promise<FPLTransferResponse[]> {
    console.log(`Fetching manager transfers for entry ${entryId} from API`)
    const response = await fetch(`/api/fpl/entry/${entryId}/transfers`)
    if (!response.ok) {
      throw new Error(`Failed to fetch manager transfers: ${response.statusText}`)
    }
    return response.json()
  }
}

// Export singleton instance
export const fplDataService = new FPLDataService()
