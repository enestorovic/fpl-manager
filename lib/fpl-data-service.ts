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

export interface FPLEvent {
  id: number
  name: string
  deadline_time: string
  release_time: string | null
  average_entry_score: number
  finished: boolean
  data_checked: boolean
  highest_scoring_entry: number | null
  deadline_time_epoch: number
  deadline_time_game_offset: number
  highest_score: number | null
  is_previous: boolean
  is_current: boolean
  is_next: boolean
  cup_leagues_created: boolean
  h2h_ko_matches_created: boolean
  ranked_count: number
  chip_plays: Array<{
    chip_name: string
    num_played: number
  }>
  most_selected: number | null
  most_transferred_in: number | null
  top_element: number | null
  top_element_info: any
  transfers_made: number
  most_captained: number | null
  most_vice_captained: number | null
}

export interface FPLBootstrapResponse {
  events: FPLEvent[]
  game_settings: {
    league_join_private_max: number
    league_join_public_max: number
    league_max_size_public_classic: number
    league_max_size_public_h2h: number
    league_max_size_private_h2h: number
    league_max_ko_rounds_private_h2h: number
    league_prefix_public: string
    league_points_h2h_win: number
    league_points_h2h_lose: number
    league_points_h2h_draw: number
    league_ko_first_instead_of_random: boolean
    cup_start_event_id: number
    cup_stop_event_id: number
    cup_qualifying_method: string
    cup_type: string
    featured_entries: any[]
    percentile_ranks: number[]
    squad_squadplay: number
    squad_squadsize: number
    squad_team_limit: number
    squad_total_spend: number
    ui_currency_multiplier: number
    ui_use_special_shirts: boolean
    ui_special_shirt_exclusions: any[]
    stats_form_days: number
    sys_vice_captain_enabled: boolean
    transfers_cap: number
    transfers_sell_on_fee: number
    league_h2h_tiebreak_stats: string[]
    timezone: string
  }
  phases: any[]
  teams: any[]
  total_players: number
  elements: any[]
  element_stats: any[]
  element_types: any[]
}

class FPLDataService {
  private readonly FPL_BASE_URL = 'https://fantasy.premierleague.com/api'

  // Get bootstrap data directly from FPL API
  async getBootstrapData(): Promise<FPLBootstrapResponse> {
    console.log('Fetching FPL bootstrap data from real FPL API')
    const response = await fetch(`${this.FPL_BASE_URL}/bootstrap-static/`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(10000),
    })
    if (!response.ok) {
      throw new Error(`Failed to fetch bootstrap data: ${response.statusText}`)
    }
    return response.json()
  }

  // Get league standings directly from FPL API
  async getLeagueStandings(leagueId: number): Promise<FPLLeagueStandingsResponse> {
    console.log(`Fetching league standings for league ${leagueId} from real FPL API`)
    const response = await fetch(`${this.FPL_BASE_URL}/leagues-classic/${leagueId}/standings/`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(10000),
    })
    if (!response.ok) {
      throw new Error(`Failed to fetch league standings: ${response.statusText}`)
    }
    return response.json()
  }

  // Get manager history directly from FPL API
  async getManagerHistory(entryId: number): Promise<FPLManagerHistoryResponse> {
    console.log(`Fetching manager history for entry ${entryId} from real FPL API`)
    const response = await fetch(`${this.FPL_BASE_URL}/entry/${entryId}/history/`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(10000),
    })
    if (!response.ok) {
      throw new Error(`Failed to fetch manager history: ${response.statusText}`)
    }
    return response.json()
  }

  // Get manager details directly from FPL API
  async getManagerDetails(entryId: number): Promise<FPLManagerResponse> {
    console.log(`Fetching manager details for entry ${entryId} from real FPL API`)
    const response = await fetch(`${this.FPL_BASE_URL}/entry/${entryId}/`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(10000),
    })
    if (!response.ok) {
      throw new Error(`Failed to fetch manager details: ${response.statusText}`)
    }
    return response.json()
  }

  // Get manager transfers directly from FPL API
  async getManagerTransfers(entryId: number): Promise<FPLTransferResponse[]> {
    console.log(`Fetching manager transfers for entry ${entryId} from real FPL API`)
    const response = await fetch(`${this.FPL_BASE_URL}/entry/${entryId}/transfers/`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(10000),
    })
    if (!response.ok) {
      throw new Error(`Failed to fetch manager transfers: ${response.statusText}`)
    }
    return response.json()
  }

  // Helper method to get current event from bootstrap data
  async getCurrentEvent(): Promise<FPLEvent | null> {
    try {
      const bootstrap = await this.getBootstrapData()
      return bootstrap.events.find(event => event.is_current) || null
    } catch (error) {
      console.error('Failed to get current event:', error)
      return null
    }
  }
}

// Export singleton instance
export const fplDataService = new FPLDataService()
