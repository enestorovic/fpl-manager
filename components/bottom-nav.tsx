"use client"

import { Trophy, Award, FileText, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"

interface BottomNavProps {
  activeTab: "league" | "cup" | "bases" | "stats"
  onTabChange: (tab: "league" | "cup" | "bases" | "stats") => void
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-pink-200/50 z-50 shadow-lg">
      <div className="flex">
        <button
          onClick={() => onTabChange("league")}
          className={cn(
            "flex-1 flex flex-col items-center justify-center py-3 px-4 text-sm font-medium transition-all duration-200",
            activeTab === "league"
              ? "text-pink-700 bg-gradient-to-t from-pink-100/80 to-pink-50/40 border-t-2 border-pink-500"
              : "text-slate-600 hover:text-pink-600 hover:bg-pink-50/30",
          )}
        >
          <Trophy className="h-5 w-5 mb-1" />
          Liga
        </button>
        <button
          onClick={() => onTabChange("cup")}
          className={cn(
            "flex-1 flex flex-col items-center justify-center py-3 px-4 text-sm font-medium transition-all duration-200",
            activeTab === "cup"
              ? "text-pink-700 bg-gradient-to-t from-pink-100/80 to-pink-50/40 border-t-2 border-pink-500"
              : "text-slate-600 hover:text-pink-600 hover:bg-pink-50/30",
          )}
        >
          <Award className="h-5 w-5 mb-1" />
          Copas
        </button>
        <button
          onClick={() => onTabChange("bases")}
          className={cn(
            "flex-1 flex flex-col items-center justify-center py-3 px-4 text-sm font-medium transition-all duration-200",
            activeTab === "bases"
              ? "text-pink-700 bg-gradient-to-t from-pink-100/80 to-pink-50/40 border-t-2 border-pink-500"
              : "text-slate-600 hover:text-pink-600 hover:bg-pink-50/30",
          )}
        >
          <FileText className="h-5 w-5 mb-1" />
          Bases
        </button>
        <button
          onClick={() => onTabChange("stats")}
          className={cn(
            "flex-1 flex flex-col items-center justify-center py-3 px-4 text-sm font-medium transition-all duration-200",
            activeTab === "stats"
              ? "text-pink-700 bg-gradient-to-t from-pink-100/80 to-pink-50/40 border-t-2 border-pink-500"
              : "text-slate-600 hover:text-pink-600 hover:bg-pink-50/30",
          )}
        >
          <BarChart3 className="h-5 w-5 mb-1" />
          Stats
        </button>
      </div>
    </div>
  )
}
