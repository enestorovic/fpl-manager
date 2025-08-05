"use client"

import { cn } from "@/lib/utils"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { TrendingUp, Users, DollarSign, Zap, Trophy, Target, AlertCircle } from "lucide-react"
import { getTeamSummary, getTeamChips } from "@/lib/database"
import type { Team, Chip, TeamSummary as TeamSummaryType } from "@/lib/supabase"

interface TeamSummaryProps {
  team: Team | null
}

export function TeamSummary({ team }: TeamSummaryProps) {
  const [summary, setSummary] = useState<TeamSummaryType | null>(null)
  const [chips, setChips] = useState<Chip[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!team) {
      setSummary(null)
      setChips([])
      setError(null)
      return
    }

    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const [summaryData, chipsData] = await Promise.all([
          getTeamSummary(team.id).catch(() => null), // Don't throw error if no summary
          getTeamChips(team.id).catch(() => []), // Return empty array if no chips
        ])
        setSummary(summaryData)
        setChips(chipsData)
      } catch (error) {
        console.error("Error fetching team data:", error)
        setError("Failed to load team details")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [team])

  if (!team) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full text-muted-foreground">
          Select a team to view details
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full text-muted-foreground">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getPercentileColor = (rank: number) => {
    if (rank <= 100000) return "text-green-600"
    if (rank <= 500000) return "text-blue-600"
    if (rank <= 1000000) return "text-orange-600"
    return "text-red-600"
  }

  const formatRank = (rank: number) => {
    if (rank >= 1000000) return `${(rank / 1000000).toFixed(1)}M`
    if (rank >= 1000) return `${(rank / 1000).toFixed(0)}K`
    return rank.toString()
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{team.entry_name}</CardTitle>
        <p className="text-sm text-muted-foreground">{team.player_name}</p>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            <Trophy className="h-3 w-3 mr-1" />
            Rank #{team.rank}
          </Badge>
          {team.rank !== team.last_rank && (
            <Badge variant={team.rank < team.last_rank ? "default" : "secondary"} className="text-xs">
              {team.rank < team.last_rank ? "↑" : "↓"} {Math.abs(team.rank - team.last_rank)}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* GW Score */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">GW38 Score</span>
          <span className="text-2xl font-bold text-primary">{team.event_total}</span>
        </div>

        <Separator />

        {/* Season Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Target className="h-4 w-4" />
              Total Points
            </div>
            <div className="text-lg font-semibold">{team.total.toLocaleString()}</div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              League Rank
            </div>
            <div className="text-lg font-semibold">#{team.rank}</div>
          </div>
        </div>

        <Separator />

        {/* Transfers & Overall Rank */}
        {summary ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                GW38 Transfers
              </div>
              <div className="text-lg font-semibold">
                {summary.transfers}
                {summary.transfers_cost > 0 && (
                  <span className="text-sm text-red-500 ml-1">(-{summary.transfers_cost})</span>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                Overall Rank
              </div>
              <div className={cn("text-lg font-semibold", getPercentileColor(summary.overall_rank))}>
                {formatRank(summary.overall_rank)}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            <p className="text-sm">No detailed summary available for this team</p>
          </div>
        )}

        <Separator />

        {/* Team Value & Bank */}
        {summary ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                Team Value
              </div>
              <div className="text-lg font-semibold">£{(summary.value / 10).toFixed(1)}m</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Bank</div>
              <div className="text-lg font-semibold">£{(summary.bank / 10).toFixed(1)}m</div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                Team Value
              </div>
              <div className="text-sm text-muted-foreground">Not available</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Bank</div>
              <div className="text-sm text-muted-foreground">Not available</div>
            </div>
          </div>
        )}

        <Separator />

        {/* Chips Used */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Zap className="h-4 w-4" />
            Chips Used This Season
          </div>
          {chips.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {chips.map((chip) => (
                <Badge key={chip.id} variant="outline" className="text-xs">
                  {chip.chip_type.toUpperCase()} (GW{chip.event_number})
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No chips data available</p>
          )}
        </div>

        {/* Current Chip */}
        {summary?.chip_used && (
          <>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Active Chip</span>
              <Badge variant="default" className="text-xs">
                {summary.chip_used.toUpperCase()}
              </Badge>
            </div>
          </>
        )}

        {/* Points Hit */}
        {summary && summary.transfers_cost > 0 && (
          <>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Points Hit</span>
              <span className="text-sm font-semibold text-red-500">-{summary.transfers_cost}</span>
            </div>
          </>
        )}

        {/* Special highlight for Erik's team */}
        {team.id === 89341 && summary && (
          <>
            <Separator />
            <div className="bg-muted/50 p-3 rounded-lg">
              <div className="text-xs font-medium text-muted-foreground mb-1">Season Highlights</div>
              <div className="text-sm space-y-1">
                <div>• Best GW: 109 points (GW24)</div>
                <div>• Worst GW: 37 points (GW29)</div>
                <div>• {chips.length} chips used strategically</div>
                <div>• Final season rank: {formatRank(summary.overall_rank)}</div>
              </div>
            </div>
          </>
        )}

        {/* Basic info for teams without detailed data */}
        {!summary && (
          <>
            <Separator />
            <div className="bg-muted/50 p-3 rounded-lg">
              <div className="text-xs font-medium text-muted-foreground mb-1">Available Data</div>
              <div className="text-sm space-y-1">
                <div>• Final total: {team.total.toLocaleString()} points</div>
                <div>• GW38 score: {team.event_total} points</div>
                <div>• League position: #{team.rank}</div>
                <div>
                  • Rank change:{" "}
                  {team.rank === team.last_rank
                    ? "No change"
                    : team.rank < team.last_rank
                      ? `Up ${team.last_rank - team.rank}`
                      : `Down ${team.rank - team.last_rank}`}
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
