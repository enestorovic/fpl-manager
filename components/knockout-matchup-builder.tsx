"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Trophy,
  Users,
  Plus,
  X,
  AlertCircle,
  Check,
  Shuffle
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import type { Team, TournamentGroup } from "@/lib/supabase"
import { getKnockoutRoundName, getKnockoutRoundCount } from "@/lib/tournament-utils"
import type { GroupTeamStanding } from "@/components/group-stage-viewer"

interface QualifyingTeam {
  teamId: number
  team: Team
  groupId: number
  groupName: string
  position: number  // 1 = winner, 2 = runner-up
  totalPoints: number
}

interface KnockoutMatch {
  id: string
  team1: QualifyingTeam | null
  team2: QualifyingTeam | null
}

interface KnockoutMatchupBuilderProps {
  tournamentId: number
  groups: TournamentGroup[]
  groupStandings: Map<number, GroupTeamStanding[]>
  teamMap: Map<number, Team>
  groupStageGameweeks: number[]  // Used to exclude from knockout selection
  onComplete: () => void
  onCancel: () => void
}

export function KnockoutMatchupBuilder({
  tournamentId,
  groups,
  groupStandings,
  teamMap,
  groupStageGameweeks,
  onComplete,
  onCancel
}: KnockoutMatchupBuilderProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedKnockoutGameweeks, setSelectedKnockoutGameweeks] = useState<number[]>([])
  const availableGameweeks = Array.from({ length: 38 }, (_, i) => i + 1)
    .filter(gw => !groupStageGameweeks.includes(gw))

  // Get all qualifying teams (top 2 from each group)
  const qualifyingTeams: QualifyingTeam[] = useMemo(() => {
    const teams: QualifyingTeam[] = []

    groups.forEach(group => {
      const standings = groupStandings.get(group.id) || []
      // Top 2 qualify
      standings.slice(0, 2).forEach((standing, idx) => {
        const team = teamMap.get(standing.teamId)
        if (team) {
          teams.push({
            teamId: standing.teamId,
            team,
            groupId: group.id,
            groupName: group.group_name,
            position: idx + 1,
            totalPoints: standing.totalPoints
          })
        }
      })
    })

    return teams
  }, [groups, groupStandings, teamMap])

  // Calculate number of first-round matches
  const numFirstRoundMatches = Math.ceil(qualifyingTeams.length / 2)
  const numKnockoutRounds = getKnockoutRoundCount(qualifyingTeams.length)
  const firstRoundName = getKnockoutRoundName(qualifyingTeams.length, 1)

  // Initialize matches state
  const [matches, setMatches] = useState<KnockoutMatch[]>(() => {
    return Array.from({ length: numFirstRoundMatches }, (_, i) => ({
      id: `match_${i + 1}`,
      team1: null,
      team2: null
    }))
  })

  // Get assigned team IDs
  const assignedTeamIds = useMemo(() => {
    const ids = new Set<number>()
    matches.forEach(match => {
      if (match.team1) ids.add(match.team1.teamId)
      if (match.team2) ids.add(match.team2.teamId)
    })
    return ids
  }, [matches])

  // Get available teams
  const availableTeams = useMemo(() => {
    return qualifyingTeams.filter(t => !assignedTeamIds.has(t.teamId))
  }, [qualifyingTeams, assignedTeamIds])

  // Assign team to match slot
  const assignTeam = (matchId: string, slot: 'team1' | 'team2', teamId: number) => {
    const team = qualifyingTeams.find(t => t.teamId === teamId)
    if (!team) return

    setMatches(prev => prev.map(match => {
      if (match.id === matchId) {
        return { ...match, [slot]: team }
      }
      return match
    }))
  }

  // Remove team from match slot
  const removeTeam = (matchId: string, slot: 'team1' | 'team2') => {
    setMatches(prev => prev.map(match => {
      if (match.id === matchId) {
        return { ...match, [slot]: null }
      }
      return match
    }))
  }

  // Random matchup - pair winners with runners-up from different groups
  const generateRandomMatchups = () => {
    const winners = qualifyingTeams.filter(t => t.position === 1)
    const runnersUp = qualifyingTeams.filter(t => t.position === 2)

    // Shuffle both arrays
    const shuffledWinners = [...winners].sort(() => Math.random() - 0.5)
    const shuffledRunnersUp = [...runnersUp].sort(() => Math.random() - 0.5)

    const newMatches: KnockoutMatch[] = []

    // Try to pair winners with runners-up from different groups
    const usedRunnersUp = new Set<number>()

    shuffledWinners.forEach((winner, i) => {
      // Find a runner-up from a different group
      let opponent = shuffledRunnersUp.find(
        ru => ru.groupId !== winner.groupId && !usedRunnersUp.has(ru.teamId)
      )

      // If no different-group runner-up available, take any available
      if (!opponent) {
        opponent = shuffledRunnersUp.find(ru => !usedRunnersUp.has(ru.teamId))
      }

      if (opponent) {
        usedRunnersUp.add(opponent.teamId)
        newMatches.push({
          id: `match_${i + 1}`,
          team1: winner,
          team2: opponent
        })
      }
    })

    // Handle any remaining teams (odd numbers, etc.)
    const remainingTeams = qualifyingTeams.filter(
      t => !newMatches.some(m => m.team1?.teamId === t.teamId || m.team2?.teamId === t.teamId)
    )

    while (remainingTeams.length >= 2 && newMatches.length < numFirstRoundMatches) {
      const team1 = remainingTeams.shift()!
      const team2 = remainingTeams.shift()!
      newMatches.push({
        id: `match_${newMatches.length + 1}`,
        team1,
        team2
      })
    }

    // Fill remaining empty match slots
    while (newMatches.length < numFirstRoundMatches) {
      newMatches.push({
        id: `match_${newMatches.length + 1}`,
        team1: null,
        team2: null
      })
    }

    setMatches(newMatches)
  }

  // Clear all matchups
  const clearAllMatchups = () => {
    setMatches(Array.from({ length: numFirstRoundMatches }, (_, i) => ({
      id: `match_${i + 1}`,
      team1: null,
      team2: null
    })))
  }

  // Toggle knockout gameweek selection
  const toggleKnockoutGameweek = (gw: number) => {
    setSelectedKnockoutGameweeks(prev =>
      prev.includes(gw)
        ? prev.filter(g => g !== gw)
        : [...prev, gw].sort((a, b) => a - b)
    )
  }

  // Validate matchups
  const validateMatchups = (): string | null => {
    if (selectedKnockoutGameweeks.length < numKnockoutRounds) {
      return `Select at least ${numKnockoutRounds} gameweeks for knockout rounds (one per round).`
    }

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i]
      if (!match.team1 || !match.team2) {
        return `Match ${i + 1} is incomplete. Please assign both teams.`
      }
    }

    if (assignedTeamIds.size !== qualifyingTeams.length) {
      return `Not all qualifying teams are assigned. ${qualifyingTeams.length - assignedTeamIds.size} remaining.`
    }

    return null
  }

  // Create knockout matches in database
  const handleCreateKnockout = async () => {
    const validationError = validateMatchups()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Create first-round knockout matches
      const knockoutMatchesToCreate = matches.map((match, idx) => ({
        tournament_id: tournamentId,
        round_name: firstRoundName,
        round_order: 1,
        match_order: idx + 1,
        team1_id: match.team1!.teamId,
        team2_id: match.team2!.teamId,
        winner_id: null,
        team1_score: 0,
        team2_score: 0,
        gameweeks: selectedKnockoutGameweeks.length > 0 ? [selectedKnockoutGameweeks[0]] : [],
        status: 'pending',
        group_id: null,
        match_type: 'knockout',
        matchday: null,
        team1_from_match: null,
        team2_from_match: null
      }))

      const { data: firstRoundMatches, error: firstRoundError } = await supabase
        .from('tournament_matches')
        .insert(knockoutMatchesToCreate)
        .select()

      if (firstRoundError) throw firstRoundError

      // Create subsequent knockout rounds (empty, to be filled as tournament progresses)
      let currentRoundMatches = numFirstRoundMatches
      let currentRound = 2

      while (currentRoundMatches > 1) {
        const nextRoundMatchCount = Math.ceil(currentRoundMatches / 2)
        const roundName = getKnockoutRoundName(qualifyingTeams.length, currentRound)
        const roundGameweek = selectedKnockoutGameweeks[currentRound - 1] || selectedKnockoutGameweeks[selectedKnockoutGameweeks.length - 1]

        const roundMatches = Array.from({ length: nextRoundMatchCount }, (_, idx) => ({
          tournament_id: tournamentId,
          round_name: roundName,
          round_order: currentRound,
          match_order: idx + 1,
          team1_id: null,
          team2_id: null,
          winner_id: null,
          team1_score: 0,
          team2_score: 0,
          gameweeks: [roundGameweek],
          status: 'pending',
          group_id: null,
          match_type: 'knockout',
          matchday: null,
          team1_from_match: null,
          team2_from_match: null
        }))

        const { error: roundError } = await supabase
          .from('tournament_matches')
          .insert(roundMatches)

        if (roundError) throw roundError

        currentRoundMatches = nextRoundMatchCount
        currentRound++
      }

      // Update tournament with knockout gameweeks and group stage status
      await supabase
        .from('tournaments')
        .update({
          group_stage_status: 'completed',
          knockout_gameweeks: selectedKnockoutGameweeks,
          gameweeks: [...groupStageGameweeks, ...selectedKnockoutGameweeks],
          updated_at: new Date().toISOString()
        })
        .eq('id', tournamentId)

      onComplete()
    } catch (error) {
      console.error('Error creating knockout matches:', error)
      setError(error instanceof Error ? error.message : 'Failed to create knockout bracket')
    } finally {
      setLoading(false)
    }
  }

  // Get team display color based on group
  const getGroupColor = (groupName: string) => {
    const colors: Record<string, string> = {
      'Group A': 'bg-blue-100 text-blue-800 border-blue-200',
      'Group B': 'bg-green-100 text-green-800 border-green-200',
      'Group C': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Group D': 'bg-purple-100 text-purple-800 border-purple-200',
      'Group E': 'bg-pink-100 text-pink-800 border-pink-200',
      'Group F': 'bg-orange-100 text-orange-800 border-orange-200',
      'Group G': 'bg-cyan-100 text-cyan-800 border-cyan-200',
      'Group H': 'bg-red-100 text-red-800 border-red-200',
    }
    return colors[groupName] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Create Knockout Matchups
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Pair up the qualifying teams for the {firstRoundName}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Summary */}
          <div className="flex items-center gap-4 flex-wrap">
            <Badge variant="outline">
              {qualifyingTeams.length} teams qualified
            </Badge>
            <Badge variant="outline">
              {numFirstRoundMatches} {firstRoundName} matches
            </Badge>
            <Badge variant="outline">
              {numKnockoutRounds} knockout rounds
            </Badge>
          </div>

          {/* Knockout Gameweeks Selection */}
          <div className="p-4 border rounded-lg bg-muted/30">
            <h3 className="font-medium mb-2">Knockout Gameweeks *</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Select {numKnockoutRounds} gameweeks (one per round: {numKnockoutRounds > 1 ? `${firstRoundName}, ` : ''}{numKnockoutRounds > 2 ? 'Quarter-finals, ' : ''}{numKnockoutRounds > 3 ? 'Semi-finals, ' : ''}Final)
            </p>
            <div className="flex flex-wrap gap-2">
              {availableGameweeks.map(gw => (
                <Button
                  key={gw}
                  variant={selectedKnockoutGameweeks.includes(gw) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleKnockoutGameweek(gw)}
                  type="button"
                  className="w-10 h-10"
                >
                  {gw}
                </Button>
              ))}
            </div>
            {selectedKnockoutGameweeks.length > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                Selected: {selectedKnockoutGameweeks.join(', ')} ({selectedKnockoutGameweeks.length}/{numKnockoutRounds} needed)
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={generateRandomMatchups}>
              <Shuffle className="h-4 w-4 mr-2" />
              Random Draw (Winners vs Runners-up)
            </Button>
            <Button variant="ghost" size="sm" onClick={clearAllMatchups}>
              Clear All
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Available Teams */}
            <div>
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Qualifying Teams ({availableTeams.length} available)
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto border rounded p-3">
                {/* Group Winners */}
                <div className="mb-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2 uppercase">Group Winners</p>
                  {qualifyingTeams.filter(t => t.position === 1).map(team => {
                    const isAssigned = assignedTeamIds.has(team.teamId)
                    return (
                      <div
                        key={team.teamId}
                        className={`flex items-center justify-between p-2 rounded mb-1 ${
                          isAssigned ? 'opacity-50 bg-muted' : 'bg-muted/50 hover:bg-muted'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-xs ${getGroupColor(team.groupName)}`}>
                            {team.groupName.replace('Group ', '')}1
                          </Badge>
                          <div>
                            <p className="font-medium text-sm">{team.team.entry_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {team.totalPoints} pts
                            </p>
                          </div>
                        </div>
                        {isAssigned && <Check className="h-4 w-4 text-green-500" />}
                      </div>
                    )
                  })}
                </div>

                {/* Runners-up */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2 uppercase">Runners-up</p>
                  {qualifyingTeams.filter(t => t.position === 2).map(team => {
                    const isAssigned = assignedTeamIds.has(team.teamId)
                    return (
                      <div
                        key={team.teamId}
                        className={`flex items-center justify-between p-2 rounded mb-1 ${
                          isAssigned ? 'opacity-50 bg-muted' : 'bg-muted/50 hover:bg-muted'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-xs ${getGroupColor(team.groupName)}`}>
                            {team.groupName.replace('Group ', '')}2
                          </Badge>
                          <div>
                            <p className="font-medium text-sm">{team.team.entry_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {team.totalPoints} pts
                            </p>
                          </div>
                        </div>
                        {isAssigned && <Check className="h-4 w-4 text-green-500" />}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Matches */}
            <div>
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                {firstRoundName} Matches
              </h3>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {matches.map((match, idx) => (
                  <div key={match.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium">Match {idx + 1}</span>
                      <Badge variant="outline" className="text-xs">
                        GW {selectedKnockoutGameweeks[0] || '?'}
                      </Badge>
                    </div>

                    {/* Team 1 */}
                    <div className="mb-2">
                      {match.team1 ? (
                        <div className={`flex items-center justify-between p-2 rounded ${getGroupColor(match.team1.groupName)}`}>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {match.team1.groupName.replace('Group ', '')}{match.team1.position}
                            </Badge>
                            <span className="font-medium text-sm">{match.team1.team.entry_name}</span>
                          </div>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => removeTeam(match.id, 'team1')}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <Select onValueChange={(v) => assignTeam(match.id, 'team1', parseInt(v))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select team..." />
                          </SelectTrigger>
                          <SelectContent>
                            {availableTeams.map(team => (
                              <SelectItem key={team.teamId} value={team.teamId.toString()}>
                                {team.groupName.replace('Group ', '')}{team.position} - {team.team.entry_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    <div className="text-center text-xs text-muted-foreground my-1">vs</div>

                    {/* Team 2 */}
                    <div>
                      {match.team2 ? (
                        <div className={`flex items-center justify-between p-2 rounded ${getGroupColor(match.team2.groupName)}`}>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {match.team2.groupName.replace('Group ', '')}{match.team2.position}
                            </Badge>
                            <span className="font-medium text-sm">{match.team2.team.entry_name}</span>
                          </div>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => removeTeam(match.id, 'team2')}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <Select onValueChange={(v) => assignTeam(match.id, 'team2', parseInt(v))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select team..." />
                          </SelectTrigger>
                          <SelectContent>
                            {availableTeams.map(team => (
                              <SelectItem key={team.teamId} value={team.teamId.toString()}>
                                {team.groupName.replace('Group ', '')}{team.position} - {team.team.entry_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Assigned:</span>
            <Badge variant={assignedTeamIds.size === qualifyingTeams.length ? "default" : "outline"}>
              {assignedTeamIds.size} / {qualifyingTeams.length}
            </Badge>
            {assignedTeamIds.size === qualifyingTeams.length && (
              <span className="text-green-600 text-xs">All teams assigned</span>
            )}
          </div>

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
            <div className="flex-1" />
            <Button
              onClick={handleCreateKnockout}
              disabled={loading || assignedTeamIds.size !== qualifyingTeams.length}
            >
              {loading ? 'Creating...' : 'Create Knockout Bracket'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
