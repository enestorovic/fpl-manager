import Image from "next/image"
import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  size?: "sm" | "md" | "lg"
  showText?: boolean
}

export function Logo({ className, size = "md", showText = true }: LogoProps) {
  const sizeClasses = {
    sm: "h-10 w-10",
    md: "h-16 w-16",
    lg: "h-20 w-20"
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
          <span className="font-bold text-xl leading-tight text-pink-700">
            LA JUNGLA LV
          </span>
          <span className="text-sm font-medium text-pink-600/70 leading-tight tracking-wide">
            Premier League
          </span>
        </div>
      )}
    </div>
  )
}