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
  const [refreshing, setRefreshing] = useState(false)
  const [selectedRound, setSelectedRound] = useState<number | null>(null)

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

  const handleRefresh = async () => {
    setRefreshing(true)
    setError(null)
    try {
      await fetchTournamentData()
    } catch (error) {
      console.error('Error refreshing tournament data:', error)
      setError('Error al actualizar los datos del torneo')
    } finally {
      setRefreshing(false)
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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                Actualizando...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualizar
              </>
            )}
          </Button>
          <Badge variant="outline" className={`${getStatusColor(tournament.status)} text-white`}>
            {tournament.status}
          </Badge>
        </div>
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
              <span className="text-sm">GW: {tournament.gameweeks.join(', ')}</span>
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
          <div className="flex items-center justify-between">
            <CardTitle>Cuadro del Torneo</CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Progreso:</span>
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
                      title={`${roundMatches[0]?.round_name || `Ronda ${round}`}: ${completedMatches}/${totalMatches} completados`}
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
                Todas las Fases
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
                    {matches[0]?.round_name || `Ronda ${round}`}
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
                    {matches[0]?.round_name || `Ronda ${round}`}
                  </h3>
                  <Badge variant="outline" className="text-xs">
                    {matches.filter(m => m.status === 'completed').length} de {matches.length} completados
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
                            Partido {match.match_order + 1}
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
                                Empate
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center text-muted-foreground py-8 bg-gray-50 rounded-lg">
                            <Users className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                            <p className="text-sm">
                              {match.status === 'pending' ? 'Equipos por determinar' : 'Partido pendiente'}
                            </p>
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