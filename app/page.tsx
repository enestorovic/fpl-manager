"use client"

import { useState, useEffect } from "react"
import { BottomNav } from "@/components/bottom-nav"
import { LeagueStandings } from "@/components/league-standings"
import { TeamSummarySheet } from "@/components/team-summary-sheet"
import { AdminLogin } from "@/components/admin-login"
import { AdminPanel } from "@/components/admin-panel"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Settings } from "lucide-react"
import { getTeams } from "@/lib/database"
import type { Team } from "@/lib/supabase"

export default function Home() {
  const [activeTab, setActiveTab] = useState<"league" | "cup">("league")
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [showTeamSheet, setShowTeamSheet] = useState(false)
  const [teams, setTeams] = useState<Team[]>([])
  const [sortBy, setSortBy] = useState<"event_total" | "total">("total") // Updated default value
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAdmin, setShowAdmin] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    fetchTeams()
  }, [sortBy])

  const fetchTeams = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getTeams(sortBy)
      setTeams(data)
    } catch (error) {
      console.error("Error fetching teams:", error)
      setError("Failed to load teams. Please check your database setup.")
    } finally {
      setLoading(false)
    }
  }

  const handleTeamSelect = (team: Team) => {
    setSelectedTeam(team)
    setShowTeamSheet(true)
  }

  const handleSortChange = (newSortBy: "event_total" | "total") => {
    setSortBy(newSortBy)
  }

  if (showAdmin && !isAdmin) {
    return <AdminLogin onLogin={() => setIsAdmin(true)} />
  }

  if (isAdmin) {
    return (
      <AdminPanel
        onLogout={() => {
          setIsAdmin(false)
          setShowAdmin(false)
        }}
      />
    )
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-xl font-bold">FPL Mini League</h1>
          <Button variant="ghost" size="icon" onClick={() => setShowAdmin(true)}>
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>
              {error}
              <br />
              <span className="text-xs">
                Make sure to run the database setup scripts in order: 001-create-tables.sql,
                003-fix-existing-tables.sql, then 002-seed-data.sql
              </span>
            </AlertDescription>
          </Alert>
        )}

        {activeTab === "league" && (
          <div className="max-w-2xl mx-auto">
            {/* League Standings - Full Width on Mobile */}
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <LeagueStandings
                teams={teams}
                onTeamSelect={handleTeamSelect}
                onSortChange={handleSortChange}
                sortBy={sortBy}
              />
            )}
          </div>
        )}
      </main>

      {/* Team Details Sheet */}
      <TeamSummarySheet team={selectedTeam} open={showTeamSheet} onOpenChange={setShowTeamSheet} />

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}
