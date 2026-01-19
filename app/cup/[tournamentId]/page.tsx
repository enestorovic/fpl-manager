"use client"

import { useParams, useRouter } from "next/navigation"
import { PublicTournamentViewer } from "@/components/public-tournament-viewer"
import { Logo } from "@/components/logo"
import { BottomNav } from "@/components/bottom-nav"
import { Button } from "@/components/ui/button"
import { Settings } from "lucide-react"

export default function TournamentPage() {
  const params = useParams()
  const router = useRouter()
  const tournamentId = Number(params.tournamentId)

  const handleBack = () => {
    router.push("/")
  }

  const handleTabChange = (tab: "league" | "cup" | "bases" | "stats") => {
    router.push("/")
  }

  if (!tournamentId || isNaN(tournamentId)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-pink-50/30 to-purple-50/20 p-4">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Torneo no encontrado</p>
          <Button onClick={handleBack} className="mt-4">Volver</Button>
        </div>
      </div>
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
            onClick={() => router.push("/")}
            className="hover:bg-pink-100/50 hover:text-pink-700"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Tournament Content */}
      <main className="p-4">
        <div className="max-w-4xl mx-auto">
          <PublicTournamentViewer
            key={tournamentId}
            tournamentId={tournamentId}
            onBack={handleBack}
          />
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNav activeTab="cup" onTabChange={handleTabChange} />
    </div>
  )
}
