"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Trophy, ArrowRight } from "lucide-react"
import { getGroupLetter, getKnockoutRoundName, getKnockoutRoundCount } from "@/lib/tournament-utils"
import type { KnockoutSeeding } from "@/lib/supabase"

interface KnockoutSeedingBuilderProps {
  numGroups: number
  teamsPerGroup: number
  seeding: KnockoutSeeding
  onChange: (seeding: KnockoutSeeding) => void
}

type GroupPosition = {
  value: string
  label: string
  groupLetter: string
  position: number
}

export function KnockoutSeedingBuilder({
  numGroups,
  teamsPerGroup,
  seeding,
  onChange
}: KnockoutSeedingBuilderProps) {
  // Calculate advancing teams (top 2 from each group)
  const advancingTeams = numGroups * 2

  // Calculate knockout structure
  const numKnockoutRounds = getKnockoutRoundCount(advancingTeams)
  const firstRoundMatches = Math.ceil(advancingTeams / 2)
  const firstRoundName = getKnockoutRoundName(advancingTeams, 1)

  // Generate all possible group positions (Winner and Runner-up from each group)
  const groupPositions: GroupPosition[] = useMemo(() => {
    const positions: GroupPosition[] = []
    for (let g = 0; g < numGroups; g++) {
      const letter = getGroupLetter(g)
      positions.push({
        value: `group_${letter}_1`,
        label: `Group ${letter} Winner`,
        groupLetter: letter,
        position: 1
      })
      positions.push({
        value: `group_${letter}_2`,
        label: `Group ${letter} Runner-up`,
        groupLetter: letter,
        position: 2
      })
    }
    return positions
  }, [numGroups])

  // Track which positions have been used
  const usedPositions = useMemo(() => {
    const used = new Set<string>()
    for (const matchSeeding of Object.values(seeding)) {
      if (matchSeeding.team1) used.add(matchSeeding.team1)
      if (matchSeeding.team2) used.add(matchSeeding.team2)
    }
    return used
  }, [seeding])

  // Get available positions for a specific slot
  const getAvailablePositions = (currentValue: string | undefined) => {
    return groupPositions.filter(
      pos => !usedPositions.has(pos.value) || pos.value === currentValue
    )
  }

  // Handle seeding change
  const handleSeedingChange = (matchKey: string, team: 'team1' | 'team2', value: string) => {
    const newSeeding = { ...seeding }
    if (!newSeeding[matchKey]) {
      newSeeding[matchKey] = { team1: '', team2: '' }
    }
    newSeeding[matchKey] = {
      ...newSeeding[matchKey],
      [team]: value
    }
    onChange(newSeeding)
  }

  // Generate match keys for first round
  const matchKeys = Array.from({ length: firstRoundMatches }, (_, i) => `${firstRoundName.replace(/\s+/g, '_').replace(/-/g, '_')}_${i + 1}`)

  // Get position color based on group
  const getPositionColor = (position: string | undefined) => {
    if (!position) return ''
    const match = position.match(/group_([A-Z])_(\d)/)
    if (!match) return ''
    const groupIndex = match[1].charCodeAt(0) - 65
    const colors = [
      'bg-blue-100 text-blue-800 border-blue-200',
      'bg-green-100 text-green-800 border-green-200',
      'bg-yellow-100 text-yellow-800 border-yellow-200',
      'bg-purple-100 text-purple-800 border-purple-200',
      'bg-pink-100 text-pink-800 border-pink-200',
      'bg-orange-100 text-orange-800 border-orange-200',
      'bg-cyan-100 text-cyan-800 border-cyan-200',
      'bg-red-100 text-red-800 border-red-200',
    ]
    return colors[groupIndex % colors.length]
  }

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex items-center gap-4 flex-wrap">
        <Badge variant="outline" className="text-sm">
          {numGroups} Groups x {teamsPerGroup} Teams
        </Badge>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <Badge variant="outline" className="text-sm">
          {advancingTeams} Teams Advance (Top 2 per group)
        </Badge>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <Badge variant="secondary" className="text-sm">
          {numKnockoutRounds} Knockout Rounds
        </Badge>
      </div>

      {/* Group Legend */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {Array.from({ length: numGroups }, (_, i) => (
          <div key={i} className={`p-2 rounded border text-center text-sm ${getPositionColor(`group_${getGroupLetter(i)}_1`)}`}>
            Group {getGroupLetter(i)}
          </div>
        ))}
      </div>

      {/* Bracket Seeding */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            {firstRoundName} Seeding
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Define which group positions face each other in the first knockout round
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {matchKeys.map((matchKey, index) => {
              const matchSeeding = seeding[matchKey] || { team1: '', team2: '' }
              const isUpperBracket = index < Math.ceil(firstRoundMatches / 2)

              return (
                <div
                  key={matchKey}
                  className={`p-4 rounded-lg border ${isUpperBracket ? 'bg-blue-50/30 border-blue-200' : 'bg-green-50/30 border-green-200'}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium">Match {index + 1}</span>
                    <Badge variant="outline" className={isUpperBracket ? 'text-blue-600' : 'text-green-600'}>
                      {isUpperBracket ? 'Upper Bracket' : 'Lower Bracket'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-[1fr,auto,1fr] gap-3 items-center">
                    {/* Team 1 */}
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Position 1</Label>
                      <Select
                        value={matchSeeding.team1 || undefined}
                        onValueChange={(value) => handleSeedingChange(matchKey, 'team1', value)}
                      >
                        <SelectTrigger className={matchSeeding.team1 ? getPositionColor(matchSeeding.team1) : ''}>
                          <SelectValue placeholder="Select group position..." />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailablePositions(matchSeeding.team1).map(pos => (
                            <SelectItem key={pos.value} value={pos.value}>
                              <span className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${pos.position === 1 ? 'bg-yellow-500' : 'bg-gray-400'}`} />
                                {pos.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* VS */}
                    <div className="text-center text-sm text-muted-foreground font-medium py-2 sm:py-0">
                      vs
                    </div>

                    {/* Team 2 */}
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Position 2</Label>
                      <Select
                        value={matchSeeding.team2 || undefined}
                        onValueChange={(value) => handleSeedingChange(matchKey, 'team2', value)}
                      >
                        <SelectTrigger className={matchSeeding.team2 ? getPositionColor(matchSeeding.team2) : ''}>
                          <SelectValue placeholder="Select group position..." />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailablePositions(matchSeeding.team2).map(pos => (
                            <SelectItem key={pos.value} value={pos.value}>
                              <span className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${pos.position === 1 ? 'bg-yellow-500' : 'bg-gray-400'}`} />
                                {pos.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Classic World Cup Seeding Suggestion */}
      <div className="p-4 bg-muted/50 rounded-lg">
        <p className="text-sm font-medium mb-2">Classic World Cup Format</p>
        <p className="text-xs text-muted-foreground mb-3">
          Traditional seeding: Group winners face runners-up from other groups
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {numGroups >= 2 && (
            <>
              <div className="p-2 bg-background rounded border">
                A1 vs B2
              </div>
              <div className="p-2 bg-background rounded border">
                B1 vs A2
              </div>
            </>
          )}
          {numGroups >= 4 && (
            <>
              <div className="p-2 bg-background rounded border">
                C1 vs D2
              </div>
              <div className="p-2 bg-background rounded border">
                D1 vs C2
              </div>
            </>
          )}
          {numGroups >= 6 && (
            <>
              <div className="p-2 bg-background rounded border">
                E1 vs F2
              </div>
              <div className="p-2 bg-background rounded border">
                F1 vs E2
              </div>
            </>
          )}
          {numGroups >= 8 && (
            <>
              <div className="p-2 bg-background rounded border">
                G1 vs H2
              </div>
              <div className="p-2 bg-background rounded border">
                H1 vs G2
              </div>
            </>
          )}
        </div>
      </div>

      {/* Validation Status */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Assigned:</span>
        <Badge variant={usedPositions.size === advancingTeams ? "default" : "outline"}>
          {usedPositions.size} / {advancingTeams}
        </Badge>
        {usedPositions.size === advancingTeams && (
          <span className="text-green-600 text-xs">All positions assigned</span>
        )}
      </div>
    </div>
  )
}

/**
 * Generate classic World Cup seeding (A1 vs B2, B1 vs A2, etc.)
 */
export function generateClassicWorldCupSeeding(numGroups: number): KnockoutSeeding {
  const seeding: KnockoutSeeding = {}
  const advancingTeams = numGroups * 2
  const firstRoundMatches = Math.ceil(advancingTeams / 2)
  const firstRoundName = getKnockoutRoundName(advancingTeams, 1)

  let matchIndex = 1
  for (let i = 0; i < numGroups; i += 2) {
    if (i + 1 < numGroups) {
      const groupA = getGroupLetter(i)
      const groupB = getGroupLetter(i + 1)
      const matchKeyBase = `${firstRoundName.replace(/\s+/g, '_').replace(/-/g, '_')}`

      // A1 vs B2
      seeding[`${matchKeyBase}_${matchIndex}`] = {
        team1: `group_${groupA}_1`,
        team2: `group_${groupB}_2`
      }
      matchIndex++

      // B1 vs A2
      seeding[`${matchKeyBase}_${matchIndex}`] = {
        team1: `group_${groupB}_1`,
        team2: `group_${groupA}_2`
      }
      matchIndex++
    }
  }

  return seeding
}

/**
 * Validate that all knockout seeding positions are filled correctly
 */
export function validateKnockoutSeeding(
  seeding: KnockoutSeeding,
  numGroups: number
): { valid: boolean; error?: string } {
  const advancingTeams = numGroups * 2
  const firstRoundMatches = Math.ceil(advancingTeams / 2)

  // Check all matches have both positions filled
  const filledPositions = new Set<string>()
  let matchCount = 0

  for (const matchSeeding of Object.values(seeding)) {
    if (!matchSeeding.team1 || !matchSeeding.team2) {
      return { valid: false, error: 'All match positions must be filled' }
    }

    // Check for duplicates
    if (filledPositions.has(matchSeeding.team1)) {
      return { valid: false, error: `Position ${matchSeeding.team1} is used more than once` }
    }
    if (filledPositions.has(matchSeeding.team2)) {
      return { valid: false, error: `Position ${matchSeeding.team2} is used more than once` }
    }

    filledPositions.add(matchSeeding.team1)
    filledPositions.add(matchSeeding.team2)
    matchCount++
  }

  // Check we have the right number of matches
  if (matchCount !== firstRoundMatches) {
    return { valid: false, error: `Expected ${firstRoundMatches} matches, got ${matchCount}` }
  }

  // Check all positions are used
  if (filledPositions.size !== advancingTeams) {
    return { valid: false, error: `Expected ${advancingTeams} positions, got ${filledPositions.size}` }
  }

  return { valid: true }
}
