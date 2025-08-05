"use client"

import { Trophy, Award } from "lucide-react"
import { cn } from "@/lib/utils"

interface BottomNavProps {
  activeTab: "league" | "cup"
  onTabChange: (tab: "league" | "cup") => void
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
          League
        </button>
        <button
          disabled
          className="flex-1 flex flex-col items-center justify-center py-3 px-4 text-sm font-medium text-muted-foreground/50 cursor-not-allowed"
        >
          <Award className="h-5 w-5 mb-1" />
          Cup
        </button>
      </div>
    </div>
  )
}
