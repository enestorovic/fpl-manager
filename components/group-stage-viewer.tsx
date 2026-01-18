"use client"

import { useMemo, useState } from "react"
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
import { Users, Trophy, CheckCircle2, Clock } from "lucide-react"
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
  // Standings map: group_id -> array of standings sorted by position
  groupStandings: Map<number, GroupTeamStanding[]>
  // Whether group stage is complete (all gameweeks have data)
  isComplete: boolean
  // Group stage gameweeks
  gameweeks: number[]
}

export function GroupStageViewer({
  groups,
  participants,
  groupStandings,
  isComplete,
  gameweeks
}: GroupStageViewerProps) {
  // Get team info by ID
  const teamMap = useMemo(() => {
    const map = new Map<number, Team>()
    participants.forEach(p => {
      if (p.teams) {
        map.set(p.team_id, p.teams)
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
    // Check if all same size
    const allSame = counts.every(c => c === counts[0])
    return allSame ? counts[0] : null // null means variable
  }, [groups, participants])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Group Stage</h2>
          {isComplete ? (
            <Badge variant="default" className="bg-green-500">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Complete
            </Badge>
          ) : (
            <Badge variant="outline">
              <Clock className="h-3 w-3 mr-1" />
              In Progress
            </Badge>
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          {groups.length} groups {teamsPerGroupDisplay ? `× ${teamsPerGroupDisplay} teams` : '(variable sizes)'}
          <span className="mx-2">•</span>
          GWs: {gameweeks.join(', ')}
        </div>
      </div>

      {/* Info about scoring */}
      <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
        Teams are ranked by total FPL points across gameweeks {gameweeks.join(', ')}.
        Top 2 from each group advance to knockout.
      </div>

      {/* Groups Display */}
      <Tabs defaultValue={groups[0]?.id.toString()} className="w-full">
        <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${Math.min(groups.length, 8)}, 1fr)` }}>
          {groups.map(group => (
            <TabsTrigger key={group.id} value={group.id.toString()}>
              {group.group_name.replace('Group ', '')}
            </TabsTrigger>
          ))}
        </TabsList>

        {groups.map(group => {
          const standings = groupStandings.get(group.id) || []

          return (
            <TabsContent key={group.id} value={group.id.toString()} className="space-y-4">
              {/* Standings Table */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Trophy className="h-4 w-4" />
                    {group.group_name} Standings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Team</TableHead>
                        <TableHead className="text-right w-24">Total Points</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {standings.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                            Waiting for gameweek data...
                          </TableCell>
                        </TableRow>
                      ) : (
                        standings.map((standing, idx) => {
                          const team = teamMap.get(standing.teamId)
                          const isQualifying = idx < 2 // Top 2 qualify

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
                                  <p className="font-medium text-sm">{team?.entry_name || 'Unknown'}</p>
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
                      Qualifying positions (Top 2 advance)
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )
        })}
      </Tabs>

      {/* All Groups Summary View */}
      {groups.length > 2 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">All Groups Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {groups.map(group => {
                const standings = groupStandings.get(group.id) || []
                return (
                  <div key={group.id} className="p-3 rounded-lg border">
                    <h4 className="font-medium mb-2">{group.group_name}</h4>
                    <div className="space-y-1 text-sm">
                      {standings.slice(0, 2).map((standing, idx) => {
                        const team = teamMap.get(standing.teamId)
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
                        const team = teamMap.get(standing.teamId)
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
                          Waiting for data...
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
