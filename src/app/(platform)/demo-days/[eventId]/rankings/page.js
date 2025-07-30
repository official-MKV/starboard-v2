'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, Download, Settings, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LiveRankings } from '@/components/demo-day/LiveRankings'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useSession } from 'next-auth/react'

export default function RankingsPage({ params }) {
  const { eventId } = params
  const { data: session } = useSession()
  const [showDetailed, setShowDetailed] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Fetch event to check if user is owner
  const { data: eventData } = useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      const response = await fetch(`/api/events/${eventId}`)
      if (!response.ok) throw new Error('Failed to fetch event')
      return response.json()
    },
  })

  // Fetch demo day config
  const { data: configData } = useQuery({
    queryKey: ['demo-day-config', eventId],
    queryFn: async () => {
      const response = await fetch(`/api/demo-days/${eventId}/config`)
      if (!response.ok) throw new Error('Failed to fetch config')
      return response.json()
    },
  })

  const event = eventData?.data?.event
  const config = configData?.data?.config
  const isEventOwner = event?.creatorId === session?.user?.id
  const showResultsLive = config?.showResultsLive
  const resultsPublic = config?.resultsPublicAt ? new Date(config.resultsPublicAt) <= new Date() : false

  const canViewResults = isEventOwner || showResultsLive || resultsPublic

  if (!canViewResults) {
    return (
      <div className="container mx-auto px-6 py-8">
        <Card>
          <CardContent className="p-12 text-center">
            <EyeOff className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Results Not Available</h3>
            <p className="text-gray-600">
              The results will be available {config?.resultsPublicAt 
                ? `on ${new Date(config.resultsPublicAt).toLocaleDateString()}`
                : 'when the organizer makes them public'
              }.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            Live Rankings
          </h1>
          <p className="text-gray-600">Real-time demo day results and rankings</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Switch 
              id="detailed" 
              checked={showDetailed}
              onCheckedChange={setShowDetailed}
            />
            <Label htmlFor="detailed">Show Detailed Scores</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch 
              id="auto-refresh" 
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
            />
            <Label htmlFor="auto-refresh">Auto Refresh</Label>
          </div>

          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Results
          </Button>
        </div>
      </div>

      {/* Live Rankings */}
      <LiveRankings 
        eventId={eventId}
        showDetailed={showDetailed}
        autoRefresh={autoRefresh}
      />
    </div>
  )
}