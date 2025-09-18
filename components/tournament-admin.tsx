"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Plus,
  Trophy,
  Users,
  Calendar,
  Settings,
  Play,
  Pause,
  Archive,
  Edit3,
  Trash2,
  Eye
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import type { Tournament } from "@/lib/supabase"
import { TournamentCreateForm } from "@/components/tournament-create-form-v2"
import { TournamentViewer } from "@/components/tournament-viewer"

interface TournamentAdminProps {
  onBack: () => void
}

export function TournamentAdmin({ onBack }: TournamentAdminProps) {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [viewingTournament, setViewingTournament] = useState<number | null>(null)

  useEffect(() => {
    fetchTournaments()
  }, [])

  const fetchTournaments = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setTournaments(data || [])
    } catch (error) {
      console.error('Error fetching tournaments:', error)
      setError('Failed to load tournaments')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500'
      case 'completed': return 'bg-blue-500'
      case 'cancelled': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'group': return <Users className="h-4 w-4" />
      case 'knockout': return <Trophy className="h-4 w-4" />
      case 'mixed': return <Settings className="h-4 w-4" />
      default: return <Trophy className="h-4 w-4" />
    }
  }

  const handleStatusChange = async (tournamentId: number, newStatus: string) => {
    try {
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
      }

      if (newStatus === 'active' && !tournaments.find(t => t.id === tournamentId)?.started_at) {
        updateData.started_at = new Date().toISOString()
      }

      if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString()
      }

      const { error } = await supabase
        .from('tournaments')
        .update(updateData)
        .eq('id', tournamentId)

      if (error) throw error

      await fetchTournaments()
    } catch (error) {
      console.error('Error updating tournament status:', error)
      setError('Failed to update tournament status')
    }
  }

  const handleDeleteTournament = async (tournamentId: number) => {
    if (!confirm('Are you sure you want to delete this tournament? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('tournaments')
        .delete()
        .eq('id', tournamentId)

      if (error) throw error

      await fetchTournaments()
    } catch (error) {
      console.error('Error deleting tournament:', error)
      setError('Failed to delete tournament')
    }
  }

  if (showCreateForm) {
    return (
      <div className="min-h-screen p-4 bg-muted/30">
        <TournamentCreateForm
          onCancel={() => setShowCreateForm(false)}
          onSuccess={() => {
            setShowCreateForm(false)
            fetchTournaments()
          }}
        />
      </div>
    )
  }

  if (viewingTournament) {
    return (
      <div className="min-h-screen p-4 bg-muted/30">
        <TournamentViewer
          tournamentId={viewingTournament}
          onBack={() => setViewingTournament(null)}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 bg-muted/30">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={onBack}>
              ← Back to Admin
            </Button>
            <h1 className="text-2xl font-bold">Tournament Management</h1>
          </div>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Tournament
          </Button>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Tournaments Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="text-sm font-medium">Total Tournaments</p>
                  <p className="text-2xl font-bold">{tournaments.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Play className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium">Active</p>
                  <p className="text-2xl font-bold">
                    {tournaments.filter(t => t.status === 'active').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium">Draft</p>
                  <p className="text-2xl font-bold">
                    {tournaments.filter(t => t.status === 'draft').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Archive className="h-5 w-5 text-gray-600" />
                <div>
                  <p className="text-sm font-medium">Completed</p>
                  <p className="text-2xl font-bold">
                    {tournaments.filter(t => t.status === 'completed').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tournaments List */}
        <Card>
          <CardHeader>
            <CardTitle>All Tournaments</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : tournaments.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No tournaments created yet</p>
                <Button onClick={() => setShowCreateForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Tournament
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {tournaments.map((tournament) => (
                  <div
                    key={tournament.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(tournament.type)}
                        <div>
                          <h3 className="font-medium">{tournament.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {tournament.type === 'group' && tournament.num_groups &&
                              `${tournament.num_groups} groups`}
                            {tournament.type === 'knockout' && 'Single elimination'}
                            {tournament.type === 'mixed' && 'Group + Knockout'}
                            {tournament.description && ` • ${tournament.description}`}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <Badge
                          variant="outline"
                          className={`${getStatusColor(tournament.status)} text-white`}
                        >
                          {tournament.status}
                        </Badge>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <Calendar className="h-3 w-3" />
                          GWs: {tournament.gameweeks.join(', ')}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setViewingTournament(tournament.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        <Button variant="outline" size="sm">
                          <Edit3 className="h-4 w-4" />
                        </Button>

                        {tournament.status === 'draft' && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleStatusChange(tournament.id, 'active')}
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Start
                          </Button>
                        )}

                        {tournament.status === 'active' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusChange(tournament.id, 'completed')}
                          >
                            <Archive className="h-4 w-4 mr-1" />
                            Complete
                          </Button>
                        )}

                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteTournament(tournament.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

