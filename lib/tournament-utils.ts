import { TournamentMatch, TournamentStanding, KnockoutSeeding } from './supabase'

// Group standing with all calculated fields
export type GroupStanding = {
  teamId: number
  groupId: number
  matchesPlayed: number
  wins: number
  draws: number
  losses: number
  pointsFor: number      // Total FPL points scored
  pointsAgainst: number  // Total FPL points conceded
  pointsDifference: number
  tournamentPoints: number  // 3W + 1D + 0L
  position: number
  qualified: boolean
}

// Match pair for round-robin scheduling
export type ScheduleMatch = {
  team1Index: number
  team2Index: number
  matchday: number
}

/**
 * Generate a balanced round-robin schedule for N teams
 * Uses the circle method (Berger tables) for fair matchday distribution
 *
 * @param teamIds - Array of team IDs in the group
 * @returns Array of matches with matchday assignments
 */
export function generateRoundRobinSchedule(teamIds: number[]): ScheduleMatch[] {
  const n = teamIds.length
  const matches: ScheduleMatch[] = []

  if (n < 2) return matches

  // For odd number of teams, add a "bye" (null team)
  const teams = n % 2 === 0 ? [...teamIds] : [...teamIds, -1] // -1 represents bye
  const numTeams = teams.length
  const numMatchdays = numTeams - 1

  // Circle method: Fix one team, rotate the rest
  for (let matchday = 1; matchday <= numMatchdays; matchday++) {
    const matchesThisDay: ScheduleMatch[] = []

    for (let i = 0; i < numTeams / 2; i++) {
      const home = i === 0 ? 0 : (matchday + i - 1) % (numTeams - 1) + 1
      const away = (matchday + numTeams - 2 - i) % (numTeams - 1) + 1

      const homeTeam = teams[home]
      const awayTeam = teams[away]

      // Skip matches involving the bye team
      if (homeTeam !== -1 && awayTeam !== -1) {
        matchesThisDay.push({
          team1Index: teamIds.indexOf(homeTeam),
          team2Index: teamIds.indexOf(awayTeam),
          matchday
        })
      }
    }

    // First matchday also includes the fixed team (index 0)
    if (matchday <= numMatchdays) {
      const fixedTeamOpponent = (matchday - 1) % (numTeams - 1) + 1
      const opponent = teams[fixedTeamOpponent]

      if (teams[0] !== -1 && opponent !== -1) {
        // Check if this match already exists
        const exists = matchesThisDay.some(
          m => (teamIds[m.team1Index] === teams[0] && teamIds[m.team2Index] === opponent) ||
               (teamIds[m.team1Index] === opponent && teamIds[m.team2Index] === teams[0])
        )

        if (!exists) {
          matchesThisDay.push({
            team1Index: teamIds.indexOf(teams[0]),
            team2Index: teamIds.indexOf(opponent),
            matchday
          })
        }
      }
    }

    matches.push(...matchesThisDay)
  }

  return matches
}

/**
 * Simpler round-robin generation using direct pairing
 * More reliable for small groups (3-5 teams)
 */
export function generateSimpleRoundRobin(teamIds: number[]): ScheduleMatch[] {
  const n = teamIds.length
  const matches: ScheduleMatch[] = []

  if (n < 2) return matches

  // Generate all possible pairings
  const allPairings: Array<{ team1: number; team2: number }> = []
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      allPairings.push({ team1: i, team2: j })
    }
  }

  // Calculate matchdays needed
  // N teams: each plays N-1 matches
  // Matches per matchday: floor(N/2)
  // Total matchdays: for even N = N-1, for odd N = N
  const matchesPerDay = Math.floor(n / 2)
  const numMatchdays = n % 2 === 0 ? n - 1 : n

  // Assign matchdays trying to balance team appearances
  const teamLastMatchday: number[] = new Array(n).fill(0)
  const assignedPairings = new Set<string>()

  for (let matchday = 1; matchday <= numMatchdays; matchday++) {
    const teamsPlayingToday = new Set<number>()
    let matchesScheduled = 0

    for (const pairing of allPairings) {
      const key = `${pairing.team1}-${pairing.team2}`
      if (assignedPairings.has(key)) continue
      if (teamsPlayingToday.has(pairing.team1) || teamsPlayingToday.has(pairing.team2)) continue
      if (matchesScheduled >= matchesPerDay) break

      matches.push({
        team1Index: pairing.team1,
        team2Index: pairing.team2,
        matchday
      })

      assignedPairings.add(key)
      teamsPlayingToday.add(pairing.team1)
      teamsPlayingToday.add(pairing.team2)
      teamLastMatchday[pairing.team1] = matchday
      teamLastMatchday[pairing.team2] = matchday
      matchesScheduled++
    }
  }

  return matches
}

/**
 * Calculate group standings from completed matches
 *
 * @param groupId - The group ID
 * @param teamIds - Array of team IDs in the group
 * @param matches - All group matches (completed ones will be used for calculations)
 * @returns Array of standings sorted by position
 */
export function calculateGroupStandings(
  groupId: number,
  teamIds: number[],
  matches: TournamentMatch[]
): GroupStanding[] {
  // Initialize standings for each team
  const standings: Map<number, GroupStanding> = new Map()

  for (const teamId of teamIds) {
    standings.set(teamId, {
      teamId,
      groupId,
      matchesPlayed: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      pointsDifference: 0,
      tournamentPoints: 0,
      position: 0,
      qualified: false
    })
  }

  // Process completed matches
  const groupMatches = matches.filter(
    m => m.group_id === groupId && m.status === 'completed' && m.team1_id && m.team2_id
  )

  for (const match of groupMatches) {
    const team1 = standings.get(match.team1_id!)
    const team2 = standings.get(match.team2_id!)

    if (!team1 || !team2) continue

    team1.matchesPlayed++
    team2.matchesPlayed++

    team1.pointsFor += match.team1_score
    team1.pointsAgainst += match.team2_score

    team2.pointsFor += match.team2_score
    team2.pointsAgainst += match.team1_score

    if (match.team1_score > match.team2_score) {
      // Team 1 wins
      team1.wins++
      team1.tournamentPoints += 3
      team2.losses++
    } else if (match.team2_score > match.team1_score) {
      // Team 2 wins
      team2.wins++
      team2.tournamentPoints += 3
      team1.losses++
    } else {
      // Draw
      team1.draws++
      team2.draws++
      team1.tournamentPoints += 1
      team2.tournamentPoints += 1
    }
  }

  // Calculate points difference
  for (const standing of standings.values()) {
    standing.pointsDifference = standing.pointsFor - standing.pointsAgainst
  }

  // Sort standings by tiebreakers:
  // 1. Tournament points
  // 2. Points difference
  // 3. Points for
  // 4. Head-to-head (handled in separate function if needed)
  const sortedStandings = Array.from(standings.values()).sort((a, b) => {
    // Higher tournament points first
    if (b.tournamentPoints !== a.tournamentPoints) {
      return b.tournamentPoints - a.tournamentPoints
    }
    // Higher points difference first
    if (b.pointsDifference !== a.pointsDifference) {
      return b.pointsDifference - a.pointsDifference
    }
    // Higher points for first
    return b.pointsFor - a.pointsFor
  })

  // Assign positions (1-indexed)
  sortedStandings.forEach((standing, index) => {
    standing.position = index + 1
    standing.qualified = index < 2 // Top 2 qualify
  })

  return sortedStandings
}

/**
 * Check head-to-head result between two teams
 * Used for tiebreaker when two teams have equal points
 *
 * @param teamAId - First team ID
 * @param teamBId - Second team ID
 * @param matches - All group matches
 * @returns 1 if teamA wins H2H, -1 if teamB wins, 0 if tied or no match
 */
export function checkHeadToHead(
  teamAId: number,
  teamBId: number,
  matches: TournamentMatch[]
): number {
  const h2hMatch = matches.find(
    m => m.status === 'completed' &&
      ((m.team1_id === teamAId && m.team2_id === teamBId) ||
       (m.team1_id === teamBId && m.team2_id === teamAId))
  )

  if (!h2hMatch) return 0

  if (h2hMatch.team1_id === teamAId) {
    if (h2hMatch.team1_score > h2hMatch.team2_score) return 1
    if (h2hMatch.team1_score < h2hMatch.team2_score) return -1
    return 0
  } else {
    if (h2hMatch.team2_score > h2hMatch.team1_score) return 1
    if (h2hMatch.team2_score < h2hMatch.team1_score) return -1
    return 0
  }
}

/**
 * Resolve knockout seeding to actual team IDs based on group standings
 *
 * @param seeding - The knockout seeding configuration
 * @param groupStandings - Map of group names to their standings
 * @returns Map of match keys to resolved team IDs
 */
export function resolveKnockoutSeeding(
  seeding: KnockoutSeeding,
  groupStandings: Map<string, GroupStanding[]>
): Map<string, { team1Id: number | null; team2Id: number | null }> {
  const resolvedMatches = new Map<string, { team1Id: number | null; team2Id: number | null }>()

  for (const [matchKey, matchSeeding] of Object.entries(seeding)) {
    const team1Id = resolveGroupPosition(matchSeeding.team1, groupStandings)
    const team2Id = resolveGroupPosition(matchSeeding.team2, groupStandings)

    resolvedMatches.set(matchKey, { team1Id, team2Id })
  }

  return resolvedMatches
}

/**
 * Parse a group position string and return the team ID
 * Format: "group_X_N" where X is the group letter and N is the position (1=winner, 2=runner-up)
 *
 * @param positionString - e.g., "group_A_1" for Group A winner
 * @param groupStandings - Map of group names to their standings
 * @returns The team ID or null if not found
 */
export function resolveGroupPosition(
  positionString: string,
  groupStandings: Map<string, GroupStanding[]>
): number | null {
  // Parse format: "group_A_1" -> group "A", position 1
  const match = positionString.match(/^group_([A-Z])_(\d+)$/)
  if (!match) return null

  const groupLetter = match[1]
  const position = parseInt(match[2], 10)

  const groupName = `Group ${groupLetter}`
  const standings = groupStandings.get(groupName)

  if (!standings) return null

  const standing = standings.find(s => s.position === position)
  return standing?.teamId ?? null
}

/**
 * Get the number of matchdays required for a given number of teams per group
 *
 * @param teamsPerGroup - Number of teams in the group
 * @returns Number of matchdays required
 */
export function getMatchdaysForGroupSize(teamsPerGroup: number): number {
  // In a round-robin, each team plays every other team once
  // N teams = N-1 matchdays for even N, N matchdays for odd N
  // But each matchday can have floor(N/2) matches
  // Total matches = N*(N-1)/2
  // Matches per day = floor(N/2)
  // Matchdays = ceil(total matches / matches per day)

  // Simpler: for N teams, you need N-1 or N matchdays
  return teamsPerGroup % 2 === 0 ? teamsPerGroup - 1 : teamsPerGroup
}

/**
 * Generate group letter from index
 *
 * @param index - Zero-based group index
 * @returns Group letter (A, B, C, ...)
 */
export function getGroupLetter(index: number): string {
  return String.fromCharCode(65 + index) // 65 is ASCII for 'A'
}

/**
 * Generate group name from index
 *
 * @param index - Zero-based group index
 * @returns Group name (Group A, Group B, ...)
 */
export function getGroupName(index: number): string {
  return `Group ${getGroupLetter(index)}`
}

/**
 * Get round name for knockout stage based on number of teams
 *
 * @param totalTeams - Total teams in knockout stage
 * @param roundOrder - Current round (1 = first knockout round)
 * @returns Round name string
 */
export function getKnockoutRoundName(totalTeams: number, roundOrder: number): string {
  const totalRounds = Math.ceil(Math.log2(totalTeams))
  const roundFromEnd = totalRounds - roundOrder + 1

  switch (roundFromEnd) {
    case 1: return 'Final'
    case 2: return 'Semi-Final'
    case 3: return 'Quarter-Final'
    case 4: return 'Round of 16'
    case 5: return 'Round of 32'
    default: return `Round ${roundOrder}`
  }
}

/**
 * Calculate total knockout rounds needed for given number of teams
 *
 * @param numTeams - Number of teams in knockout stage
 * @returns Number of knockout rounds
 */
export function getKnockoutRoundCount(numTeams: number): number {
  return Math.ceil(Math.log2(numTeams))
}

/**
 * Generate all knockout bracket matches for given number of teams
 * Creates empty match slots that will be filled when groups complete
 *
 * @param numTeams - Number of teams advancing to knockout
 * @param knockoutGameweeks - Gameweeks for each round
 * @returns Array of match data ready for database insertion
 */
export function generateKnockoutBracketStructure(
  numTeams: number,
  knockoutGameweeks: number[]
): Array<{
  round_name: string
  round_order: number
  match_order: number
  gameweeks: number[]
}> {
  const matches: Array<{
    round_name: string
    round_order: number
    match_order: number
    gameweeks: number[]
  }> = []

  const numRounds = getKnockoutRoundCount(numTeams)
  let matchesInRound = Math.ceil(numTeams / 2)

  for (let round = 1; round <= numRounds; round++) {
    const roundName = getKnockoutRoundName(numTeams, round)
    const roundGameweeks = knockoutGameweeks[round - 1]
      ? [knockoutGameweeks[round - 1]]
      : knockoutGameweeks.slice(0, 1) // Fallback to first GW if not enough specified

    for (let matchOrder = 1; matchOrder <= matchesInRound; matchOrder++) {
      matches.push({
        round_name: roundName,
        round_order: round,
        match_order: matchOrder,
        gameweeks: roundGameweeks
      })
    }

    matchesInRound = Math.ceil(matchesInRound / 2)
  }

  return matches
}

/**
 * Check if all group matches are completed
 *
 * @param matches - All tournament matches
 * @returns True if all group matches are completed
 */
export function isGroupStageComplete(matches: TournamentMatch[]): boolean {
  const groupMatches = matches.filter(m => m.match_type === 'group')
  if (groupMatches.length === 0) return false
  return groupMatches.every(m => m.status === 'completed')
}

/**
 * Get the expected total matches for group stage
 *
 * @param numGroups - Number of groups
 * @param teamsPerGroup - Teams in each group
 * @returns Total number of group matches expected
 */
export function getExpectedGroupMatches(numGroups: number, teamsPerGroup: number): number {
  // Each group has (n * (n-1)) / 2 matches
  const matchesPerGroup = (teamsPerGroup * (teamsPerGroup - 1)) / 2
  return numGroups * matchesPerGroup
}
