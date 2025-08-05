import { supabase } from "./supabase"
import type { Team, TeamSummary, Chip, LeagueMetadata } from "./supabase"

export async function getTeams(sortBy: "event_total" | "total" = "event_total") {
  const { data, error } = await supabase.from("teams").select("*").order(sortBy, { ascending: false })

  if (error) {
    console.error("Database error:", error)
    throw error
  }
  return data as Team[]
}

export async function getTeamSummary(teamId: number, eventNumber = 38) {
  const { data, error } = await supabase
    .from("team_summaries")
    .select("*")
    .eq("team_id", teamId)
    .eq("event_number", eventNumber)
    .order("id", { ascending: false })
    .limit(1)

  if (error) {
    console.error("Database error:", error)
    throw error
  }

  // Return the first row if it exists, otherwise return null
  return data && data.length > 0 ? (data[0] as TeamSummary) : null
}

export async function getTeamChips(teamId: number) {
  const { data, error } = await supabase
    .from("chips")
    .select("*")
    .eq("team_id", teamId)
    .order("event_number", { ascending: false })

  if (error) {
    console.error("Database error:", error)
    throw error
  }
  return data as Chip[]
}

export async function getLeagueMetadata() {
  const { data, error } = await supabase.from("league_metadata").select("*").order("id", { ascending: false }).limit(1)

  if (error) {
    console.error("Database error:", error)
    throw error
  }

  // Return the first row if it exists, otherwise return null
  return data && data.length > 0 ? (data[0] as LeagueMetadata) : null
}

export async function updateTeamData(teamId: number, updates: Partial<Team>) {
  const { data, error } = await supabase
    .from("teams")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", teamId)
    .select()
    .single()

  if (error) {
    console.error("Database error:", error)
    throw error
  }
  return data as Team
}

export async function syncLeagueData() {
  // First check if league metadata exists
  const existingMetadata = await getLeagueMetadata()

  if (existingMetadata) {
    // Update existing record
    const { data, error } = await supabase
      .from("league_metadata")
      .update({ last_updated: new Date().toISOString() })
      .eq("id", existingMetadata.id)
      .select()
      .single()

    if (error) {
      console.error("Database error:", error)
      throw error
    }
    return data as LeagueMetadata
  } else {
    // Create new record if none exists
    const { data, error } = await supabase
      .from("league_metadata")
      .insert({
        league_id: 33122,
        league_name: "La Jungla LV - Premier Legue",
        total_entries: 32,
        current_event: 38,
        last_updated: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error("Database error:", error)
      throw error
    }
    return data as LeagueMetadata
  }
}

// Debug function to check table structure
export async function checkTableStructure() {
  const { data, error } = await supabase.rpc("get_table_columns", { table_name: "teams" })

  if (error) {
    console.error("Error checking table structure:", error)
  } else {
    console.log("Teams table columns:", data)
  }
}

// Helper function to check if tables exist and have data
export async function getDatabaseStatus() {
  try {
    const [teamsResult, metadataResult, summariesResult, chipsResult] = await Promise.all([
      supabase.from("teams").select("id", { count: "exact", head: true }),
      supabase.from("league_metadata").select("id", { count: "exact", head: true }),
      supabase.from("team_summaries").select("id", { count: "exact", head: true }),
      supabase.from("chips").select("id", { count: "exact", head: true }),
    ])

    return {
      teams: teamsResult.count || 0,
      metadata: metadataResult.count || 0,
      summaries: summariesResult.count || 0,
      chips: chipsResult.count || 0,
    }
  } catch (error) {
    console.error("Error checking database status:", error)
    return {
      teams: 0,
      metadata: 0,
      summaries: 0,
      chips: 0,
    }
  }
}

// Helper function to get all team summaries for a team (all gameweeks)
export async function getAllTeamSummaries(teamId: number) {
  const { data, error } = await supabase
    .from("team_summaries")
    .select("*")
    .eq("team_id", teamId)
    .order("event_number", { ascending: true })

  if (error) {
    console.error("Database error:", error)
    throw error
  }
  return data as TeamSummary[]
}
