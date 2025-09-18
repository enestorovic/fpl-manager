"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  RefreshCw,
  Database,
  Users,
  Calendar,
  LogOut,
  Trash2,
  AlertTriangle,
  Clock,
  Activity,
  CheckCircle,
  XCircle,
  Zap,
  Settings,
  Trophy
} from "lucide-react"
import { getLeagueMetadata, getDatabaseStatus } from "@/lib/database"
import { supabase } from "@/lib/supabase"
import type { LeagueMetadata, SyncLog } from "@/lib/supabase"
import { TournamentAdmin } from "@/components/tournament-admin"

interface AutomatedAdminPanelProps {
  onLogout: () => void
}

interface SyncStatus {
  lastSync: SyncLog | null
  activeSync: SyncLog | null
  recentErrors: SyncLog[]
  avgDuration: number
}

export function AutomatedAdminPanel({ onLogout }: AutomatedAdminPanelProps) {
  const [showTournaments, setShowTournaments] = useState(false)
  const [metadata, setMetadata] = useState<LeagueMetadata | null>(null)
  const [dbStatus, setDbStatus] = useState({ teams: 0, metadata: 0, summaries: 0, chips: 0, events: 0, sync_logs: 0 })
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [message, setMessage] = useState("")
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [recentLogs, setRecentLogs] = useState<SyncLog[]>([])

  useEffect(() => {
    fetchData()
    // Auto-refresh sync status every 30 seconds
    const interval = setInterval(fetchSyncStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [metadataResult, statusResult] = await Promise.all([
        getLeagueMetadata(), 
        getEnhancedDatabaseStatus(),
        fetchSyncStatus(),
        fetchRecentLogs()
      ])
      setMetadata(metadataResult)
      setDbStatus(statusResult)
    } catch (error) {
      console.error("Error fetching data:", error)
      setMessage("Error loading data")
    } finally {
      setLoading(false)
    }
  }

  const getEnhancedDatabaseStatus = async () => {
    const [teamsResult, metadataResult, summariesResult, chipsResult, eventsResult, logsResult] = await Promise.all([
      supabase.from('teams').select('id', { count: 'exact', head: true }),
      supabase.from('league_metadata').select('id', { count: 'exact', head: true }),
      supabase.from('team_summaries').select('id', { count: 'exact', head: true }),
      supabase.from('chips').select('id', { count: 'exact', head: true }),
      supabase.from('fpl_events').select('id', { count: 'exact', head: true }),
      supabase.from('sync_logs').select('id', { count: 'exact', head: true })
    ])

    return {
      teams: teamsResult.count || 0,
      metadata: metadataResult.count || 0,
      summaries: summariesResult.count || 0,
      chips: chipsResult.count || 0,
      events: eventsResult.count || 0,
      sync_logs: logsResult.count || 0
    }
  }

  const fetchSyncStatus = async () => {
    try {
      const response = await fetch('/api/sync/manual')
      const data = await response.json()
      if (data.success) {
        setSyncStatus(data.status)
      }
    } catch (error) {
      console.error("Error fetching sync status:", error)
    }
  }

  const fetchRecentLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('sync_logs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(10)

      if (!error && data) {
        setRecentLogs(data)
      }
    } catch (error) {
      console.error("Error fetching recent logs:", error)
    }
  }

  const handleManualSync = async (syncType: string = 'auto') => {
    setSyncing(true)
    setMessage("")
    try {
      console.log(`Starting manual ${syncType} sync...`)
      
      const response = await fetch('/api/sync/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncType })
      })
      
      const result = await response.json()
      
      if (result.success) {
        setMessage(`${syncType} sync completed: ${result.message}`)
        await Promise.all([fetchData(), fetchSyncStatus(), fetchRecentLogs()])
      } else {
        setMessage(`Sync failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Manual sync error:', error)
      setMessage(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSyncing(false)
    }
  }

  const handleResetDatabase = async () => {
    setResetting(true)
    setMessage("")
    try {
      // Clear all data in correct order
      await supabase.from("team_players").delete().neq("id", 0)
      await supabase.from("chips").delete().neq("id", 0)
      await supabase.from("team_summaries").delete().neq("id", 0)
      await supabase.from("teams").delete().neq("id", 0)
      await supabase.from("players").delete().neq("id", 0)
      await supabase.from("league_metadata").delete().neq("id", 0)
      await supabase.from("fpl_events").delete().neq("id", 0)
      await supabase.from("sync_logs").delete().neq("id", 0)

      setMessage("Database reset successfully! Run a bootstrap sync to reload data.")
      setMetadata(null)
      setDbStatus({ teams: 0, metadata: 0, summaries: 0, chips: 0, events: 0, sync_logs: 0 })
      setSyncStatus(null)
      setRecentLogs([])
      setShowResetConfirm(false)
    } catch (error) {
      console.error("Error resetting database:", error)
      setMessage("Error resetting database")
    } finally {
      setResetting(false)
    }
  }

  const formatDuration = (ms: number | null) => {
    if (!ms) return 'N/A'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const getSyncStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600'
      case 'failed': return 'text-red-600'
      case 'started': return 'text-blue-600'
      case 'partial': return 'text-yellow-600'
      default: return 'text-gray-600'
    }
  }

  const getSyncStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'failed': return <XCircle className="h-4 w-4 text-red-600" />
      case 'started': return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
      case 'partial': return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      default: return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  // Show tournament admin if requested
  if (showTournaments) {
    return <TournamentAdmin onBack={() => setShowTournaments(false)} />
  }

  return (
    <div className="min-h-screen p-4 bg-muted/30">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Automated FPL Admin Panel</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowTournaments(true)}>
              <Trophy className="h-4 w-4 mr-2" />
              Tournaments
            </Button>
            <Button variant="outline" onClick={onLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Sync Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium">Last Sync</p>
                  <p className="text-xs text-muted-foreground">
                    {syncStatus?.lastSync 
                      ? new Date(syncStatus.lastSync.started_at).toLocaleString()
                      : 'Never'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium">Status</p>
                  <div className="flex items-center gap-1">
                    {syncStatus?.activeSync 
                      ? <Badge variant="outline" className="text-blue-600">Running</Badge>
                      : <Badge variant="outline" className="text-green-600">Idle</Badge>
                    }
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-sm font-medium">Avg Duration</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDuration(syncStatus?.avgDuration || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-sm font-medium">Recent Errors</p>
                  <p className="text-xs text-muted-foreground">
                    {syncStatus?.recentErrors.length || 0} errors
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* League Metadata */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              League Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : metadata ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">League ID:</span>
                    <Badge variant="outline">{metadata.league_id}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Name:</span>
                    <span className="text-sm">{metadata.league_name}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span className="text-sm font-medium">Total Entries:</span>
                    <span className="text-sm">{metadata.total_entries}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm font-medium">Current GW:</span>
                    <span className="text-sm">{metadata.current_event}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No league data found</p>
                <Button onClick={() => handleManualSync('bootstrap')} disabled={syncing}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Bootstrap Data
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Database Status */}
        <Card>
          <CardHeader>
            <CardTitle>Database Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">{dbStatus.teams}</div>
                <div className="text-sm font-medium">Teams</div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">{dbStatus.events}</div>
                <div className="text-sm font-medium">Events</div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">{dbStatus.summaries}</div>
                <div className="text-sm font-medium">Summaries</div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">{dbStatus.chips}</div>
                <div className="text-sm font-medium">Chips</div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">{dbStatus.metadata}</div>
                <div className="text-sm font-medium">Metadata</div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">{dbStatus.sync_logs}</div>
                <div className="text-sm font-medium">Sync Logs</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Manual Sync Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Manual Sync Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button 
                onClick={() => handleManualSync('auto')} 
                disabled={syncing}
                className="w-full"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
                Smart Sync
              </Button>
              
              <Button 
                onClick={() => handleManualSync('bootstrap')} 
                disabled={syncing}
                variant="outline"
                className="w-full"
              >
                <Settings className="h-4 w-4 mr-2" />
                Bootstrap
              </Button>
              
              <Button 
                onClick={() => handleManualSync('full')} 
                disabled={syncing}
                variant="outline"
                className="w-full"
              >
                <Database className="h-4 w-4 mr-2" />
                Full Sync
              </Button>
              
              <Button 
                onClick={() => handleManualSync('scores')} 
                disabled={syncing}
                variant="outline"
                className="w-full"
              >
                <Activity className="h-4 w-4 mr-2" />
                Scores Only
              </Button>
            </div>

            <Separator />

            {/* Database Reset */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-red-600">Reset Database</h3>
                <p className="text-sm text-muted-foreground">Clear all data and start fresh</p>
              </div>
              {!showResetConfirm ? (
                <Button variant="destructive" onClick={() => setShowResetConfirm(true)} disabled={resetting}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Reset Database
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowResetConfirm(false)}>
                    Cancel
                  </Button>
                  <Button variant="destructive" size="sm" onClick={handleResetDatabase} disabled={resetting}>
                    {resetting ? "Resetting..." : "Confirm Reset"}
                  </Button>
                </div>
              )}
            </div>

            {showResetConfirm && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Warning:</strong> This will permanently delete all data including sync logs.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Recent Sync Logs */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Sync Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentLogs.length > 0 ? (
                recentLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {getSyncStatusIcon(log.status)}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{log.sync_type}</span>
                          <Badge variant="outline" className={getSyncStatusColor(log.status)}>
                            {log.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(log.started_at).toLocaleString()}
                          {log.triggered_by && ` • ${log.triggered_by}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div>{formatDuration(log.duration_ms)}</div>
                      {log.teams_updated > 0 && (
                        <div className="text-muted-foreground">{log.teams_updated} teams</div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-4">No sync logs found</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Status Messages */}
        {message && (
          <Alert className={message.includes("Error") ? "border-red-200" : "border-green-200"}>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        {/* Last Updated */}
        {metadata && (
          <div className="text-sm text-muted-foreground text-center">
            League data last updated: {new Date(metadata.last_updated).toLocaleString()}
          </div>
        )}
      </div>
    </div>
  )
}