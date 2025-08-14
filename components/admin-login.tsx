"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Lock } from "lucide-react"

interface AdminLoginProps {
  onLogin: () => void
}

export function AdminLogin({ onLogin }: AdminLoginProps) {
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    // Simple hardcoded admin code - in production this would be more secure
    if (code === "letmein123") {
      onLogin()
    } else {
      setError("Invalid admin code")
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Admin Access</CardTitle>
          <p className="text-sm text-muted-foreground">Enter the admin code to manage the FPL league</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="password"
                placeholder="Enter admin code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={loading}
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Verifying..." : "Login"}
            </Button>
          </form>
          {/* <div className="mt-4 text-xs text-muted-foreground text-center">Demo code: letmein123</div> */}
        </CardContent>
      </Card>
    </div>
  )
}
