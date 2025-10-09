"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowUpDown, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Team } from "@/lib/supabase"

interface LeagueStandingsProps {
  teams: Team[]
  onTeamSelect: (team: Team) => void
  onSortChange: (sortBy: "event_total" | "total") => void
  sortBy: "event_total" | "total"
  availableGameweeks: number[]
  selectedGameweek: number
  onGameweekChange: (gameweek: number) => void
}

export function LeagueStandings({ teams, onTeamSelect, onSortChange, sortBy, availableGameweeks, selectedGameweek, onGameweekChange }: LeagueStandingsProps) {
  const getChipBadge = (teamId: number) => {
    // Real chip data for GW38 based on team summaries
    const chips: Record<number, string> = {
      89341: "BB", // Erik - Bench Boost
      212673: "TC", // Ismael - Triple Captain
      147329: "BB", // Ennio - Bench Boost
    }
    return chips[teamId] || null
  }

  const getRankMovement = (rank: number, lastRank: number) => {
    if (rank < lastRank) {
      return { icon: TrendingUp, color: "text-green-600", movement: lastRank - rank }
    } else if (rank > lastRank) {
      return { icon: TrendingDown, color: "text-red-600", movement: rank - lastRank }
    } else {
      return { icon: Minus, color: "text-gray-400", movement: 0 }
    }
  }

  return (
    <Card className="h-full bg-gradient-to-br from-white via-pink-50/20 to-purple-50/20 border-pink-200/30 shadow-lg">
      <CardHeader className="pb-3 bg-gradient-to-r from-pink-500/5 to-purple-500/5 border-b border-pink-100/30">
        <CardTitle className="text-lg bg-gradient-to-r from-pink-700 to-purple-700 bg-clip-text text-transparent font-bold">
          La Jungla LV - Premier League
        </CardTitle>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={sortBy === "event_total" ? "default" : "outline"}
            size="sm"
            onClick={() => onSortChange("event_total")}
            className={cn(
              "text-xs transition-all duration-200",
              sortBy === "event_total"
                ? "bg-pink-100 text-pink-800 border-pink-300 shadow-sm"
                : "border-pink-200 text-pink-700 hover:bg-pink-50"
            )}
          >
            <ArrowUpDown className="h-3 w-3 mr-1" />
            GW{selectedGameweek} Score
          </Button>
          <Button
            variant={sortBy === "total" ? "default" : "outline"}
            size="sm"
            onClick={() => onSortChange("total")}
            className={cn(
              "text-xs transition-all duration-200",
              sortBy === "total"
                ? "bg-pink-100 text-pink-800 border-pink-300 shadow-sm"
                : "border-pink-200 text-pink-700 hover:bg-pink-50"
            )}
          >
            <ArrowUpDown className="h-3 w-3 mr-1" />
            Total Score
          </Button>
          <Select value={selectedGameweek.toString()} onValueChange={(value) => onGameweekChange(parseInt(value))}>
            <SelectTrigger className="w-20 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableGameweeks.map((gw) => (
                <SelectItem key={gw} value={gw.toString()}>
                  GW{gw}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-1">
          {teams.map((team) => {
            const chip = getChipBadge(team.id)
            const rankMovement = getRankMovement(team.rank, team.last_rank)
            const MovementIcon = rankMovement.icon

            const getRankBadgeColor = (rank: number) => {
              if (rank === 1) return "bg-gradient-to-r from-yellow-400 to-amber-500 text-yellow-900 shadow-lg"
              return "bg-gradient-to-r from-pink-400 to-purple-500 text-white shadow-md"
            }

            return (
              <div
                key={team.id}
                onClick={() => onTeamSelect(team)}
                className="flex items-center gap-3 p-3 cursor-pointer transition-all duration-200 rounded-lg mx-2 mb-1 bg-white/70 hover:bg-pink-50/70 border border-pink-100/50 hover:border-pink-200/70 shadow-sm hover:shadow-md"
              >
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold",
                    getRankBadgeColor(team.rank)
                  )}>
                    {team.rank}
                  </div>
                  {rankMovement.movement !== 0 && (
                    <div className={cn("flex items-center", rankMovement.color)}>
                      <MovementIcon className="h-3 w-3" />
                      <span className="text-xs ml-1">{rankMovement.movement}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{team.entry_name}</div>
                  <div className="text-xs text-muted-foreground truncate">{team.player_name}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{team.event_total}</span>
                    {chip && (
                      <Badge className="text-xs px-1.5 py-0.5 bg-gradient-to-r from-orange-400 to-red-500 text-white border-0 shadow-sm">
                        {chip}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">Total: {team.total.toLocaleString()}</div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
