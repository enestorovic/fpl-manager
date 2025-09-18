"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Trophy,
  Calendar,
  Users,
  Crown,
  Play,
  CheckCircle
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import type { Tournament } from "@/lib/supabase"

interface PublicTournamentListProps {
  onTournamentSelect: (tournamentId: number) => void
}

export function PublicTournamentList({ onTournamentSelect }: PublicTournamentListProps) {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPublicTournaments()
  }, [])

  const fetchPublicTournaments = async () => {
    setLoading(true)
    setError(null)
    try {
      // Only fetch active and completed tournaments
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .in('status', ['active', 'completed'])
        .order('created_at', { ascending: false })

      if (error) throw error
      setTournaments(data || [])
    } catch (error) {
      console.error('Error fetching tournaments:', error)
      setError('Error al cargar los torneos')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500'
      case 'completed': return 'bg-blue-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Play className="h-4 w-4" />
      case 'completed': return <CheckCircle className="h-4 w-4" />
      default: return <Trophy className="h-4 w-4" />
    }
  }

  const getTypeDescription = (tournament: Tournament) => {
    if (tournament.type === 'knockout') return 'Eliminación Directa'
    if (tournament.type === 'group') return `${tournament.num_groups || 0} Grupos`
    if (tournament.type === 'mixed') return 'Grupos + Eliminación'
    return tournament.type
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (tournaments.length === 0) {
    return (
      <div className="text-center py-12">
        <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No Hay Torneos Activos</h3>
        <p className="text-muted-foreground">
          ¡Vuelve más tarde para ver próximas competiciones de copa!
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">Torneos de Copa</h2>
        <p className="text-muted-foreground">
          Sigue la acción en nuestras competiciones de eliminación
        </p>
      </div>

      {tournaments.map((tournament) => (
        <Card key={tournament.id} className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Trophy className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">{tournament.name}</CardTitle>
                  {tournament.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {tournament.description}
                    </p>
                  )}
                </div>
              </div>
              <Badge
                variant="outline"
                className={`${getStatusColor(tournament.status)} text-white flex items-center gap-1`}
              >
                {getStatusIcon(tournament.status)}
                {tournament.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{getTypeDescription(tournament)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>JF: {tournament.gameweeks.join(', ')}</span>
              </div>
            </div>

            {tournament.status === 'completed' && (
              <div className="flex items-center gap-2 mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <Crown className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">
                  Torneo Finalizado - Ver Resultados Finales
                </span>
              </div>
            )}

            <Button
              onClick={() => onTournamentSelect(tournament.id)}
              className="w-full"
            >
              Ver Cuadro del Torneo
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}