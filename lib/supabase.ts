import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

export type Team = {
  id: number // This will be the 'entry' field from FPL API
  entry_name: string // Team name from FPL API
  player_name: string // Manager name from FPL API
  total: number // Total score from FPL API
  event_total: number // GW score from FPL API
  rank: number
  last_rank: number
  captain: string | null // We'll need to get this from team details API
  created_at: string
  updated_at: string
}

export type TeamSummary = {
  id: number
  team_id: number
  event_number: number
  points: number
  transfers: number
  transfers_cost: number
  overall_rank: number
  value: number
  bank: number
  chip_used: string | null
  created_at: string
}

export type Chip = {
  id: number
  team_id: number
  chip_type: string
  event_number: number
  used_at: string
}

export type LeagueMetadata = {
  id: number
  league_id: number
  league_name: string
  total_entries: number
  current_event: number
  last_updated: string
}

// New types for automated sync
export type FPLEvent = {
  id: number
  name: string
  deadline_time: string | null
  is_current: boolean
  is_next: boolean
  is_previous: boolean
  finished: boolean
  data_checked: boolean
  average_entry_score: number
  highest_score: number
  chip_plays: any | null
  created_at: string
  updated_at: string
}

export type SyncLog = {
  id: number
  sync_type: 'full' | 'incremental' | 'scores' | 'bootstrap'
  status: 'started' | 'completed' | 'failed' | 'partial'
  started_at: string
  completed_at: string | null
  duration_ms: number | null
  records_processed: number
  teams_updated: number
  summaries_updated: number
  events_updated: number
  errors_count: number
  error_details: string | null
  triggered_by: string | null
  fpl_api_calls: number
  current_event: number | null
  metadata: any | null
}

export type SyncConfig = {
  id: number
  key: string
  value: string
  description: string | null
  updated_at: string
}
