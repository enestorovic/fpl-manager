"use client"

import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { TrendingUp, Users, DollarSign, Zap, Trophy, Target, AlertCircle } from "lucide-react"
import { getTeamSummary, getTeamChips, getCurrentGameweek, getTeamSeasonStats, getTeamCaptainStats } from "@/lib/database"
import type { Team, Chip, TeamSummary as TeamSummaryType } from "@/lib/supabase"

interface TeamSummarySheetProps {
  team: Team | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TeamSummarySheet({ team, open, onOpenChange }: TeamSummarySheetProps) {
  const [summary, setSummary] = useState<TeamSummaryType | null>(null)
  const [chips, setChips] = useState<Chip[]>([])
  const [seasonStats, setSeasonStats] = useState<any>(null)
  const [currentGameweek, setCurrentGameweek] = useState<number>(38)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!team || !open) {
      setSummary(null)
      setChips([])
      setError(null)
      return
    }

    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const [currentGW, summaryData, chipsData, seasonStatsData] = await Promise.all([
          getCurrentGameweek().catch(() => 38),
          getTeamSummary(team.id).catch(() => null),
          getTeamChips(team.id).catch(() => []),
          getTeamSeasonStats(team.id).catch(() => null),
        ])
        setCurrentGameweek(currentGW)
        setSummary(summaryData)
        setChips(chipsData)
        setSeasonStats(seasonStatsData)
      } catch (error) {
        console.error("Error fetching team data:", error)
        setError("Failed to load team details")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [team, open])

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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
        {team && (
          <>
            <SheetHeader className="pb-4">
              <SheetTitle className="text-left">{team.entry_name}</SheetTitle>
              <div className="flex items-center justify-between">
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
              </div>
            </SheetHeader>

            <div className="space-y-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <div className="text-center">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                    <p>{error}</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* GW Score - Large Display */}
                  <div className="text-center py-4 bg-muted/30 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">GW{currentGameweek} Score</div>
                    <div className="text-4xl font-bold text-primary">{team.event_total}</div>
                  </div>

                  {/* Season Summary */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-2">
                        <Target className="h-4 w-4" />
                        Current Total
                      </div>
                      <div className="text-2xl font-semibold">{team.total.toLocaleString()}</div>
                    </div>
                    <div className="text-center p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-2">
                        <TrendingUp className="h-4 w-4" />
                        League Rank
                      </div>
                      <div className="text-2xl font-semibold">#{team.rank}</div>
                    </div>
                  </div>

                  {/* Detailed Stats */}
                  {summary ? (
                    <>
                      <Separator />
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-muted/30 rounded-lg">
                          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-2">
                            <Users className="h-4 w-4" />
                            GW{currentGameweek} Transfers
                          </div>
                          <div className="text-xl font-semibold">
                            {summary.transfers}
                            {summary.transfers_cost > 0 && (
                              <span className="text-sm text-red-500 ml-1">(-{summary.transfers_cost})</span>
                            )}
                          </div>
                        </div>
                        <div className="text-center p-4 bg-muted/30 rounded-lg">
                          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-2">
                            <TrendingUp className="h-4 w-4" />
                            Overall Rank
                          </div>
                          <div className={cn("text-xl font-semibold", getPercentileColor(summary.overall_rank))}>
                            {formatRank(summary.overall_rank)}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-muted/30 rounded-lg">
                          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-2">
                            <DollarSign className="h-4 w-4" />
                            Team Value
                          </div>
                          <div className="text-xl font-semibold">£{(summary.value / 10).toFixed(1)}m</div>
                        </div>
                        <div className="text-center p-4 bg-muted/30 rounded-lg">
                          <div className="text-sm text-muted-foreground mb-2">Bank</div>
                          <div className="text-xl font-semibold">£{(summary.bank / 10).toFixed(1)}m</div>
                        </div>
                      </div>

                      {/* Season Performance Stats */}
                      {seasonStats && (
                        <>
                          <Separator />
                          <div className="space-y-3">
                            <div className="text-base font-medium">Season Performance</div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="text-center p-4 bg-muted/30 rounded-lg">
                                <div className="text-sm text-muted-foreground mb-2">Best GW</div>
                                <div className="text-xl font-semibold text-green-600">
                                  {seasonStats.bestGW.points} pts
                                </div>
                                <div className="text-xs text-muted-foreground">GW{seasonStats.bestGW.gameweek}</div>
                              </div>
                              <div className="text-center p-4 bg-muted/30 rounded-lg">
                                <div className="text-sm text-muted-foreground mb-2">Worst GW</div>
                                <div className="text-xl font-semibold text-red-600">
                                  {seasonStats.worstGW.points} pts
                                </div>
                                <div className="text-xs text-muted-foreground">GW{seasonStats.worstGW.gameweek}</div>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="text-center p-4 bg-muted/30 rounded-lg">
                                <div className="text-sm text-muted-foreground mb-2">Transfer Hits</div>
                                <div className="text-xl font-semibold">
                                  {seasonStats.totalTransferHits > 0 ? (
                                    <span className="text-red-500">-{seasonStats.totalTransferHits}</span>
                                  ) : (
                                    <span className="text-green-600">0</span>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground">Season total</div>
                              </div>
                              <div className="text-center p-4 bg-muted/30 rounded-lg">
                                <div className="text-sm text-muted-foreground mb-2">Average</div>
                                <div className="text-xl font-semibold">
                                  {seasonStats.averagePoints} pts
                                </div>
                                <div className="text-xs text-muted-foreground">Per gameweek</div>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground bg-muted/30 rounded-lg">
                      <p className="text-sm">No detailed summary available for this team</p>
                    </div>
                  )}

                  <Separator />

                  {/* Chips Used - Temporarily Hidden */}
                  {false && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-base font-medium">
                        <Zap className="h-5 w-5" />
                        Chips Used This Season
                      </div>
                      {chips.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {chips.map((chip) => (
                            <Badge key={chip.id} variant="outline" className="text-sm px-3 py-1">
                              {chip.chip_type.toUpperCase()} (GW{chip.event_number})
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No chips data available</p>
                      )}
                    </div>
                  )}

                  {/* Current Chip */}
                  {summary?.chip_used && (
                    <>
                      <Separator />
                      <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg">
                        <span className="font-medium">Active Chip</span>
                        <Badge variant="default" className="text-sm">
                          {summary.chip_used.toUpperCase()}
                        </Badge>
                      </div>
                    </>
                  )}

                  {/* Points Hit */}
                  {summary && summary.transfers_cost > 0 && (
                    <>
                      <Separator />
                      <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
                        <span className="font-medium">Points Hit</span>
                        <span className="font-semibold text-red-500">-{summary.transfers_cost}</span>
                      </div>
                    </>
                  )}

                  {/* Special highlight for Erik's team */}
                  {team.id === 89341 && summary && (
                    <>
                      <Separator />
                      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 p-4 rounded-lg">
                        <div className="text-sm font-medium text-muted-foreground mb-3">Season Highlights</div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Best GW:</span>
                            <span className="font-medium">109 points (GW24)</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Worst GW:</span>
                            <span className="font-medium">37 points (GW29)</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Chips used:</span>
                            <span className="font-medium">{chips.length} strategically</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Final rank:</span>
                            <span className="font-medium">{formatRank(summary.overall_rank)}</span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Basic info for teams without detailed data */}
                  {!summary && (
                    <>
                      <Separator />
                      <div className="bg-muted/50 p-4 rounded-lg">
                        <div className="text-sm font-medium text-muted-foreground mb-3">Available Data</div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Current total:</span>
                            <span className="font-medium">{team.total.toLocaleString()} points</span>
                          </div>
                          <div className="flex justify-between">
                            <span>GW{currentGameweek} score:</span>
                            <span className="font-medium">{team.event_total} points</span>
                          </div>
                          <div className="flex justify-between">
                            <span>League position:</span>
                            <span className="font-medium">#{team.rank}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Rank change:</span>
                            <span className="font-medium">
                              {team.rank === team.last_rank
                                ? "No change"
                                : team.rank < team.last_rank
                                  ? `Up ${team.last_rank - team.rank}`
                                  : `Down ${team.rank - team.last_rank}`}
                            </span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
