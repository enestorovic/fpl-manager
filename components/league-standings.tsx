"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowUpDown, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Team } from "@/lib/supabase"

interface LeagueStandingsProps {
  teams: Team[]
  onTeamSelect: (team: Team) => void
  onSortChange: (sortBy: "event_total" | "total") => void
  sortBy: "event_total" | "total"
}

export function LeagueStandings({ teams, onTeamSelect, onSortChange, sortBy }: LeagueStandingsProps) {
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
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">La Jungla LV - Premier Legue</CardTitle>
        <div className="flex gap-2">
          <Button
            variant={sortBy === "event_total" ? "default" : "outline"}
            size="sm"
            onClick={() => onSortChange("event_total")}
            className="text-xs"
          >
            <ArrowUpDown className="h-3 w-3 mr-1" />
            GW38 Score
          </Button>
          <Button
            variant={sortBy === "total" ? "default" : "outline"}
            size="sm"
            onClick={() => onSortChange("total")}
            className="text-xs"
          >
            <ArrowUpDown className="h-3 w-3 mr-1" />
            Total Score
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-1">
          {teams.map((team) => {
            const chip = getChipBadge(team.id)
            const rankMovement = getRankMovement(team.rank, team.last_rank)
            const MovementIcon = rankMovement.icon

            return (
              <div
                key={team.id}
                onClick={() => onTeamSelect(team)}
                className="flex items-center gap-3 p-3 cursor-pointer transition-colors hover:bg-muted/50 active:bg-muted/70"
              >
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-medium">
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
                      <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
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
