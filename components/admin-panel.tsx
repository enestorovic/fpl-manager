"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RefreshCw, Database, Users, Calendar, LogOut, Trash2, AlertTriangle, Play } from "lucide-react"
import { getLeagueMetadata, getDatabaseStatus } from "@/lib/database"
import { fplSyncService } from "@/lib/fpl-sync"
import { supabase } from "@/lib/supabase"
import type { LeagueMetadata } from "@/lib/supabase"

interface AdminPanelProps {
  onLogout: () => void
}

export function AdminPanel({ onLogout }: AdminPanelProps) {
  const [metadata, setMetadata] = useState<LeagueMetadata | null>(null)
  const [dbStatus, setDbStatus] = useState({ teams: 0, metadata: 0, summaries: 0, chips: 0 })
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [message, setMessage] = useState("")
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [metadataResult, statusResult] = await Promise.all([getLeagueMetadata(), getDatabaseStatus()])
      setMetadata(metadataResult)
      setDbStatus(statusResult)
    } catch (error) {
      console.error("Error fetching data:", error)
      setMessage("Error loading data")
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    setMessage("")
    try {
      console.log('Starting real FPL API sync...')
      const result = await fplSyncService.syncFromRealAPI()
      
      if (result.success) {
        setMessage(result.message)
        await fetchData() // Refresh the data
      } else {
        setMessage(`Sync failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Sync error:', error)
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

      setMessage("Database reset successfully! Click 'Load Sample Data' to reload the FPL data.")
      setMetadata(null)
      setDbStatus({ teams: 0, metadata: 0, summaries: 0, chips: 0 })
      setShowResetConfirm(false)
    } catch (error) {
      console.error("Error resetting database:", error)
      setMessage("Error resetting database")
    } finally {
      setResetting(false)
    }
  }

  const handleLoadSampleData = async () => {
    setSeeding(true)
    setMessage("")
    try {
      // Insert league metadata
      await supabase.from("league_metadata").upsert({
        league_id: 66185,
        league_name: "La Jungla LV - Premier Legue",
        total_entries: 32,
        current_event: 38,
        last_updated: new Date().toISOString(),
      })

      // Insert all 32 teams
      const teams = [
        {
          id: 7342331,
          entry_name: "BIELSISMO",
          player_name: "Augusto Zegarra",
          total: 2553,
          event_total: 70,
          rank: 1,
          last_rank: 1,
        },
        {
          id: 262619,
          entry_name: "Bisnietos de Erasmo",
          player_name: "Eric Wong",
          total: 2522,
          event_total: 53,
          rank: 2,
          last_rank: 2,
        },
        {
          id: 68175,
          entry_name: "POLERO FC",
          player_name: "Heinz Andre",
          total: 2504,
          event_total: 55,
          rank: 3,
          last_rank: 4,
        },
        {
          id: 212673,
          entry_name: "Kimmish",
          player_name: "Ismael Abdala",
          total: 2497,
          event_total: 45,
          rank: 4,
          last_rank: 3,
        },
        {
          id: 748251,
          entry_name: "La Gravesinha SC",
          player_name: "Nicanor Vilchez",
          total: 2484,
          event_total: 66,
          rank: 5,
          last_rank: 5,
        },
        {
          id: 200662,
          entry_name: "Matitor FC",
          player_name: "Rodrigo Vallejos",
          total: 2476,
          event_total: 60,
          rank: 6,
          last_rank: 6,
        },
        {
          id: 89341,
          entry_name: "Dashiki",
          player_name: "Erik Nestorovic",
          total: 2449,
          event_total: 55,
          rank: 7,
          last_rank: 8,
        },
        {
          id: 1135705,
          entry_name: "Bipolardos",
          player_name: "Paul Tejeda",
          total: 2441,
          event_total: 67,
          rank: 8,
          last_rank: 9,
        },
        {
          id: 1147014,
          entry_name: "yoviyova",
          player_name: "Yovan Samardzich",
          total: 2440,
          event_total: 67,
          rank: 9,
          last_rank: 10,
        },
        {
          id: 542746,
          entry_name: "Música",
          player_name: "Michael Stephenson",
          total: 2437,
          event_total: 41,
          rank: 10,
          last_rank: 7,
        },
        {
          id: 147329,
          entry_name: "Cápac F.C.",
          player_name: "Ennio Pinasco",
          total: 2413,
          event_total: 74,
          rank: 11,
          last_rank: 14,
        },
        {
          id: 119790,
          entry_name: "PrettyFly4aWhiteKai",
          player_name: "Arturo Accame",
          total: 2409,
          event_total: 57,
          rank: 12,
          last_rank: 11,
        },
        {
          id: 4910796,
          entry_name: "Bash FC",
          player_name: "Bruno Asin",
          total: 2406,
          event_total: 66,
          rank: 13,
          last_rank: 13,
        },
        {
          id: 1417733,
          entry_name: "Tunesquad",
          player_name: "Jose Luis Miranda",
          total: 2396,
          event_total: 70,
          rank: 14,
          last_rank: 16,
        },
        {
          id: 170000,
          entry_name: "La Morrineta",
          player_name: "Alex Morris",
          total: 2395,
          event_total: 68,
          rank: 15,
          last_rank: 15,
        },
        {
          id: 522926,
          entry_name: "Nachito fest",
          player_name: "Nashir Saba",
          total: 2394,
          event_total: 48,
          rank: 16,
          last_rank: 12,
        },
        {
          id: 310530,
          entry_name: "Cuadrado",
          player_name: "Alfonso De La Piedra",
          total: 2378,
          event_total: 56,
          rank: 17,
          last_rank: 17,
        },
        {
          id: 4414028,
          entry_name: "Los Cuánticos",
          player_name: "Sebastian Salinas",
          total: 2367,
          event_total: 47,
          rank: 18,
          last_rank: 18,
        },
        {
          id: 1938206,
          entry_name: "Carlitos FC",
          player_name: "Carlos Sedó",
          total: 2349,
          event_total: 49,
          rank: 19,
          last_rank: 19,
        },
        {
          id: 2072180,
          entry_name: "El Pullet",
          player_name: "Sebastian Benavides",
          total: 2340,
          event_total: 58,
          rank: 20,
          last_rank: 20,
        },
        {
          id: 7221003,
          entry_name: "PUERTA CHOLA",
          player_name: "Steve Ocampo",
          total: 2323,
          event_total: 69,
          rank: 21,
          last_rank: 22,
        },
        {
          id: 1429857,
          entry_name: "El de abajo no sabe",
          player_name: "Angel Pinasco",
          total: 2313,
          event_total: 55,
          rank: 22,
          last_rank: 21,
        },
        {
          id: 180956,
          entry_name: "La Misilera FC",
          player_name: "Bruno Tomatis",
          total: 2281,
          event_total: 37,
          rank: 23,
          last_rank: 23,
        },
        {
          id: 4043515,
          entry_name: "Lisu FC",
          player_name: "Felipe Graña",
          total: 2257,
          event_total: 45,
          rank: 24,
          last_rank: 25,
        },
        {
          id: 2154820,
          entry_name: "El 11 de Van Bastian",
          player_name: "Pierre Montauban",
          total: 2241,
          event_total: 30,
          rank: 25,
          last_rank: 24,
        },
        {
          id: 5177462,
          entry_name: "FC GDF",
          player_name: "Gaspare Dalla Francesca",
          total: 2237,
          event_total: 49,
          rank: 26,
          last_rank: 26,
        },
        {
          id: 1293971,
          entry_name: "Peñascus Punch",
          player_name: "Eduardo Rehder",
          total: 2193,
          event_total: 52,
          rank: 27,
          last_rank: 27,
        },
        {
          id: 7257253,
          entry_name: "CHARA",
          player_name: "Franco Massa",
          total: 2113,
          event_total: 49,
          rank: 28,
          last_rank: 28,
        },
        {
          id: 5165770,
          entry_name: "Cañete FC",
          player_name: "Jan Nemi",
          total: 2065,
          event_total: 58,
          rank: 29,
          last_rank: 29,
        },
        {
          id: 5655413,
          entry_name: "Binho F.C.",
          player_name: "Robin Vargas",
          total: 2019,
          event_total: 67,
          rank: 30,
          last_rank: 31,
        },
        {
          id: 4952123,
          entry_name: "CHASQUY FC",
          player_name: "Alonso Gonzales",
          total: 2018,
          event_total: 51,
          rank: 31,
          last_rank: 30,
        },
        {
          id: 8423125,
          entry_name: "Busby Cricket Club",
          player_name: "Gregory Leon",
          total: 1974,
          event_total: 56,
          rank: 32,
          last_rank: 32,
        },
      ]

      await supabase.from("teams").upsert(teams)

      // Insert Erik's team summary
      await supabase.from("team_summaries").upsert({
        team_id: 89341,
        event_number: 38,
        points: 55,
        transfers: 2,
        transfers_cost: 0,
        overall_rank: 296692,
        value: 1055,
        bank: 57,
        chip_used: "bboost",
      })

      // Insert Erik's chips
      const chips = [
        { team_id: 89341, chip_type: "wildcard", event_number: 4, used_at: "2024-09-03T22:10:22.228115Z" },
        { team_id: 89341, chip_type: "3xc", event_number: 25, used_at: "2025-02-13T18:02:27.839640Z" },
        { team_id: 89341, chip_type: "wildcard", event_number: 30, used_at: "2025-03-31T20:17:49.958251Z" },
        { team_id: 89341, chip_type: "manager", event_number: 31, used_at: "2025-04-04T11:45:48.246695Z" },
        { team_id: 89341, chip_type: "freehit", event_number: 34, used_at: "2025-04-25T01:54:46.527296Z" },
        { team_id: 89341, chip_type: "bboost", event_number: 38, used_at: "2025-05-21T12:46:29.454945Z" },
      ]

      await supabase.from("chips").upsert(chips)

      await fetchData()
      setMessage("Sample FPL data loaded successfully! All 32 teams and Erik's detailed data are now available.")
    } catch (error) {
      console.error("Error loading sample data:", error)
      setMessage("Error loading sample data")
    } finally {
      setSeeding(false)
    }
  }

  return (
    <div className="min-h-screen p-4 bg-muted/30">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Admin Panel</h1>
          <Button variant="outline" onClick={onLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
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
                <Button onClick={handleSync} disabled={syncing}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Load Sample Data
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">{dbStatus.teams}</div>
                <div className="text-sm font-medium">Teams</div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">{dbStatus.metadata}</div>
                <div className="text-sm font-medium">Metadata</div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">{dbStatus.summaries}</div>
                <div className="text-sm font-medium">Summaries</div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">{dbStatus.chips}</div>
                <div className="text-sm font-medium">Chips</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card>
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Sync from JSON Data Button */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-green-600">Sync from FPL API</h3>
                <p className="text-sm text-muted-foreground">Load all teams and detailed data from the real FPL API</p>
              </div>
              <Button onClick={handleSync} disabled={syncing} variant="default">
                <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Syncing..." : "Sync from FPL API"}
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
                  <strong>Warning:</strong> This will permanently delete all teams, summaries, and chips data.
                </AlertDescription>
              </Alert>
            )}

            {metadata && (
              <>
                <Separator />
                <div className="text-sm text-muted-foreground">
                  Last updated: {new Date(metadata.last_updated).toLocaleString()}
                </div>
              </>
            )}

            {message && (
              <Alert className={message.includes("Error") ? "border-red-200" : "border-green-200"}>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
