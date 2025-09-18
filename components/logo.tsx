import Image from "next/image"
import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  size?: "sm" | "md" | "lg"
  showText?: boolean
}

export function Logo({ className, size = "md", showText = true }: LogoProps) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-12 w-12",
    lg: "h-16 w-16"
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className={cn("relative", sizeClasses[size])}>
        <Image
          src="/LOGOjungla.png"
          alt="LV Jungly Logo"
          fill
          className="object-contain logo-transparent"
          priority
        />
      </div>
      {showText && (
        <div className="flex flex-col">
          <span className="font-bold text-foreground text-lg leading-tight">
            LA JUNGLA LV
          </span>
          <span className="text-xs text-muted-foreground leading-tight">
            Premier League
          </span>
        </div>
      )}
    </div>
  )
}