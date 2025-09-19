"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ArrowUpDown, TrendingUp, TrendingDown, Trophy, Target, Users, AlertCircle } from "lucide-react"
import { getAllTeamsSeasonStats, type TeamSeasonStats } from "@/lib/database"

type SortField = keyof TeamSeasonStats | 'bestGameweek' | 'worstGameweek'
type SortDirection = 'asc' | 'desc'

export function StatsTable() {
  const [stats, setStats] = useState<TeamSeasonStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortField, setSortField] = useState<SortField>('totalPoints')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getAllTeamsSeasonStats()
      setStats(data)
    } catch (error) {
      console.error('Error fetching stats:', error)
      setError('Failed to load season statistics')
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const getSortValue = (stat: TeamSeasonStats, field: SortField): number => {
    switch (field) {
      case 'bestGameweek':
        return stat.bestGameweek.points
      case 'worstGameweek':
        return stat.worstGameweek.points
      default:
        return stat[field] as number
    }
  }

  const sortedStats = [...stats].sort((a, b) => {
    const aValue = getSortValue(a, sortField)
    const bValue = getSortValue(b, sortField)

    if (sortDirection === 'asc') {
      return aValue - bValue
    } else {
      return bValue - aValue
    }
  })

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-auto p-1 font-semibold"
      onClick={() => handleSort(field)}
    >
      {children}
      <ArrowUpDown className="ml-1 h-3 w-3" />
    </Button>
  )

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-lg">Season Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-lg">Season Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p>{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Season Statistics</CardTitle>
          <Badge variant="outline" className="text-xs">
            {stats.length} Teams
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead className="min-w-[150px]">Team</TableHead>
                <TableHead className="text-center">
                  <SortButton field="totalPoints">Total Pts</SortButton>
                </TableHead>
                <TableHead className="text-center">
                  <SortButton field="averagePoints">Avg/GW</SortButton>
                </TableHead>
                <TableHead className="text-center">
                  <SortButton field="totalTransferHits">Transfer Hits</SortButton>
                </TableHead>
                <TableHead className="text-center">
                  <SortButton field="bestGameweek">Best GW</SortButton>
                </TableHead>
                <TableHead className="text-center">
                  <SortButton field="worstGameweek">Worst GW</SortButton>
                </TableHead>
                <TableHead className="text-center">
                  <SortButton field="chipsUsed">Chips</SortButton>
                </TableHead>
                <TableHead className="text-center">
                  <SortButton field="gameweeksPlayed">GWs</SortButton>
                </TableHead>
                <TableHead className="text-center">
                  <SortButton field="currentRank">Rank</SortButton>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedStats.map((stat, index) => (
                <TableRow key={stat.teamId} className="hover:bg-muted/50">
                  <TableCell className="font-mono text-sm">
                    {index + 1}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium text-sm truncate max-w-[120px]">
                        {stat.teamName}
                      </div>
                      <div className="text-xs text-muted-foreground truncate max-w-[120px]">
                        {stat.managerName}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-mono">
                    <span className="font-semibold">{stat.totalPoints.toLocaleString()}</span>
                  </TableCell>
                  <TableCell className="text-center font-mono">
                    {stat.averagePoints}
                  </TableCell>
                  <TableCell className="text-center">
                    {stat.totalTransferHits > 0 ? (
                      <span className="text-red-600 font-medium">-{stat.totalTransferHits}</span>
                    ) : (
                      <span className="text-green-600">0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="text-sm">
                      <div className="font-semibold text-green-600">{stat.bestGameweek.points}</div>
                      <div className="text-xs text-muted-foreground">GW{stat.bestGameweek.gameweek}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="text-sm">
                      <div className="font-semibold text-red-600">{stat.worstGameweek.points}</div>
                      <div className="text-xs text-muted-foreground">GW{stat.worstGameweek.gameweek}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={stat.chipsUsed > 0 ? "default" : "outline"} className="text-xs">
                      {stat.chipsUsed}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center font-mono text-sm">
                    {stat.gameweeksPlayed}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center">
                      <Trophy className="h-3 w-3 mr-1 text-muted-foreground" />
                      <span className="font-medium">#{stat.currentRank}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border-t bg-muted/30">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mb-1">
              <Users className="h-4 w-4" />
              Total Teams
            </div>
            <div className="text-lg font-bold">{stats.length}</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mb-1">
              <Target className="h-4 w-4" />
              Avg Points
            </div>
            <div className="text-lg font-bold">
              {Math.round(stats.reduce((sum, s) => sum + s.averagePoints, 0) / stats.length)}
            </div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mb-1">
              <TrendingDown className="h-4 w-4" />
              Total Hits
            </div>
            <div className="text-lg font-bold text-red-600">
              -{stats.reduce((sum, s) => sum + s.totalTransferHits, 0)}
            </div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              Chips Used
            </div>
            <div className="text-lg font-bold">
              {stats.reduce((sum, s) => sum + s.chipsUsed, 0)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}