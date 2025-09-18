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
  Target
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import type { Tournament, TournamentMatch, TournamentParticipant, Team } from "@/lib/supabase"

interface PublicTournamentViewerProps {
  tournamentId: number
  onBack: () => void
}

interface TournamentWithData extends Tournament {
  participants: (TournamentParticipant & { team: Team })[]
  matches: TournamentMatch[]
}

export function PublicTournamentViewer({ tournamentId, onBack }: PublicTournamentViewerProps) {
  const [tournament, setTournament] = useState<TournamentWithData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

      // Only show if tournament is active or completed
      if (!['active', 'completed'].includes(tournamentData.status)) {
        throw new Error('Torneo no disponible para visualización pública')
      }

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
      setError('Error al cargar los datos del torneo')
    } finally {
      setLoading(false)
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

  const getTournamentWinner = () => {
    if (!tournament || tournament.status !== 'completed') return null

    const finalMatch = tournament.matches
      .filter(match => match.round_name === 'Final' && match.status === 'completed')
      .find(match => match.winner_id)

    if (finalMatch?.winner_id) {
      return getTeamById(finalMatch.winner_id)
    }

    return null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!tournament || error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {error || 'Torneo no encontrado o no disponible para visualización'}
        </AlertDescription>
      </Alert>
    )
  }

  const matchesByRound = tournament.matches.reduce((acc, match) => {
    if (!acc[match.round_order]) acc[match.round_order] = []
    acc[match.round_order].push(match)
    return acc
  }, {} as Record<number, TournamentMatch[]>)

  const winner = getTournamentWinner()

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Torneos
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

      {/* Tournament Winner (if completed) */}
      {winner && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <Crown className="h-12 w-12 mx-auto text-yellow-600 mb-3" />
              <h2 className="text-2xl font-bold text-yellow-800 mb-2">Campeón del Torneo</h2>
              <div className="bg-white rounded-lg p-4 inline-block">
                <h3 className="text-xl font-bold">{winner.entry_name}</h3>
                <p className="text-muted-foreground">{winner.player_name}</p>
                <Badge variant="outline" className="mt-2">
                  Posición #{winner.rank}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tournament Info */}
      <Card>
        <CardHeader>
          <CardTitle>Detalles del Torneo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{tournament.participants.length} equipos</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">JF: {tournament.gameweeks.join(', ')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Formato {tournament.type}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tournament Bracket */}
      <Card>
        <CardHeader>
          <CardTitle>Cuadro del Torneo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Object.entries(matchesByRound).map(([round, matches]) => (
              <div key={round}>
                <h3 className="text-lg font-medium mb-4">
                  {matches[0]?.round_name || `Ronda ${round}`}
                </h3>
                <div className="grid gap-4">
                  {matches.map((match) => {
                    const result = getMatchResult(match)

                    return (
                      <div key={match.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted-foreground">
                            Partido {match.match_order + 1}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            JF {match.gameweeks.join(', ')}
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
                                Empate
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center text-muted-foreground py-4">
                            {match.status === 'pending' ? 'Equipos por determinar' : 'Partido pendiente'}
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
          <CardTitle>Participantes del Torneo</CardTitle>
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