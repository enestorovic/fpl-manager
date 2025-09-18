"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
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
  Calendar,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Users
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import type { Team } from "@/lib/supabase"

interface TournamentCreateFormProps {
  onCancel: () => void
  onSuccess: () => void
}

interface BracketMatch {
  id: string
  round: number
  roundName: string
  match: number
  team1: number | null
  team2: number | null
  isFirstRound: boolean
}

export function TournamentCreateForm({ onCancel, onSuccess }: TournamentCreateFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [availableGameweeks] = useState(Array.from({ length: 38 }, (_, i) => i + 1))
  const [currentStep, setCurrentStep] = useState(1)
  const [generatedBracket, setGeneratedBracket] = useState<BracketMatch[]>([])

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'knockout' as 'knockout', // Start with knockout only for now
    totalTeams: 8,
    matchGameweeks: [] as number[], // Simplified: just the gameweeks used for matches
    bracketAssignments: {} as Record<string, number> // matchPosition -> teamId
  })

  useEffect(() => {
    fetchTeams()
  }, [])

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .order('rank', { ascending: true })

      if (error) throw error
      setTeams(data || [])
    } catch (error) {
      console.error('Error fetching teams:', error)
      setError('Failed to load teams')
    }
  }

  const generateBracket = () => {
    const { totalTeams } = formData
    const rounds = Math.ceil(Math.log2(totalTeams))
    const bracket: BracketMatch[] = []

    let currentRoundMatches = Math.floor(totalTeams / 2)

    for (let round = 1; round <= rounds; round++) {
      const roundName = getRoundName(round, rounds)

      for (let match = 0; match < currentRoundMatches; match++) {
        bracket.push({
          id: `round_${round}_match_${match}`,
          round,
          roundName,
          match,
          team1: null,
          team2: null,
          isFirstRound: round === 1
        })
      }

      currentRoundMatches = Math.ceil(currentRoundMatches / 2)
    }

    setGeneratedBracket(bracket)
  }

  const getRoundName = (round: number, totalRounds: number): string => {
    if (round === totalRounds) return 'Final'
    if (round === totalRounds - 1) return 'Semi-Final'
    if (round === totalRounds - 2) return 'Quarter-Final'
    if (round === totalRounds - 3) return 'Round of 16'
    return `Round ${round}`
  }

  const handleMatchGameweekToggle = (gameweek: number) => {
    setFormData(prev => ({
      ...prev,
      matchGameweeks: prev.matchGameweeks.includes(gameweek)
        ? prev.matchGameweeks.filter(gw => gw !== gameweek)
        : [...prev.matchGameweeks, gameweek].sort((a, b) => a - b)
    }))
  }

  const validateStep1 = (): string | null => {
    if (!formData.name.trim()) return 'Tournament name is required'
    if (formData.matchGameweeks.length === 0) return 'At least one gameweek must be selected for matches'
    if (formData.totalTeams < 2 || formData.totalTeams > 32) return 'Total teams must be between 2 and 32'
    if (!isPowerOfTwo(formData.totalTeams)) return 'Total teams must be a power of 2 (2, 4, 8, 16, 32)'
    return null
  }

  const validateStep2 = (): string | null => {
    const firstRoundMatches = generatedBracket.filter(m => m.isFirstRound)
    const assignedPositions = Object.keys(formData.bracketAssignments).length
    const requiredPositions = firstRoundMatches.length * 2 // 2 teams per match

    if (assignedPositions !== requiredPositions) {
      return `Please assign all ${requiredPositions} teams to bracket positions`
    }

    const assignedTeams = Object.values(formData.bracketAssignments)
    const uniqueTeams = new Set(assignedTeams)
    if (uniqueTeams.size !== assignedTeams.length) {
      return 'Each team can only be assigned once'
    }

    return null
  }

  const isPowerOfTwo = (n: number): boolean => {
    return n > 0 && (n & (n - 1)) === 0
  }

  const handleNext = () => {
    const validationError = validateStep1()
    if (validationError) {
      setError(validationError)
      return
    }

    generateBracket()
    setError(null)
    setCurrentStep(2)
  }

  const handleBack = () => {
    setCurrentStep(1)
    setError(null)
  }

  const assignTeamToPosition = (position: string, teamId: number) => {
    setFormData(prev => ({
      ...prev,
      bracketAssignments: {
        ...prev.bracketAssignments,
        [position]: teamId
      }
    }))
  }

  const removeTeamFromPosition = (position: string) => {
    setFormData(prev => {
      const newAssignments = { ...prev.bracketAssignments }
      delete newAssignments[position]
      return {
        ...prev,
        bracketAssignments: newAssignments
      }
    })
  }

  const getAvailableTeams = () => {
    const assignedTeamIds = new Set(Object.values(formData.bracketAssignments))
    return teams.filter(team => !assignedTeamIds.has(team.id))
  }

  const getTeamById = (teamId: number) => {
    return teams.find(team => team.id === teamId)
  }

  const handleSubmit = async () => {
    const validationError = validateStep2()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Create tournament
      const { data: tournament, error: tournamentError } = await supabase
        .from('tournaments')
        .insert({
          name: formData.name,
          description: formData.description || null,
          type: formData.type,
          gameweeks: formData.matchGameweeks, // Use same gameweeks for both
          knockout_gameweeks: formData.matchGameweeks, // Use same gameweeks for both
          knockout_legs: 1,
          created_by: 'admin',
          status: 'draft',
          num_groups: null,
          teams_per_group: null,
          teams_advance_per_group: 2,
          include_best_third: false
        })
        .select()
        .single()

      if (tournamentError) throw tournamentError

      // Create participants
      const selectedTeamIds = Object.values(formData.bracketAssignments)
      const participants = selectedTeamIds.map(teamId => ({
        tournament_id: tournament.id,
        team_id: teamId,
        group_id: null
      }))

      const { error: participantsError } = await supabase
        .from('tournament_participants')
        .insert(participants)

      if (participantsError) throw participantsError

      // Create bracket matches
      const matchesToCreate = []

      for (const match of generatedBracket) {
        // Assign gameweek based on round (round 1 = gameweek[0], round 2 = gameweek[1], etc.)
        const gameweekIndex = match.round - 1
        const matchGameweek = formData.matchGameweeks[gameweekIndex % formData.matchGameweeks.length]

        if (match.isFirstRound) {
          // First round matches get teams assigned
          const team1Position = `${match.id}_team1`
          const team2Position = `${match.id}_team2`

          matchesToCreate.push({
            tournament_id: tournament.id,
            round_name: match.roundName,
            round_order: match.round,
            match_order: match.match,
            team1_id: formData.bracketAssignments[team1Position] || null,
            team2_id: formData.bracketAssignments[team2Position] || null,
            winner_id: null,
            team1_score: 0,
            team2_score: 0,
            gameweeks: [matchGameweek],
            status: 'pending',
            team1_from_match: null,
            team2_from_match: null
          })
        } else {
          // Later rounds will be populated when previous rounds complete
          matchesToCreate.push({
            tournament_id: tournament.id,
            round_name: match.roundName,
            round_order: match.round,
            match_order: match.match,
            team1_id: null,
            team2_id: null,
            winner_id: null,
            team1_score: 0,
            team2_score: 0,
            gameweeks: [matchGameweek],
            status: 'pending',
            team1_from_match: null,
            team2_from_match: null
          })
        }
      }

      const { error: matchesError } = await supabase
        .from('tournament_matches')
        .insert(matchesToCreate)

      if (matchesError) throw matchesError

      onSuccess()
    } catch (error) {
      console.error('Error creating tournament:', error)
      setError(error instanceof Error ? error.message : 'Failed to create tournament')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Create Knockout Tournament
            <Badge variant="outline" className="ml-auto">
              Step {currentStep} of 2
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {currentStep === 1 && (
            <>
              {/* Step 1: Basic Tournament Info */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Tournament Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter tournament name..."
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Optional description..."
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="totalTeams">Total Number of Teams *</Label>
                  <Select
                    value={formData.totalTeams.toString()}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, totalTeams: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2 teams</SelectItem>
                      <SelectItem value="4">4 teams</SelectItem>
                      <SelectItem value="8">8 teams</SelectItem>
                      <SelectItem value="16">16 teams</SelectItem>
                      <SelectItem value="32">32 teams</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Match Gameweeks */}
              <div>
                <Label className="flex items-center gap-2 mb-3">
                  <Calendar className="h-4 w-4" />
                  Match Gameweeks * (gameweeks used to determine match winners)
                </Label>
                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
                  {availableGameweeks.map(gw => (
                    <Button
                      key={gw}
                      variant={formData.matchGameweeks.includes(gw) ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleMatchGameweekToggle(gw)}
                      type="button"
                    >
                      {gw}
                    </Button>
                  ))}
                </div>
                {formData.matchGameweeks.length > 0 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Selected: {formData.matchGameweeks.join(', ')}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  💡 Tip: Select multiple gameweeks to make matches more decisive (e.g., GW 10, 11, 12 for a 3-gameweek tournament)
                </p>
              </div>
            </>
          )}

          {currentStep === 2 && (
            <>
              {/* Step 2: Bracket Assignment */}
              <div>
                <h3 className="text-lg font-medium mb-4">Assign Teams to Bracket</h3>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Available Teams */}
                  <div>
                    <Label className="text-base font-medium mb-3 block">Available Teams</Label>
                    <div className="space-y-2 max-h-96 overflow-y-auto border rounded p-3">
                      {getAvailableTeams().map(team => (
                        <div
                          key={team.id}
                          className="flex items-center justify-between p-2 bg-muted/50 rounded hover:bg-muted"
                        >
                          <div>
                            <p className="font-medium text-sm">{team.entry_name}</p>
                            <p className="text-xs text-muted-foreground">{team.player_name}</p>
                          </div>
                          <Badge variant="outline">#{team.rank}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* First Round Matches */}
                  <div>
                    <Label className="text-base font-medium mb-3 block">First Round Matches</Label>
                    <div className="space-y-4">
                      {generatedBracket.filter(m => m.isFirstRound).map((match, index) => {
                        const isUpperBracket = index < Math.ceil(generatedBracket.filter(m => m.isFirstRound).length / 2)
                        return (
                          <div key={match.id} className={`border rounded p-4 ${isUpperBracket ? 'border-blue-200 bg-blue-50/30' : 'border-green-200 bg-green-50/30'}`}>
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium">Match {match.match + 1}</h4>
                              <Badge variant="outline" className={isUpperBracket ? 'text-blue-600' : 'text-green-600'}>
                                {isUpperBracket ? 'Upper Bracket' : 'Lower Bracket'}
                              </Badge>
                            </div>

                            {/* Team 1 */}
                            <div className="mb-2">
                              <Label className="text-sm text-muted-foreground">Team 1</Label>
                              <Select
                                value={formData.bracketAssignments[`${match.id}_team1`]?.toString() || undefined}
                                onValueChange={(value) => {
                                  if (value) {
                                    assignTeamToPosition(`${match.id}_team1`, parseInt(value))
                                  }
                                }}
                              >
                                <SelectTrigger className="mt-1">
                                  <SelectValue placeholder="Select team..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {[...getAvailableTeams(),
                                    ...(formData.bracketAssignments[`${match.id}_team1`]
                                      ? [getTeamById(formData.bracketAssignments[`${match.id}_team1`])]
                                      : [])
                                  ].filter(Boolean).map(team => (
                                    <SelectItem key={team!.id} value={team!.id.toString()}>
                                      {team!.entry_name} (#{team!.rank})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {formData.bracketAssignments[`${match.id}_team1`] && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeTeamFromPosition(`${match.id}_team1`)}
                                  className="mt-1 text-xs"
                                >
                                  Clear
                                </Button>
                              )}
                            </div>

                            <div className="text-center text-sm text-muted-foreground my-2">vs</div>

                            {/* Team 2 */}
                            <div>
                              <Label className="text-sm text-muted-foreground">Team 2</Label>
                              <Select
                                value={formData.bracketAssignments[`${match.id}_team2`]?.toString() || undefined}
                                onValueChange={(value) => {
                                  if (value) {
                                    assignTeamToPosition(`${match.id}_team2`, parseInt(value))
                                  }
                                }}
                              >
                                <SelectTrigger className="mt-1">
                                  <SelectValue placeholder="Select team..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {[...getAvailableTeams(),
                                    ...(formData.bracketAssignments[`${match.id}_team2`]
                                      ? [getTeamById(formData.bracketAssignments[`${match.id}_team2`])]
                                      : [])
                                  ].filter(Boolean).map(team => (
                                    <SelectItem key={team!.id} value={team!.id.toString()}>
                                      {team!.entry_name} (#{team!.rank})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {formData.bracketAssignments[`${match.id}_team2`] && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeTeamFromPosition(`${match.id}_team2`)}
                                  className="mt-1 text-xs"
                                >
                                  Clear
                                </Button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Tournament Bracket Preview */}
                <div className="mt-6 p-4 bg-muted/30 rounded">
                  <h4 className="font-medium mb-3">Tournament Structure</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
                    {Array.from(new Set(generatedBracket.map(m => m.round))).map(round => (
                      <div key={round}>
                        <p className="font-medium">
                          {getRoundName(round, Math.max(...generatedBracket.map(m => m.round)))}
                        </p>
                        <p className="text-muted-foreground">
                          {generatedBracket.filter(m => m.round === round).length} matches
                        </p>
                        <p className="text-xs text-muted-foreground">
                          GW {formData.matchGameweeks[round - 1] || formData.matchGameweeks[(round - 1) % formData.matchGameweeks.length]}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Bracket Side Indicators */}
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="font-medium text-blue-600 mb-2">Upper Bracket</p>
                      {generatedBracket.filter(m => m.isFirstRound).slice(0, Math.ceil(generatedBracket.filter(m => m.isFirstRound).length / 2)).map(match => (
                        <div key={match.id} className="flex items-center justify-between p-1 bg-blue-50 rounded mb-1">
                          <span>Match {match.match + 1}</span>
                          <span className="text-muted-foreground">→ Upper Semi</span>
                        </div>
                      ))}
                    </div>
                    <div>
                      <p className="font-medium text-green-600 mb-2">Lower Bracket</p>
                      {generatedBracket.filter(m => m.isFirstRound).slice(Math.ceil(generatedBracket.filter(m => m.isFirstRound).length / 2)).map(match => (
                        <div key={match.id} className="flex items-center justify-between p-1 bg-green-50 rounded mb-1">
                          <span>Match {match.match + 1}</span>
                          <span className="text-muted-foreground">→ Lower Semi</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            {currentStep === 1 ? (
              <>
                <Button variant="outline" onClick={onCancel} disabled={loading}>
                  Cancel
                </Button>
                <Button onClick={handleNext} disabled={loading} className="ml-auto">
                  Next: Assign Teams
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={handleBack} disabled={loading}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button variant="outline" onClick={onCancel} disabled={loading}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={loading} className="ml-auto">
                  {loading ? 'Creating Tournament...' : 'Create Tournament'}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}