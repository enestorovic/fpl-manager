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
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Users,
  Trophy,
  Settings,
  Calendar,
  Plus,
  X,
  AlertCircle
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import type { Team } from "@/lib/supabase"

interface TournamentCreateFormProps {
  onCancel: () => void
  onSuccess: () => void
}

export function TournamentCreateForm({ onCancel, onSuccess }: TournamentCreateFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [availableGameweeks] = useState(Array.from({ length: 38 }, (_, i) => i + 1))

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: '' as 'group' | 'knockout' | 'mixed' | '',
    gameweeks: [] as number[],

    // Group settings
    numGroups: 4,
    teamsPerGroup: 4,
    teamsAdvancePerGroup: 2,
    includeBestThird: false,

    // Knockout settings
    knockoutGameweeks: [] as number[],
    knockoutLegs: 1,

    // Participant settings
    selectedTeams: [] as number[],
    groupAssignments: {} as Record<number, number> // teamId -> groupIndex
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

  const handleGameweekToggle = (gameweek: number) => {
    setFormData(prev => ({
      ...prev,
      gameweeks: prev.gameweeks.includes(gameweek)
        ? prev.gameweeks.filter(gw => gw !== gameweek)
        : [...prev.gameweeks, gameweek].sort((a, b) => a - b)
    }))
  }

  const handleKnockoutGameweekToggle = (gameweek: number) => {
    setFormData(prev => ({
      ...prev,
      knockoutGameweeks: prev.knockoutGameweeks.includes(gameweek)
        ? prev.knockoutGameweeks.filter(gw => gw !== gameweek)
        : [...prev.knockoutGameweeks, gameweek].sort((a, b) => a - b)
    }))
  }

  const handleTeamToggle = (teamId: number) => {
    setFormData(prev => ({
      ...prev,
      selectedTeams: prev.selectedTeams.includes(teamId)
        ? prev.selectedTeams.filter(id => id !== teamId)
        : [...prev.selectedTeams, teamId]
    }))
  }

  const assignTeamsToGroups = () => {
    const selectedTeamsList = teams.filter(team => formData.selectedTeams.includes(team.id))
    const shuffled = [...selectedTeamsList].sort(() => Math.random() - 0.5)

    const newAssignments: Record<number, number> = {}
    shuffled.forEach((team, index) => {
      newAssignments[team.id] = index % formData.numGroups
    })

    setFormData(prev => ({ ...prev, groupAssignments: newAssignments }))
  }

  const validateForm = (): string | null => {
    if (!formData.name.trim()) return 'Tournament name is required'
    if (!formData.type) return 'Tournament type is required'
    if (formData.gameweeks.length === 0) return 'At least one gameweek must be selected'
    if (formData.selectedTeams.length < 2) return 'At least 2 teams must be selected'

    if (formData.type === 'group' || formData.type === 'mixed') {
      if (formData.selectedTeams.length < formData.numGroups * 2) {
        return `Need at least ${formData.numGroups * 2} teams for ${formData.numGroups} groups`
      }
    }

    if (formData.type === 'knockout' || formData.type === 'mixed') {
      if (formData.knockoutGameweeks.length === 0) {
        return 'Knockout gameweeks must be selected'
      }
    }

    return null
  }

  const handleSubmit = async () => {
    const validationError = validateForm()
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
          gameweeks: formData.gameweeks,
          num_groups: formData.type === 'group' || formData.type === 'mixed' ? formData.numGroups : null,
          teams_per_group: formData.type === 'group' || formData.type === 'mixed' ? formData.teamsPerGroup : null,
          teams_advance_per_group: formData.teamsAdvancePerGroup,
          include_best_third: formData.includeBestThird,
          knockout_gameweeks: formData.type === 'knockout' || formData.type === 'mixed' ? formData.knockoutGameweeks : null,
          knockout_legs: formData.knockoutLegs,
          created_by: 'admin',
          status: 'draft'
        })
        .select()
        .single()

      if (tournamentError) throw tournamentError

      // Create groups if needed
      if (formData.type === 'group' || formData.type === 'mixed') {
        const groups = []
        for (let i = 0; i < formData.numGroups; i++) {
          groups.push({
            tournament_id: tournament.id,
            group_name: `Group ${String.fromCharCode(65 + i)}`, // A, B, C, D...
            group_order: i + 1
          })
        }

        const { error: groupsError } = await supabase
          .from('tournament_groups')
          .insert(groups)

        if (groupsError) throw groupsError

        // Get created groups
        const { data: createdGroups, error: fetchGroupsError } = await supabase
          .from('tournament_groups')
          .select('*')
          .eq('tournament_id', tournament.id)

        if (fetchGroupsError) throw fetchGroupsError

        // Create participants with group assignments
        const participants = formData.selectedTeams.map(teamId => ({
          tournament_id: tournament.id,
          team_id: teamId,
          group_id: createdGroups[formData.groupAssignments[teamId] || 0]?.id || null
        }))

        const { error: participantsError } = await supabase
          .from('tournament_participants')
          .insert(participants)

        if (participantsError) throw participantsError
      } else {
        // For knockout-only, create participants without groups
        const participants = formData.selectedTeams.map(teamId => ({
          tournament_id: tournament.id,
          team_id: teamId,
          group_id: null
        }))

        const { error: participantsError } = await supabase
          .from('tournament_participants')
          .insert(participants)

        if (participantsError) throw participantsError
      }

      onSuccess()
    } catch (error) {
      console.error('Error creating tournament:', error)
      setError(error instanceof Error ? error.message : 'Failed to create tournament')
    } finally {
      setLoading(false)
    }
  }

  const getTeamsByGroup = (groupIndex: number) => {
    return teams.filter(team =>
      formData.selectedTeams.includes(team.id) &&
      formData.groupAssignments[team.id] === groupIndex
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create New Tournament</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Info */}
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
              <Label htmlFor="type">Tournament Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select tournament type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="group">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Group Stage Only
                    </div>
                  </SelectItem>
                  <SelectItem value="knockout">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4" />
                      Knockout Only
                    </div>
                  </SelectItem>
                  <SelectItem value="mixed">
                    <div className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Group + Knockout
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Gameweeks Selection */}
          <div>
            <Label className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4" />
              Tournament Gameweeks *
            </Label>
            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
              {availableGameweeks.map(gw => (
                <Button
                  key={gw}
                  variant={formData.gameweeks.includes(gw) ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleGameweekToggle(gw)}
                  type="button"
                >
                  {gw}
                </Button>
              ))}
            </div>
            {formData.gameweeks.length > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                Selected: {formData.gameweeks.join(', ')}
              </p>
            )}
          </div>

          {/* Group Settings */}
          {(formData.type === 'group' || formData.type === 'mixed') && (
            <>
              <Separator />
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Group Stage Settings
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="numGroups">Number of Groups</Label>
                    <Select
                      value={formData.numGroups.toString()}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, numGroups: parseInt(value) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[2, 3, 4, 5, 6, 8].map(num => (
                          <SelectItem key={num} value={num.toString()}>{num} groups</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="teamsAdvance">Teams Advance per Group</Label>
                    <Select
                      value={formData.teamsAdvancePerGroup.toString()}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, teamsAdvancePerGroup: parseInt(value) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Top 1</SelectItem>
                        <SelectItem value="2">Top 2</SelectItem>
                        <SelectItem value="3">Top 3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeBestThird"
                    checked={formData.includeBestThird}
                    onCheckedChange={(checked) =>
                      setFormData(prev => ({ ...prev, includeBestThird: checked as boolean }))
                    }
                  />
                  <Label htmlFor="includeBestThird">Include best 3rd place teams</Label>
                </div>
              </div>
            </>
          )}

          {/* Knockout Settings */}
          {(formData.type === 'knockout' || formData.type === 'mixed') && (
            <>
              <Separator />
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Knockout Settings
                </h3>

                <div>
                  <Label className="flex items-center gap-2 mb-3">
                    <Calendar className="h-4 w-4" />
                    Knockout Gameweeks *
                  </Label>
                  <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
                    {availableGameweeks.map(gw => (
                      <Button
                        key={gw}
                        variant={formData.knockoutGameweeks.includes(gw) ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleKnockoutGameweekToggle(gw)}
                        type="button"
                      >
                        {gw}
                      </Button>
                    ))}
                  </div>
                  {formData.knockoutGameweeks.length > 0 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Selected: {formData.knockoutGameweeks.join(', ')}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="knockoutLegs">Match Format</Label>
                  <Select
                    value={formData.knockoutLegs.toString()}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, knockoutLegs: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Single Leg</SelectItem>
                      <SelectItem value="2">Two Legs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Team Selection */}
          <div>
            <Label className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4" />
              Select Teams ({formData.selectedTeams.length} selected)
            </Label>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto p-2 border rounded">
              {teams.map(team => (
                <div
                  key={team.id}
                  className={`flex items-center space-x-2 p-2 rounded cursor-pointer hover:bg-muted/50 ${
                    formData.selectedTeams.includes(team.id) ? 'bg-primary/10 border border-primary' : ''
                  }`}
                  onClick={() => handleTeamToggle(team.id)}
                >
                  <Checkbox
                    checked={formData.selectedTeams.includes(team.id)}
                    readOnly
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{team.entry_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{team.player_name}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">#{team.rank}</Badge>
                </div>
              ))}
            </div>

            {/* Group Assignment */}
            {(formData.type === 'group' || formData.type === 'mixed') && formData.selectedTeams.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Label>Group Assignments</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={assignTeamsToGroups}
                  >
                    Auto Assign
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: formData.numGroups }, (_, i) => (
                    <div key={i} className="border rounded p-3">
                      <h4 className="font-medium mb-2">Group {String.fromCharCode(65 + i)}</h4>
                      <div className="space-y-1">
                        {getTeamsByGroup(i).map(team => (
                          <div key={team.id} className="text-sm py-1 px-2 bg-muted/50 rounded">
                            {team.entry_name}
                          </div>
                        ))}
                        {getTeamsByGroup(i).length === 0 && (
                          <p className="text-xs text-muted-foreground italic">No teams assigned</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Creating...' : 'Create Tournament'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}