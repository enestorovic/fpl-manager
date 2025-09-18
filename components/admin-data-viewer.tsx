"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Database,
  Users,
  BarChart3,
  RefreshCw,
  Trophy,
  AlertCircle
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import type { Team, TeamSummary, Chip } from "@/lib/supabase"

export function AdminDataViewer() {
  const [teams, setTeams] = useState<Team[]>([])
  const [teamSummaries, setTeamSummaries] = useState<TeamSummary[]>([])
  const [chips, setChips] = useState<Chip[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dataCounts, setDataCounts] = useState({
    teams: 0,
    summaries: 0,
    chips: 0,
    distinctGameweeks: 0
  })

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch all data in parallel
      const [teamsResult, summariesResult, chipsResult] = await Promise.all([
        supabase.from('teams').select('*').order('rank', { ascending: true }),
        supabase.from('team_summaries').select('*').order('event_number', { ascending: false }).limit(100),
        supabase.from('chips').select('*').order('event_number', { ascending: false }).limit(50)
      ])

      if (teamsResult.error) throw teamsResult.error
      if (summariesResult.error) throw summariesResult.error
      if (chipsResult.error) throw chipsResult.error

      setTeams(teamsResult.data || [])
      setTeamSummaries(summariesResult.data || [])
      setChips(chipsResult.data || [])

      // Get data counts
      const [teamsCount, summariesCount, chipsCount, gameweeksResult] = await Promise.all([
        supabase.from('teams').select('id', { count: 'exact', head: true }),
        supabase.from('team_summaries').select('id', { count: 'exact', head: true }),
        supabase.from('chips').select('id', { count: 'exact', head: true }),
        supabase.from('team_summaries').select('event_number').distinct()
      ])

      const distinctGameweeks = gameweeksResult.data ?
        [...new Set(gameweeksResult.data.map(item => item.event_number))].length : 0

      setDataCounts({
        teams: teamsCount.count || 0,
        summaries: summariesCount.count || 0,
        chips: chipsCount.count || 0,
        distinctGameweeks
      })

    } catch (error) {
      console.error('Error fetching admin data:', error)
      setError('Failed to load database data')
    } finally {
      setLoading(false)
    }
  }

  const formatValue = (value: any) => {
    if (value === null || value === undefined) return '—'
    if (typeof value === 'number') return value.toLocaleString()
    if (typeof value === 'string' && value.includes('T')) {
      // Format dates
      return new Date(value).toLocaleDateString()
    }
    return value.toString()
  }

  const getStatusColor = (count: number, expected: number) => {
    if (count === 0) return 'bg-red-500'
    if (count < expected) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Database Data Viewer</h2>
        <Button onClick={fetchAllData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Data Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Teams</p>
                <p className="text-2xl font-bold">{dataCounts.teams}</p>
                <Badge variant="outline" className={`${getStatusColor(dataCounts.teams, 30)} text-white text-xs mt-1`}>
                  {dataCounts.teams > 0 ? 'Active' : 'No Data'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">Team Summaries</p>
                <p className="text-2xl font-bold">{dataCounts.summaries}</p>
                <Badge variant="outline" className={`${getStatusColor(dataCounts.summaries, 100)} text-white text-xs mt-1`}>
                  {dataCounts.summaries > 0 ? 'Data Found' : 'Empty'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm font-medium">Chips</p>
                <p className="text-2xl font-bold">{dataCounts.chips}</p>
                <Badge variant="outline" className={`${getStatusColor(dataCounts.chips, 10)} text-white text-xs mt-1`}>
                  {dataCounts.chips > 0 ? 'Tracked' : 'None'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium">Gameweeks</p>
                <p className="text-2xl font-bold">{dataCounts.distinctGameweeks}</p>
                <Badge variant="outline" className={`${getStatusColor(dataCounts.distinctGameweeks, 5)} text-white text-xs mt-1`}>
                  {dataCounts.distinctGameweeks > 0 ? 'Available' : 'Missing'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Tables */}
      <Tabs defaultValue="teams" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="teams">Teams ({dataCounts.teams})</TabsTrigger>
          <TabsTrigger value="summaries">Team Summaries ({dataCounts.summaries})</TabsTrigger>
          <TabsTrigger value="chips">Chips ({dataCounts.chips})</TabsTrigger>
        </TabsList>

        <TabsContent value="teams" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Teams Data</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : teams.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4" />
                  <p>No teams data found</p>
                  <p className="text-sm">Run the sync process to populate team data</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Team Name</TableHead>
                        <TableHead>Manager</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>GW Score</TableHead>
                        <TableHead>Rank</TableHead>
                        <TableHead>Last Rank</TableHead>
                        <TableHead>Updated</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teams.slice(0, 20).map((team) => (
                        <TableRow key={team.id}>
                          <TableCell className="font-mono">{team.id}</TableCell>
                          <TableCell className="font-medium">{team.entry_name}</TableCell>
                          <TableCell>{team.player_name}</TableCell>
                          <TableCell className="font-mono">{formatValue(team.total)}</TableCell>
                          <TableCell className="font-mono">{formatValue(team.event_total)}</TableCell>
                          <TableCell>#{team.rank}</TableCell>
                          <TableCell>#{team.last_rank}</TableCell>
                          <TableCell className="text-xs">{formatValue(team.updated_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {teams.length > 20 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Showing first 20 of {teams.length} teams
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summaries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Summaries Data (Latest 100)</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : teamSummaries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4" />
                  <p>No team summaries found</p>
                  <p className="text-sm">This is likely why you see "No detailed summary available"</p>
                  <p className="text-sm font-medium mt-2">Try running the automated sync process</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Team ID</TableHead>
                        <TableHead>GW</TableHead>
                        <TableHead>Points</TableHead>
                        <TableHead>Transfers</TableHead>
                        <TableHead>Transfer Cost</TableHead>
                        <TableHead>Overall Rank</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Bank</TableHead>
                        <TableHead>Chip</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teamSummaries.map((summary) => (
                        <TableRow key={summary.id}>
                          <TableCell className="font-mono">{summary.team_id}</TableCell>
                          <TableCell>{summary.event_number}</TableCell>
                          <TableCell className="font-mono">{formatValue(summary.points)}</TableCell>
                          <TableCell>{formatValue(summary.transfers)}</TableCell>
                          <TableCell className={summary.transfers_cost > 0 ? 'text-red-600 font-medium' : ''}>
                            {summary.transfers_cost > 0 ? `-${summary.transfers_cost}` : '0'}
                          </TableCell>
                          <TableCell className="font-mono">{formatValue(summary.overall_rank)}</TableCell>
                          <TableCell>£{((summary.value || 0) / 10).toFixed(1)}m</TableCell>
                          <TableCell>£{((summary.bank || 0) / 10).toFixed(1)}m</TableCell>
                          <TableCell>
                            {summary.chip_used ? (
                              <Badge variant="outline">{summary.chip_used}</Badge>
                            ) : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chips" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Chips Data (Latest 50)</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : chips.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Trophy className="h-12 w-12 mx-auto mb-4" />
                  <p>No chips data found</p>
                  <p className="text-sm">Chip usage will appear here after sync</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Team ID</TableHead>
                        <TableHead>Chip Type</TableHead>
                        <TableHead>Gameweek</TableHead>
                        <TableHead>Used At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {chips.map((chip) => (
                        <TableRow key={chip.id}>
                          <TableCell className="font-mono">{chip.id}</TableCell>
                          <TableCell className="font-mono">{chip.team_id}</TableCell>
                          <TableCell>
                            <Badge variant="default">{chip.chip_type.toUpperCase()}</Badge>
                          </TableCell>
                          <TableCell>GW{chip.event_number}</TableCell>
                          <TableCell className="text-xs">{formatValue(chip.used_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}