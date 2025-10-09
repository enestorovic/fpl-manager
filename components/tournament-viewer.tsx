"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Trophy,
  Calendar,
  Users,
  ArrowLeft,
  Crown,
  Target,
  RefreshCw
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import type { Tournament, TournamentMatch, TournamentParticipant, Team } from "@/lib/supabase"

interface TournamentViewerProps {
  tournamentId: number
  onBack: () => void
}

interface TournamentWithData extends Tournament {
  participants: (TournamentParticipant & { team: Team })[]
  matches: TournamentMatch[]
}

export function TournamentViewer({ tournamentId, onBack }: TournamentViewerProps) {
  const [tournament, setTournament] = useState<TournamentWithData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [calculating, setCalculating] = useState(false)
  const [hardRefreshing, setHardRefreshing] = useState(false)
  const [selectedRound, setSelectedRound] = useState<number | null>(null)

  useEffect(() => {
    fetchTournamentData()
  }, [tournamentId])

  useEffect(() => {
    // Auto-calculate scores if tournament is active and gameweeks have data
    if (tournament && tournament.status === 'active') {
      console.log('Tournament is active, checking for auto-calculation...')
      autoCalculateScoresIfNeeded()
    }
  }, [tournament])

  // Also auto-calculate after data is fetched if tournament is active
  useEffect(() => {
    if (tournament && tournament.status === 'active') {
      console.log('Component mounted with active tournament, auto-calculating...')
      const timer = setTimeout(() => {
        autoCalculateScoresIfNeeded()
      }, 1000) // Small delay to ensure data is loaded

      return () => clearTimeout(timer)
    }
  }, [tournament?.status, tournament?.id])

  // Set up periodic refresh for active tournaments
  useEffect(() => {
    if (tournament && tournament.status === 'active') {
      // Check for new gameweek data every 5 minutes
      const interval = setInterval(() => {
        console.log('Periodic check for new gameweek data...')
        autoCalculateScoresIfNeeded()
      }, 5 * 60 * 1000) // 5 minutes

      return () => clearInterval(interval)
    }
  }, [tournament?.status, tournament?.id])

  const fetchTournamentData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch tournament basic info
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single()

      if (tournamentError) throw tournamentError

      // Fetch participants with team data
      const { data: participantsData, error: participantsError } = await supabase
        .from('tournament_participants')
        .select(`
          *,
          team:teams(*)
        `)
        .eq('tournament_id', tournamentId)

      if (participantsError) throw participantsError

      // Fetch matches
      const { data: matchesData, error: matchesError } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('round_order', { ascending: true })
        .order('match_order', { ascending: true })

      if (matchesError) throw matchesError

      setTournament({
        ...tournamentData,
        participants: participantsData || [],
        matches: matchesData || []
      })

    } catch (error) {
      console.error('Error fetching tournament data:', error)
      setError('Failed to load tournament data')
    } finally {
      setLoading(false)
    }
  }

  const fetchFreshTournamentData = async (): Promise<TournamentWithData | null> => {
    try {
      // Fetch tournament basic info
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single()

      if (tournamentError) throw tournamentError

      // Fetch participants with team data
      const { data: participantsData, error: participantsError } = await supabase
        .from('tournament_participants')
        .select(`
          *,
          team:teams(*)
        `)
        .eq('tournament_id', tournamentId)

      if (participantsError) throw participantsError

      // Fetch matches
      const { data: matchesData, error: matchesError } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('round_order', { ascending: true })
        .order('match_order', { ascending: true })

      if (matchesError) throw matchesError

      return {
        ...tournamentData,
        participants: participantsData || [],
        matches: matchesData || []
      }

    } catch (error) {
      console.error('Error fetching fresh tournament data:', error)
      return null
    }
  }

  const autoCalculateScoresIfNeeded = async () => {
    if (!tournament) return

    // Check if any matches need score calculation
    const matchesToCalculate = tournament.matches.filter(match =>
      match.team1_id && match.team2_id && match.status !== 'completed'
    )

    if (matchesToCalculate.length === 0) return

    // Check if gameweek data is available
    const hasGameweekData = await checkGameweekDataAvailable(tournament.gameweeks)
    if (hasGameweekData) {
      console.log('Auto-calculating tournament scores...')
      await calculateMatchScores(true) // true = silent mode
    }
  }

  const checkGameweekDataAvailable = async (gameweeks: number[]): Promise<boolean> => {
    try {
      // Check if we have team_summaries data for these gameweeks
      const { data, error } = await supabase
        .from('team_summaries')
        .select('event_number')
        .in('event_number', gameweeks)
        .limit(1)

      if (error) return false
      return data && data.length > 0
    } catch (error) {
      console.error('Error checking gameweek data:', error)
      return false
    }
  }

  const calculateMatchScores = async (silent = false) => {
    if (!tournament) return

    if (!silent) {
      setCalculating(true)
      setError(null)
    }

    try {
      let matchesUpdated = 0

      // Sort matches by round order to process them sequentially
      const sortedMatches = [...tournament.matches].sort((a, b) => a.round_order - b.round_order)

      // Calculate scores for each match
      for (const match of sortedMatches) {
        console.log(`Processing match ${match.id}:`, {
          team1: match.team1_id,
          team2: match.team2_id,
          status: match.status,
          gameweeks: match.gameweeks,
          roundName: match.round_name
        })

        if (match.team1_id && match.team2_id && match.status !== 'completed') {
          // Get team summaries for the match gameweeks
          const gameweeks = match.gameweeks

          let team1Score = 0
          let team2Score = 0
          let hasValidData = false

          // Sum points across all gameweeks for this match
          for (const gw of gameweeks) {
            console.log(`Fetching data for GW ${gw}, teams ${match.team1_id} and ${match.team2_id}`)

            const { data: team1Summary, error: team1Error } = await supabase
              .from('team_summaries')
              .select('points, transfers_cost')
              .eq('team_id', match.team1_id)
              .eq('event_number', gw)
              .single()

            const { data: team2Summary, error: team2Error } = await supabase
              .from('team_summaries')
              .select('points, transfers_cost')
              .eq('team_id', match.team2_id)
              .eq('event_number', gw)
              .single()

            // Check if we have valid data (either team has actual data, not just missing records)
            const team1HasData = team1Summary && !team1Error
            const team2HasData = team2Summary && !team2Error

            if (team1HasData && team2HasData) {
              hasValidData = true

              // Calculate net scores (points - transfer costs)
              const team1NetScore = (team1Summary.points || 0) - (team1Summary.transfers_cost || 0)
              const team2NetScore = (team2Summary.points || 0) - (team2Summary.transfers_cost || 0)

              console.log(`GW ${gw} results (valid data):`, {
                team1Points: team1Summary.points || 0,
                team1TransferCost: team1Summary.transfers_cost || 0,
                team1NetScore,
                team2Points: team2Summary.points || 0,
                team2TransferCost: team2Summary.transfers_cost || 0,
                team2NetScore
              })

              team1Score += team1NetScore
              team2Score += team2NetScore
            } else {
              console.log(`GW ${gw} results (no data available):`, {
                team1Error: team1Error?.message || 'No data',
                team2Error: team2Error?.message || 'No data'
              })
            }
          }

          console.log(`Final scores for match ${match.id}:`, {
            team1Score,
            team2Score,
            hasValidData,
            gameweeks
          })

          // Only update match if we have valid data for the gameweeks
          if (hasValidData) {
            // Determine winner
            const winnerId = team1Score > team2Score ? match.team1_id :
                            team2Score > team1Score ? match.team2_id : null

            console.log(`Updating match ${match.id} with winner ${winnerId} (valid data available)`)

            // Update match with scores
            const { error: updateError } = await supabase
              .from('tournament_matches')
              .update({
                team1_score: team1Score,
                team2_score: team2Score,
                winner_id: winnerId,
                status: 'completed',
                updated_at: new Date().toISOString()
              })
              .eq('id', match.id)

            if (updateError) {
              console.error('Error updating match:', updateError)
              throw updateError
            }

            console.log(`Successfully updated match ${match.id}`)
            matchesUpdated++
          } else {
            console.log(`Skipping match ${match.id} - no gameweek data available yet`)
          }
        } else {
          console.log(`Skipping match ${match.id}: missing teams or already completed`)
        }
      }

      // After updating matches, advance winners to next rounds
      if (matchesUpdated > 0) {
        console.log(`Updated ${matchesUpdated} matches, now advancing winners...`)

        // Fetch fresh tournament data for winner advancement
        const freshTournamentData = await fetchFreshTournamentData()

        if (freshTournamentData) {
          // Then advance winners using fresh data
          await advanceWinnersToNextRounds(freshTournamentData)
        }

        // Refresh component state to show the advancement results
        await fetchTournamentData()

        if (!silent) {
          console.log(`Updated ${matchesUpdated} matches with scores`)
        }
      }

    } catch (error) {
      console.error('Error calculating scores:', error)
      if (!silent) {
        setError('Failed to calculate match scores')
      }
    } finally {
      if (!silent) {
        setCalculating(false)
      }
    }
  }

  const advanceWinnersToNextRounds = async (tournamentData?: TournamentWithData) => {
    const currentTournament = tournamentData || tournament
    if (!currentTournament) return

    try {
      // Get all completed matches, sorted by round and match order
      const completedMatches = currentTournament.matches
        .filter(match => match.status === 'completed' && match.winner_id)
        .sort((a, b) => a.round_order - b.round_order || a.match_order - b.match_order)

      console.log('Completed matches for advancement:', completedMatches.map(m => ({
        round: m.round_order,
        match: m.match_order,
        winner: m.winner_id
      })))

      // Group completed matches by round
      const matchesByRound = completedMatches.reduce((acc, match) => {
        if (!acc[match.round_order]) acc[match.round_order] = []
        acc[match.round_order].push(match)
        return acc
      }, {} as Record<number, typeof completedMatches>)

      // Process each round
      for (const [roundStr, roundMatches] of Object.entries(matchesByRound)) {
        const round = parseInt(roundStr)
        const nextRound = round + 1

        // Sort current round matches by match_order
        const sortedRoundMatches = roundMatches.sort((a, b) => a.match_order - b.match_order)

        // Find next round matches that need winners
        const nextRoundMatches = currentTournament.matches
          .filter(match => match.round_order === nextRound)
          .sort((a, b) => a.match_order - b.match_order)

        console.log(`Processing round ${round}:`, {
          currentRoundMatches: sortedRoundMatches.length,
          nextRoundMatches: nextRoundMatches.length
        })

        // Advance winners to next round - every 2 matches feed into 1 next match
        for (let i = 0; i < sortedRoundMatches.length; i += 2) {
          const match1 = sortedRoundMatches[i]
          const match2 = sortedRoundMatches[i + 1]
          const nextMatchIndex = Math.floor(i / 2)
          const nextMatch = nextRoundMatches[nextMatchIndex]

          console.log(`Trying to advance from matches ${i} and ${i+1} to next match ${nextMatchIndex}:`, {
            match1Id: match1?.id,
            match2Id: match2?.id,
            nextMatchId: nextMatch?.id,
            nextMatchTeams: { team1: nextMatch?.team1_id, team2: nextMatch?.team2_id }
          })

          if (match1 && match2 && nextMatch && !nextMatch.team1_id && !nextMatch.team2_id) {
            // Both matches completed, advance both winners
            console.log(`Advancing both winners to match ${nextMatch.id}:`, {
              team1: match1.winner_id,
              team2: match2.winner_id
            })

            const { error } = await supabase
              .from('tournament_matches')
              .update({
                team1_id: match1.winner_id,
                team2_id: match2.winner_id,
                updated_at: new Date().toISOString()
              })
              .eq('id', nextMatch.id)

            if (error) {
              console.error('Error updating match:', error)
              throw error
            }
          } else if (match1 && nextMatch && !nextMatch.team1_id && !match2) {
            // Only one match in this pairing (odd number), advance to team1 slot
            console.log(`Advancing single winner to match ${nextMatch.id}:`, {
              team1: match1.winner_id
            })

            const { error } = await supabase
              .from('tournament_matches')
              .update({
                team1_id: match1.winner_id,
                updated_at: new Date().toISOString()
              })
              .eq('id', nextMatch.id)

            if (error) {
              console.error('Error updating match:', error)
              throw error
            }
          }
        }
      }
    } catch (error) {
      console.error('Error advancing winners:', error)
    }
  }

  const hardRefreshTournament = async () => {
    if (!tournament) return

    if (!confirm('This will completely reset and recalculate the entire tournament from scratch. All current match results will be cleared. Are you sure?')) {
      return
    }

    setHardRefreshing(true)
    setError(null)

    try {
      console.log('Starting hard refresh: resetting all matches...')

      // Reset all matches in the tournament
      const { error: resetError } = await supabase
        .from('tournament_matches')
        .update({
          team1_score: null,
          team2_score: null,
          winner_id: null,
          status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('tournament_id', tournamentId)

      if (resetError) throw resetError

      // Reset all matches except first round back to no teams
      const { error: clearTeamsError } = await supabase
        .from('tournament_matches')
        .update({
          team1_id: null,
          team2_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('tournament_id', tournamentId)
        .gt('round_order', 1)

      if (clearTeamsError) throw clearTeamsError

      console.log('All matches reset, refreshing tournament data...')

      // Refresh tournament data
      await fetchTournamentData()

      // Wait a moment for state to update
      await new Promise(resolve => setTimeout(resolve, 500))

      console.log('Starting fresh calculation...')

      // Now recalculate everything from scratch
      await calculateMatchScores()

    } catch (error) {
      console.error('Error during hard refresh:', error)
      setError('Failed to reset and recalculate tournament')
    } finally {
      setHardRefreshing(false)
    }
  }

  const getTeamById = (teamId: number | null) => {
    if (!teamId || !tournament) return null
    return tournament.participants.find(p => p.team_id === teamId)?.team
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500'
      case 'active': return 'bg-blue-500'
      default: return 'bg-gray-500'
    }
  }

  const getMatchResult = (match: TournamentMatch) => {
    const team1 = getTeamById(match.team1_id)
    const team2 = getTeamById(match.team2_id)

    if (!team1 || !team2) return null

    return {
      team1: {
        ...team1,
        score: match.team1_score,
        isWinner: match.winner_id === match.team1_id
      },
      team2: {
        ...team2,
        score: match.team2_score,
        isWinner: match.winner_id === match.team2_id
      },
      isDraw: match.winner_id === null && match.status === 'completed'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!tournament) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Tournament not found</AlertDescription>
      </Alert>
    )
  }

  const matchesByRound = tournament.matches.reduce((acc, match) => {
    if (!acc[match.round_order]) acc[match.round_order] = []
    acc[match.round_order].push(match)
    return acc
  }, {} as Record<number, TournamentMatch[]>)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-6 w-6" />
            {tournament.name}
          </h1>
          <p className="text-muted-foreground">{tournament.description}</p>
        </div>
        <Badge variant="outline" className={`${getStatusColor(tournament.status)} text-white`}>
          {tournament.status}
        </Badge>
      </div>

      {/* Tournament Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Tournament Details</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => calculateMatchScores()}
                disabled={calculating || hardRefreshing}
              >
                {calculating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                    Updating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Scores
                  </>
                )}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={hardRefreshTournament}
                disabled={calculating || hardRefreshing}
              >
                {hardRefreshing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                    Resetting...
                  </>
                ) : (
                  <>
                    🔄 Hard Reset
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{tournament.participants.length} teams</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">GWs: {tournament.gameweeks.join(', ')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{tournament.type} format</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}


      {/* Tournament Bracket */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Tournament Bracket</CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Progress:</span>
              <div className="flex items-center gap-1">
                {Object.keys(matchesByRound).map((round) => {
                  const roundNum = parseInt(round)
                  const roundMatches = matchesByRound[roundNum]
                  const completedMatches = roundMatches.filter(m => m.status === 'completed').length
                  const totalMatches = roundMatches.length
                  const isCompleted = completedMatches === totalMatches

                  return (
                    <div
                      key={round}
                      className={`w-3 h-3 rounded-full ${
                        isCompleted
                          ? 'bg-green-500'
                          : completedMatches > 0
                            ? 'bg-yellow-500'
                            : 'bg-gray-300'
                      }`}
                      title={`${roundMatches[0]?.round_name || `Round ${round}`}: ${completedMatches}/${totalMatches} completed`}
                    />
                  )
                })}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Phase Navigation */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-2 mb-4">
              <Button
                variant={selectedRound === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedRound(null)}
                className="text-xs"
              >
                All Phases
              </Button>
              {Object.entries(matchesByRound).map(([round, matches]) => {
                const roundNum = parseInt(round)
                const completedMatches = matches.filter(m => m.status === 'completed').length
                const totalMatches = matches.length

                return (
                  <Button
                    key={round}
                    variant={selectedRound === roundNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedRound(roundNum)}
                    className="text-xs flex items-center gap-2"
                  >
                    {matches[0]?.round_name || `Round ${round}`}
                    <Badge variant="secondary" className="text-xs px-1">
                      {completedMatches}/{totalMatches}
                    </Badge>
                  </Button>
                )
              })}
            </div>
          </div>

          {/* Bracket Display */}
          <div className="space-y-6">
            {Object.entries(matchesByRound)
              .filter(([round]) => selectedRound === null || parseInt(round) === selectedRound)
              .map(([round, matches]) => (
              <div key={round}>
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="text-lg font-medium">
                    {matches[0]?.round_name || `Round ${round}`}
                  </h3>
                  <Badge variant="outline" className="text-xs">
                    {matches.filter(m => m.status === 'completed').length} of {matches.length} completed
                  </Badge>
                </div>

                <div className={`grid gap-4 ${
                  matches.length <= 2 ? 'grid-cols-1' :
                  matches.length <= 4 ? 'grid-cols-1 md:grid-cols-2' :
                  'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                }`}>
                  {matches.map((match) => {
                    const result = getMatchResult(match)

                    return (
                      <div key={match.id} className="border rounded-lg p-4 bg-gradient-to-br from-white to-pink-50/30">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-pink-700">
                            Match {match.match_order + 1}
                          </span>
                          <Badge variant="outline" className="text-xs border-pink-200 text-pink-700">
                            GW {match.gameweeks.join(', ')}
                          </Badge>
                        </div>

                        {result ? (
                          <div className="space-y-2">
                            {/* Team 1 */}
                            <div className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                              result.team1.isWinner
                                ? 'bg-gradient-to-r from-green-100 to-emerald-100 border border-green-300 shadow-sm'
                                : 'bg-gray-50 border border-gray-200'
                            }`}>
                              <div className="flex items-center gap-2">
                                {result.team1.isWinner && <Crown className="h-4 w-4 text-yellow-600" />}
                                <div>
                                  <span className="font-medium text-sm">{result.team1.entry_name}</span>
                                  <div className="text-xs text-muted-foreground">#{result.team1.rank}</div>
                                </div>
                              </div>
                              <div className={`font-mono font-bold text-lg ${
                                result.team1.isWinner ? 'text-green-700' : 'text-gray-600'
                              }`}>
                                {match.status === 'completed' ? result.team1.score : '—'}
                              </div>
                            </div>

                            {/* VS */}
                            <div className="text-center text-xs text-pink-600 font-medium">VS</div>

                            {/* Team 2 */}
                            <div className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                              result.team2.isWinner
                                ? 'bg-gradient-to-r from-green-100 to-emerald-100 border border-green-300 shadow-sm'
                                : 'bg-gray-50 border border-gray-200'
                            }`}>
                              <div className="flex items-center gap-2">
                                {result.team2.isWinner && <Crown className="h-4 w-4 text-yellow-600" />}
                                <div>
                                  <span className="font-medium text-sm">{result.team2.entry_name}</span>
                                  <div className="text-xs text-muted-foreground">#{result.team2.rank}</div>
                                </div>
                              </div>
                              <div className={`font-mono font-bold text-lg ${
                                result.team2.isWinner ? 'text-green-700' : 'text-gray-600'
                              }`}>
                                {match.status === 'completed' ? result.team2.score : '—'}
                              </div>
                            </div>

                            {result.isDraw && (
                              <div className="text-center text-sm text-orange-600 font-medium mt-2 p-2 bg-orange-50 rounded">
                                Draw
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center text-muted-foreground py-8 bg-gray-50 rounded-lg">
                            <Users className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                            <p className="text-sm">Teams to be determined</p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Participants List */}
      <Card>
        <CardHeader>
          <CardTitle>Tournament Participants</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {tournament.participants.map((participant) => (
              <div key={participant.id} className="flex items-center justify-between p-2 border rounded">
                <div>
                  <span className="font-medium">{participant.team.entry_name}</span>
                  <p className="text-xs text-muted-foreground">{participant.team.player_name}</p>
                </div>
                <Badge variant="outline">#{participant.team.rank}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}