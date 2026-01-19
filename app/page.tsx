"use client"

import { useState, useEffect } from "react"
import { BottomNav } from "@/components/bottom-nav"
import { LeagueStandings } from "@/components/league-standings"
import { TeamSummarySheet } from "@/components/team-summary-sheet"
import { AdminLogin } from "@/components/admin-login"
import { AutomatedAdminPanel } from "@/components/automated-admin-panel"
import { PublicTournamentList } from "@/components/public-tournament-list"
import { PublicTournamentViewer } from "@/components/public-tournament-viewer"
import { BasesViewer } from "@/components/bases-viewer"
import { StatsTable } from "@/components/stats-table"
import { Logo } from "@/components/logo"
import { PWAInstallPrompt } from "@/components/pwa-install-prompt"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Settings } from "lucide-react"
import { getTeams, getTeamsByGameweek, getAvailableGameweeks, getCurrentGameweek } from "@/lib/database"
import type { Team } from "@/lib/supabase"

export default function Home() {
  const [activeTab, setActiveTab] = useState<"league" | "cup" | "bases" | "stats">("league")
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [showTeamSheet, setShowTeamSheet] = useState(false)
  const [teams, setTeams] = useState<Team[]>([])
  const [sortBy, setSortBy] = useState<"event_total" | "total">("total")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAdmin, setShowAdmin] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [availableGameweeks, setAvailableGameweeks] = useState<number[]>([])
  const [selectedGameweek, setSelectedGameweek] = useState<number>(1)

  // Tournament state
  const [selectedTournament, setSelectedTournament] = useState<number | null>(null)

  useEffect(() => {
    initializeData()
  }, [])

  useEffect(() => {
    fetchTeams()
  }, [sortBy, selectedGameweek])

  const initializeData = async () => {
    try {
      // Get both available gameweeks and current gameweek
      const [gameweeks, currentGW] = await Promise.all([
        getAvailableGameweeks(),
        getCurrentGameweek()
      ])
      
      setAvailableGameweeks(gameweeks)
      
      // Set default to current gameweek, fall back to latest available
      if (gameweeks.includes(currentGW)) {
        setSelectedGameweek(currentGW)
      } else if (gameweeks.length > 0) {
        setSelectedGameweek(gameweeks[gameweeks.length - 1])
      }
      // Always default to total score sorting
    } catch (error) {
      console.error("Error fetching gameweeks:", error)
    }
  }

  const fetchTeams = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getTeamsByGameweek(selectedGameweek, sortBy)
      setTeams(data)
    } catch (error) {
      console.error("Error fetching teams:", error)
      setError("Failed to load teams. Please check your database setup.")
    } finally {
      setLoading(false)
    }
  }

  const handleGameweekChange = (gameweek: number) => {
    setSelectedGameweek(gameweek)
  }

  const handleTeamSelect = (team: Team) => {
    setSelectedTeam(team)
    setShowTeamSheet(true)
  }

  const handleSortChange = (newSortBy: "event_total" | "total") => {
    setSortBy(newSortBy)
  }

  const handleTournamentSelect = (tournamentId: number) => {
    setSelectedTournament(tournamentId)
  }

  const handleBackToTournaments = () => {
    setSelectedTournament(null)
  }

  if (showAdmin && !isAdmin) {
    return (
      <AdminLogin
        onLogin={() => setIsAdmin(true)}
        onCancel={() => setShowAdmin(false)}
      />
    )
  }

  if (isAdmin) {
    return (
      <AutomatedAdminPanel
        onLogout={() => {
          setIsAdmin(false)
          setShowAdmin(false)
        }}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-pink-50/30 to-purple-50/20 pb-16">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gradient-to-r from-pink-500/10 via-purple-500/5 to-pink-400/10 backdrop-blur-md border-b border-pink-200/50 shadow-sm">
        <div className="flex items-center justify-between p-4 max-w-7xl mx-auto">
          <Logo size="md" />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowAdmin(true)}
            className="hover:bg-pink-100/50 hover:text-pink-700"
          >
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
                availableGameweeks={availableGameweeks}
                selectedGameweek={selectedGameweek}
                onGameweekChange={handleGameweekChange}
              />
            )}
          </div>
        )}

        {activeTab === "cup" && (
          <div className="max-w-4xl mx-auto">
            {selectedTournament ? (
              <PublicTournamentViewer
                key={selectedTournament}
                tournamentId={selectedTournament}
                onBack={handleBackToTournaments}
              />
            ) : (
              <PublicTournamentList onTournamentSelect={handleTournamentSelect} />
            )}
          </div>
        )}

        {activeTab === "bases" && (
          <div className="max-w-4xl mx-auto">
            <BasesViewer />
          </div>
        )}

        {activeTab === "stats" && (
          <div className="max-w-6xl mx-auto">
            <StatsTable />
          </div>
        )}
      </main>

      {/* Team Details Sheet */}
      <TeamSummarySheet team={selectedTeam} open={showTeamSheet} onOpenChange={setShowTeamSheet} />

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />
    </div>
  )
}
