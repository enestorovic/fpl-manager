"use client"

import { useState, useEffect, useMemo } from "react"
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
  Globe,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Users,
  Shuffle,
  X,
  Trash2
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import type { Team } from "@/lib/supabase"
import { getGroupName } from "@/lib/tournament-utils"

interface WorldCupCreateFormProps {
  onCancel: () => void
  onSuccess: () => void
}

interface GroupConfig {
  id: string
  name: string
  size: number
  teamIds: number[]
}

export function WorldCupCreateForm({ onCancel, onSuccess }: WorldCupCreateFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [currentStep, setCurrentStep] = useState(1)
  const [availableGameweeks] = useState(Array.from({ length: 38 }, (_, i) => i + 1))

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    groups: [] as GroupConfig[],
    groupStageGameweeks: [] as number[]
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

  // Add a new group
  const addGroup = (size: number) => {
    const groupIndex = formData.groups.length
    const newGroup: GroupConfig = {
      id: `group_${Date.now()}`,
      name: getGroupName(groupIndex),
      size,
      teamIds: []
    }
    setFormData(prev => ({
      ...prev,
      groups: [...prev.groups, newGroup]
    }))
  }

  // Remove a group
  const removeGroup = (groupId: string) => {
    setFormData(prev => ({
      ...prev,
      groups: prev.groups.filter(g => g.id !== groupId).map((g, i) => ({
        ...g,
        name: getGroupName(i) // Re-name groups A, B, C...
      }))
    }))
  }

  // Calculate derived values
  const totalTeamsNeeded = formData.groups.reduce((sum, g) => sum + g.size, 0)
  const advancingTeams = formData.groups.length * 2

  // Get assigned team IDs
  const assignedTeamIds = useMemo(() => {
    const ids = new Set<number>()
    formData.groups.forEach(group => {
      group.teamIds.forEach(id => ids.add(id))
    })
    return ids
  }, [formData.groups])

  // Get available teams (not yet assigned)
  const availableTeams = useMemo(() => {
    return teams.filter(t => !assignedTeamIds.has(t.id))
  }, [teams, assignedTeamIds])

  // Assign team to group
  const assignTeamToGroup = (groupId: string, teamId: number) => {
    setFormData(prev => {
      const newGroups = prev.groups.map(g => {
        if (g.id === groupId && g.teamIds.length < g.size) {
          return { ...g, teamIds: [...g.teamIds, teamId] }
        }
        return g
      })
      return { ...prev, groups: newGroups }
    })
  }

  // Remove team from group
  const removeTeamFromGroup = (groupId: string, teamId: number) => {
    setFormData(prev => {
      const newGroups = prev.groups.map(g => {
        if (g.id === groupId) {
          return { ...g, teamIds: g.teamIds.filter(id => id !== teamId) }
        }
        return g
      })
      return { ...prev, groups: newGroups }
    })
  }

  // Random draw for all groups
  const performRandomDraw = () => {
    const shuffled = [...availableTeams, ...Array.from(assignedTeamIds).map(id => teams.find(t => t.id === id)!)]
      .sort(() => Math.random() - 0.5)

    let teamIndex = 0
    const newGroups = formData.groups.map(group => {
      const groupTeams = shuffled.slice(teamIndex, teamIndex + group.size)
      teamIndex += group.size
      return {
        ...group,
        teamIds: groupTeams.map(t => t.id)
      }
    })

    setFormData(prev => ({ ...prev, groups: newGroups }))
  }

  // Clear all assignments
  const clearAllAssignments = () => {
    setFormData(prev => ({
      ...prev,
      groups: prev.groups.map(g => ({ ...g, teamIds: [] }))
    }))
  }

  // Toggle gameweek selection
  const toggleGroupGameweek = (gw: number) => {
    setFormData(prev => ({
      ...prev,
      groupStageGameweeks: prev.groupStageGameweeks.includes(gw)
        ? prev.groupStageGameweeks.filter(g => g !== gw)
        : [...prev.groupStageGameweeks, gw].sort((a, b) => a - b)
    }))
  }

  // Validation functions
  const validateStep1 = (): string | null => {
    if (!formData.name.trim()) return 'Tournament name is required'
    if (formData.groups.length < 2) return 'At least 2 groups are required'
    if (totalTeamsNeeded > teams.length) return `Not enough teams available. Need ${totalTeamsNeeded}, have ${teams.length}`
    return null
  }

  const validateStep2 = (): string | null => {
    for (const group of formData.groups) {
      if (group.teamIds.length !== group.size) {
        return `${group.name} needs ${group.size} teams (has ${group.teamIds.length})`
      }
    }
    return null
  }

  const validateStep3 = (): string | null => {
    if (formData.groupStageGameweeks.length === 0) {
      return 'Select at least 1 gameweek for group stage'
    }
    return null
  }

  // Navigation
  const handleNext = () => {
    let validationError: string | null = null

    switch (currentStep) {
      case 1:
        validationError = validateStep1()
        break
      case 2:
        validationError = validateStep2()
        break
    }

    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    setCurrentStep(prev => prev + 1)
  }

  const handleBack = () => {
    setCurrentStep(prev => prev - 1)
    setError(null)
  }

  // Submit tournament
  const handleSubmit = async () => {
    const validationError = validateStep3()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // 1. Create tournament (knockout gameweeks will be set when building knockout matchups)
      const { data: tournament, error: tournamentError } = await supabase
        .from('tournaments')
        .insert({
          name: formData.name,
          description: formData.description || null,
          type: 'mixed',
          status: 'draft',
          gameweeks: formData.groupStageGameweeks, // Will be updated when knockout GWs are added
          num_groups: formData.groups.length,
          teams_per_group: null, // Variable sizes, so we don't set this
          teams_advance_per_group: 2,
          include_best_third: false,
          knockout_gameweeks: [], // Will be set when building knockout matchups
          knockout_legs: 1,
          knockout_seeding: null,
          group_stage_gameweeks: formData.groupStageGameweeks,
          group_stage_status: 'pending',
          created_by: 'admin'
        })
        .select()
        .single()

      if (tournamentError) throw tournamentError

      // 2. Create groups with their sizes
      const groupsToCreate = formData.groups.map((group, i) => ({
        tournament_id: tournament.id,
        group_name: group.name,
        group_order: i + 1
      }))

      const { data: createdGroups, error: groupsError } = await supabase
        .from('tournament_groups')
        .insert(groupsToCreate)
        .select()

      if (groupsError) throw groupsError

      // 3. Create participants
      const participantsToCreate: Array<{
        tournament_id: number
        team_id: number
        group_id: number
      }> = []

      formData.groups.forEach((group, groupIndex) => {
        const dbGroup = createdGroups?.find(g => g.group_order === groupIndex + 1)
        if (dbGroup) {
          group.teamIds.forEach(teamId => {
            participantsToCreate.push({
              tournament_id: tournament.id,
              team_id: teamId,
              group_id: dbGroup.id
            })
          })
        }
      })

      const { error: participantsError } = await supabase
        .from('tournament_participants')
        .insert(participantsToCreate)

      if (participantsError) throw participantsError

      // Note: No group matches created - group stage is based on total FPL points
      // across the group_stage_gameweeks, not head-to-head matches

      // 4. Create initial standings for all participants
      const standingsToCreate = participantsToCreate.map(p => ({
        tournament_id: tournament.id,
        team_id: p.team_id,
        group_id: p.group_id,
        matches_played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        points_for: 0,
        points_against: 0,
        tournament_points: 0,
        position: null,
        qualified: false
      }))

      const { error: standingsError } = await supabase
        .from('tournament_standings')
        .insert(standingsToCreate)

      if (standingsError) throw standingsError

      // Note: Knockout matches will be created manually after group stage completes

      onSuccess()
    } catch (error: any) {
      console.error('Error creating tournament:', error)
      // Handle Supabase errors which have a message property
      const errorMessage = error?.message || error?.error_description || JSON.stringify(error) || 'Failed to create tournament'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Get team by ID
  const getTeamById = (id: number) => teams.find(t => t.id === id)

  // Quick add preset groups
  const addPresetGroups = (count: number, size: number) => {
    const newGroups: GroupConfig[] = []
    const startIndex = formData.groups.length
    for (let i = 0; i < count; i++) {
      newGroups.push({
        id: `group_${Date.now()}_${i}`,
        name: getGroupName(startIndex + i),
        size,
        teamIds: []
      })
    }
    setFormData(prev => ({
      ...prev,
      groups: [...prev.groups, ...newGroups]
    }))
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Create World Cup Tournament
            <Badge variant="outline" className="ml-auto">
              Step {currentStep} of 3
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Basic Configuration + Group Setup */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Tournament Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., FPL World Cup 2024"
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
              </div>

              <Separator />

              {/* Group Configuration */}
              <div>
                <Label className="text-base font-medium mb-3 block">Groups Configuration *</Label>

                {/* Quick Add Buttons */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="text-sm text-muted-foreground mr-2">Quick add:</span>
                  <Button variant="outline" size="sm" onClick={() => addPresetGroups(4, 4)}>
                    4 groups of 4
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => addPresetGroups(6, 4)}>
                    6 groups of 4
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => addPresetGroups(8, 4)}>
                    8 groups of 4
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => addGroup(3)}>
                    +Group of 3
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => addGroup(4)}>
                    +Group of 4
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => addGroup(5)}>
                    +Group of 5
                  </Button>
                </div>

                {/* Groups List */}
                <div className="space-y-2">
                  {formData.groups.map((group, index) => (
                    <div key={group.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <span className="font-medium w-24">{group.name}</span>
                      <Badge variant="outline">{group.size} teams</Badge>
                      <div className="flex-1" />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeGroup(group.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  {formData.groups.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No groups added yet. Use the buttons above to add groups.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Tournament Summary */}
              {formData.groups.length > 0 && (
                <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                  <h4 className="font-medium">Tournament Structure</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Groups:</span>
                      <span className="ml-2 font-medium">{formData.groups.length}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total Teams:</span>
                      <span className="ml-2 font-medium">{totalTeamsNeeded}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Advancing Teams:</span>
                      <span className="ml-2 font-medium">{advancingTeams} (Top 2 per group)</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Knockout matchups and gameweeks will be set after group stage completes.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Team Assignment */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Assign Teams to Groups</h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={performRandomDraw}>
                    <Shuffle className="h-4 w-4 mr-2" />
                    Random Draw
                  </Button>
                  <Button variant="ghost" size="sm" onClick={clearAllAssignments}>
                    Clear All
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Available Teams */}
                <div>
                  <Label className="text-base font-medium mb-3 block">
                    Available Teams ({availableTeams.length})
                  </Label>
                  <div className="space-y-2 max-h-96 overflow-y-auto border rounded p-3">
                    {availableTeams.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        All teams assigned
                      </p>
                    ) : (
                      availableTeams.map(team => (
                        <div
                          key={team.id}
                          className="flex items-center justify-between p-2 bg-muted/50 rounded hover:bg-muted"
                        >
                          <div>
                            <p className="font-medium text-sm">{team.entry_name}</p>
                            <p className="text-xs text-muted-foreground">{team.player_name}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">#{team.rank}</Badge>
                            <Select onValueChange={(v) => assignTeamToGroup(v, team.id)}>
                              <SelectTrigger className="w-28 h-8">
                                <SelectValue placeholder="Add to" />
                              </SelectTrigger>
                              <SelectContent>
                                {formData.groups.map((group) => (
                                  <SelectItem
                                    key={group.id}
                                    value={group.id}
                                    disabled={group.teamIds.length >= group.size}
                                  >
                                    {group.name} ({group.teamIds.length}/{group.size})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Groups */}
                <div>
                  <Label className="text-base font-medium mb-3 block">Groups</Label>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {formData.groups.map((group) => (
                      <div key={group.id} className="border rounded p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{group.name}</h4>
                          <Badge variant={group.teamIds.length === group.size ? "default" : "outline"}>
                            {group.teamIds.length}/{group.size}
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          {group.teamIds.map(teamId => {
                            const team = getTeamById(teamId)
                            return (
                              <div key={teamId} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                                <span>{team?.entry_name || 'Unknown'}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => removeTeamFromGroup(group.id, teamId)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            )
                          })}
                          {group.teamIds.length < group.size && (
                            <div className="p-2 border-2 border-dashed border-muted-foreground/25 rounded text-sm text-muted-foreground text-center">
                              {group.size - group.teamIds.length} more needed
                            </div>
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
                <Badge variant={assignedTeamIds.size === totalTeamsNeeded ? "default" : "outline"}>
                  {assignedTeamIds.size} / {totalTeamsNeeded}
                </Badge>
              </div>
            </div>
          )}

          {/* Step 3: Gameweek Assignment */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-1">Group Stage Gameweeks</h3>
                <p className="text-sm text-muted-foreground">
                  Select which gameweeks to use for group stage scoring
                </p>
              </div>

              {/* Group Stage Gameweeks */}
              <div>
                <Label className="flex items-center gap-2 mb-3">
                  <Users className="h-4 w-4" />
                  Gameweeks *
                </Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Teams in each group will be ranked by total FPL points across these gameweeks. Top 2 advance.
                </p>
                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
                  {availableGameweeks.map(gw => (
                    <Button
                      key={gw}
                      variant={formData.groupStageGameweeks.includes(gw) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleGroupGameweek(gw)}
                      type="button"
                    >
                      {gw}
                    </Button>
                  ))}
                </div>
                {formData.groupStageGameweeks.length > 0 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Selected: {formData.groupStageGameweeks.join(', ')}
                  </p>
                )}
              </div>

              {/* Info Box */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Knockout gameweeks:</strong> You'll select these later when building the knockout matchups after the group stage completes.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Navigation */}
          <div className="flex gap-2 pt-4">
            {currentStep > 1 && (
              <Button variant="outline" onClick={handleBack} disabled={loading}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
            <Button variant="outline" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
            <div className="flex-1" />
            {currentStep < 3 ? (
              <Button onClick={handleNext} disabled={loading}>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? 'Creating Tournament...' : 'Create Tournament'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
