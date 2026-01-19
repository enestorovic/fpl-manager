"use client"

import { useMemo, useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Users, Trophy, CheckCircle2, Clock, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import type { Team, TournamentGroup } from "@/lib/supabase"

// Simple standings for total-points-based groups
export interface GroupTeamStanding {
  teamId: number
  totalPoints: number
  position: number
}

interface GroupStageViewerProps {
  groups: TournamentGroup[]
  participants: Array<{ team_id: number; group_id: number | null; teams: Team }>
  gameweeks: number[]
  // Optional: pass standings from parent (for admin viewer compatibility)
  groupStandings?: Map<number, GroupTeamStanding[]>
  isComplete?: boolean
}

export function GroupStageViewer({
  groups,
  participants,
  gameweeks,
  groupStandings: externalStandings,
  isComplete: externalIsComplete
}: GroupStageViewerProps) {
  // Internal state for self-fetching mode
  const [internalStandings, setInternalStandings] = useState<Record<string, GroupTeamStanding[]>>({})
  const [internalIsComplete, setInternalIsComplete] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedGroup, setSelectedGroup] = useState<string>("")

  // Determine if we should fetch our own data or use external
  const shouldFetchOwn = !externalStandings

  // Reset selected group when groups change
  useEffect(() => {
    if (groups.length > 0) {
      setSelectedGroup(groups[0].id.toString())
    }
  }, [groups])

  // Fetch standings data internally
  useEffect(() => {
    if (!shouldFetchOwn || groups.length === 0 || gameweeks.length === 0) {
      setLoading(false)
      return
    }

    let isMounted = true

    const fetchStandings = async () => {
      setLoading(true)
      const standingsObj: Record<string, GroupTeamStanding[]> = {}
      let allDataAvailable = true

      for (const group of groups) {
        const groupParticipants = participants.filter(p => p.group_id === group.id)
        const teamStandings: Array<{ teamId: number; totalPoints: number }> = []

        for (const participant of groupParticipants) {
          const { data: summaries, error } = await supabase
            .from('team_summaries')
            .select('points, transfers_cost')
            .eq('team_id', participant.team_id)
            .in('event_number', gameweeks)

          if (error) {
            console.error('Error fetching team summaries:', error)
            allDataAvailable = false
            continue
          }

          if (!summaries || summaries.length === 0) {
            teamStandings.push({ teamId: participant.team_id, totalPoints: 0 })
            allDataAvailable = false
          } else {
            const totalPoints = summaries.reduce((sum, s) => {
              return sum + (s.points || 0) - (s.transfers_cost || 0)
            }, 0)
            teamStandings.push({ teamId: participant.team_id, totalPoints })

            if (summaries.length < gameweeks.length) {
              allDataAvailable = false
            }
          }
        }

        teamStandings.sort((a, b) => b.totalPoints - a.totalPoints)
        const groupStandingsList: GroupTeamStanding[] = teamStandings.map((ts, idx) => ({
          teamId: ts.teamId,
          totalPoints: ts.totalPoints,
          position: idx + 1
        }))

        standingsObj[group.id.toString()] = groupStandingsList
      }

      if (isMounted) {
        setInternalStandings(standingsObj)
        setInternalIsComplete(allDataAvailable && Object.keys(standingsObj).length === groups.length)
        setLoading(false)
      }
    }

    fetchStandings()

    return () => {
      isMounted = false
    }
  }, [shouldFetchOwn, groups, participants, gameweeks])

  // Use external or internal data
  const getStandings = (groupId: number): GroupTeamStanding[] => {
    if (externalStandings) {
      return externalStandings.get(groupId) || []
    }
    return internalStandings[groupId.toString()] || []
  }

  const isComplete = externalIsComplete !== undefined ? externalIsComplete : internalIsComplete

  // Get team info by ID
  const teamMap = useMemo(() => {
    const map: Record<number, Team> = {}
    participants.forEach(p => {
      if (p.teams) {
        map[p.team_id] = p.teams
      }
    })
    return map
  }, [participants])

  // Get teams per group for display
  const teamsPerGroupDisplay = useMemo(() => {
    if (groups.length === 0) return 0
    const counts = groups.map(g => {
      const groupParticipants = participants.filter(p => p.group_id === g.id)
      return groupParticipants.length
    })
    const allSame = counts.every(c => c === counts[0])
    return allSame ? counts[0] : null
  }, [groups, participants])

  if (loading && shouldFetchOwn) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Fase de Grupos</h2>
          {isComplete ? (
            <Badge variant="default" className="bg-green-500">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Completa
            </Badge>
          ) : (
            <Badge variant="outline">
              <Clock className="h-3 w-3 mr-1" />
              En Progreso
            </Badge>
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          {groups.length} grupos {teamsPerGroupDisplay ? `× ${teamsPerGroupDisplay} equipos` : '(tamaños variables)'}
          <span className="mx-2">•</span>
          GWs: {gameweeks.join(', ')}
        </div>
      </div>

      {/* Info about scoring */}
      <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
        Equipos clasificados por puntos FPL totales en las jornadas {gameweeks.join(', ')}.
        Los 2 primeros de cada grupo avanzan a eliminatorias.
      </div>

      {/* Groups Display */}
      {selectedGroup && groups.length > 0 && (
        <Tabs value={selectedGroup} onValueChange={setSelectedGroup} className="w-full">
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${Math.min(groups.length, 8)}, 1fr)` }}>
            {groups.map(group => (
              <TabsTrigger key={group.id} value={group.id.toString()}>
                {group.group_name.replace('Group ', '')}
              </TabsTrigger>
            ))}
          </TabsList>

          {groups.map(group => {
            const standings = getStandings(group.id)

            return (
              <TabsContent key={group.id} value={group.id.toString()} className="space-y-4">
                {/* Standings Table */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Trophy className="h-4 w-4" />
                      {group.group_name} - Clasificación
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>Equipo</TableHead>
                          <TableHead className="text-right w-24">Puntos</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {standings.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                              Esperando datos de jornada...
                            </TableCell>
                          </TableRow>
                        ) : (
                          standings.map((standing, idx) => {
                            const team = teamMap[standing.teamId]
                            const isQualifying = idx < 2

                            return (
                              <TableRow
                                key={standing.teamId}
                                className={isQualifying ? 'bg-green-50 dark:bg-green-950/20' : ''}
                              >
                                <TableCell className="font-medium">
                                  <span className={isQualifying ? 'text-green-600 font-bold' : ''}>
                                    {standing.position}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <p className="font-medium text-sm">{team?.entry_name || 'Desconocido'}</p>
                                    <p className="text-xs text-muted-foreground">{team?.player_name}</p>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <span className="font-bold text-lg">{standing.totalPoints}</span>
                                </TableCell>
                              </TableRow>
                            )
                          })
                        )}
                      </TableBody>
                    </Table>
                    {standings.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        <span className="inline-block w-3 h-3 bg-green-100 dark:bg-green-950/20 rounded mr-1" />
                        Posiciones de clasificación (Top 2 avanzan)
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )
          })}
        </Tabs>
      )}

      {/* All Groups Summary View */}
      {groups.length > 2 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Resumen de Todos los Grupos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {groups.map(group => {
                const standings = getStandings(group.id)
                return (
                  <div key={group.id} className="p-3 rounded-lg border">
                    <h4 className="font-medium mb-2">{group.group_name}</h4>
                    <div className="space-y-1 text-sm">
                      {standings.slice(0, 2).map((standing) => {
                        const team = teamMap[standing.teamId]
                        return (
                          <div
                            key={standing.teamId}
                            className="flex items-center justify-between bg-green-50 dark:bg-green-950/20 px-2 py-1 rounded"
                          >
                            <span className="truncate">{team?.entry_name}</span>
                            <Badge variant="outline" className="ml-2 font-bold">{standing.totalPoints}</Badge>
                          </div>
                        )
                      })}
                      {standings.slice(2).map((standing) => {
                        const team = teamMap[standing.teamId]
                        return (
                          <div
                            key={standing.teamId}
                            className="flex items-center justify-between text-muted-foreground px-2 py-1"
                          >
                            <span className="truncate">{team?.entry_name}</span>
                            <Badge variant="outline" className="ml-2">{standing.totalPoints}</Badge>
                          </div>
                        )
                      })}
                      {standings.length === 0 && (
                        <div className="text-center text-muted-foreground py-2 text-xs">
                          Esperando datos...
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
