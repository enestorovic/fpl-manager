"use client"

import { Trophy, Award, FileText, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"

interface BottomNavProps {
  activeTab: "league" | "cup" | "bases" | "stats"
  onTabChange: (tab: "league" | "cup" | "bases" | "stats") => void
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50">
      <div className="flex">
        <button
          onClick={() => onTabChange("league")}
          className={cn(
            "flex-1 flex flex-col items-center justify-center py-3 px-4 text-sm font-medium transition-colors",
            activeTab === "league" ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Trophy className="h-5 w-5 mb-1" />
          Liga
        </button>
        <button
          onClick={() => onTabChange("cup")}
          className={cn(
            "flex-1 flex flex-col items-center justify-center py-3 px-4 text-sm font-medium transition-colors",
            activeTab === "cup" ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Award className="h-5 w-5 mb-1" />
          Copas
        </button>
        <button
          onClick={() => onTabChange("bases")}
          className={cn(
            "flex-1 flex flex-col items-center justify-center py-3 px-4 text-sm font-medium transition-colors",
            activeTab === "bases" ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <FileText className="h-5 w-5 mb-1" />
          Bases
        </button>
        <button
          onClick={() => onTabChange("stats")}
          className={cn(
            "flex-1 flex flex-col items-center justify-center py-3 px-4 text-sm font-medium transition-colors",
            activeTab === "stats" ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <BarChart3 className="h-5 w-5 mb-1" />
          Stats
        </button>
      </div>
    </div>
  )
}
