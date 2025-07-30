'use client'

import { useQuery } from '@tanstack/react-query'
import { JudgingPanel } from '@/components/demo-day/JudgingPanel'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { useSession } from 'next-auth/react'

export default function JudgingPage({ params }) {
  const { eventId } = params
  const { data: session } = useSession()

  // Check if user is assigned as judge
  const { data: judgeData, isLoading } = useQuery({
    queryKey: ['judge-assignment', eventId],
    queryFn: async () => {
      const response = await fetch(`/api/demo-days/${eventId}/judges`)
      if (!response.ok) throw new Error('Failed to fetch judges')
      const data = await response.json()
      
      const isAssigned = data.data.judges.some(
        judge => judge.judgeId === session?.user?.id
      )
      
      return { isAssigned, judges: data.data.judges }
    },
    enabled: !!session?.user?.id,
  })

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    )
  }

  if (!judgeData?.isAssigned) {
    return (
      <div className="container mx-auto px-6 py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You are not assigned as a judge for this demo day.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <JudgingPanel 
        eventId={eventId} 
        currentUser={session.user}
      />
    </div>
  )
}