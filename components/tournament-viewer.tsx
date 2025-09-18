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

  useEffect(() => {
    fetchTournamentData()
  }, [tournamentId])

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

  const calculateMatchScores = async () => {
    if (!tournament) return

    setCalculating(true)
    setError(null)

    try {
      // Calculate scores for each match
      for (const match of tournament.matches) {
        if (match.team1_id && match.team2_id && match.status !== 'completed') {
          // Get team summaries for the match gameweeks
          const gameweeks = match.gameweeks

          let team1Score = 0
          let team2Score = 0

          // Sum points across all gameweeks for this match
          for (const gw of gameweeks) {
            const { data: team1Summary } = await supabase
              .from('team_summaries')
              .select('points')
              .eq('team_id', match.team1_id)
              .eq('event_number', gw)
              .single()

            const { data: team2Summary } = await supabase
              .from('team_summaries')
              .select('points')
              .eq('team_id', match.team2_id)
              .eq('event_number', gw)
              .single()

            team1Score += team1Summary?.points || 0
            team2Score += team2Summary?.points || 0
          }

          // Determine winner
          const winnerId = team1Score > team2Score ? match.team1_id :
                          team2Score > team1Score ? match.team2_id : null

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

          if (updateError) throw updateError
        }
      }

      // Refresh tournament data
      await fetchTournamentData()

    } catch (error) {
      console.error('Error calculating scores:', error)
      setError('Failed to calculate match scores')
    } finally {
      setCalculating(false)
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
          <CardTitle>Tournament Details</CardTitle>
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

      {/* Calculate Scores Button */}
      {tournament.status === 'active' && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Calculate Match Results</h3>
                <p className="text-sm text-muted-foreground">
                  Calculate scores based on gameweek {tournament.gameweeks.join(', ')} performance
                </p>
              </div>
              <Button onClick={calculateMatchScores} disabled={calculating}>
                {calculating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Calculating...
                  </>
                ) : (
                  'Calculate Scores'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tournament Bracket */}
      <Card>
        <CardHeader>
          <CardTitle>Tournament Bracket</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Object.entries(matchesByRound).map(([round, matches]) => (
              <div key={round}>
                <h3 className="text-lg font-medium mb-4">
                  {matches[0]?.round_name || `Round ${round}`}
                </h3>
                <div className="grid gap-4">
                  {matches.map((match) => {
                    const result = getMatchResult(match)

                    return (
                      <div key={match.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted-foreground">
                            Match {match.match_order + 1}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            GW {match.gameweeks.join(', ')}
                          </Badge>
                        </div>

                        {result ? (
                          <div className="space-y-2">
                            {/* Team 1 */}
                            <div className={`flex items-center justify-between p-2 rounded ${
                              result.team1.isWinner ? 'bg-green-50 border border-green-200' : 'bg-muted/50'
                            }`}>
                              <div className="flex items-center gap-2">
                                {result.team1.isWinner && <Crown className="h-4 w-4 text-yellow-500" />}
                                <span className="font-medium">{result.team1.entry_name}</span>
                                <span className="text-xs text-muted-foreground">#{result.team1.rank}</span>
                              </div>
                              <div className="font-mono font-bold">
                                {match.status === 'completed' ? result.team1.score : '—'}
                              </div>
                            </div>

                            {/* Team 2 */}
                            <div className={`flex items-center justify-between p-2 rounded ${
                              result.team2.isWinner ? 'bg-green-50 border border-green-200' : 'bg-muted/50'
                            }`}>
                              <div className="flex items-center gap-2">
                                {result.team2.isWinner && <Crown className="h-4 w-4 text-yellow-500" />}
                                <span className="font-medium">{result.team2.entry_name}</span>
                                <span className="text-xs text-muted-foreground">#{result.team2.rank}</span>
                              </div>
                              <div className="font-mono font-bold">
                                {match.status === 'completed' ? result.team2.score : '—'}
                              </div>
                            </div>

                            {result.isDraw && (
                              <div className="text-center text-sm text-orange-600 font-medium">
                                Draw
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center text-muted-foreground py-4">
                            Teams to be determined
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