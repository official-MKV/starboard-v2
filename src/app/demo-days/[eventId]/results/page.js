'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trophy, Calendar, Users, Star, TrendingUp, AlertCircle, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LiveRankings } from '@/components/demo-day/LiveRankings'
import { useQuery } from '@tanstack/react-query'

export default function PublicResultsPage({ eventId }) {
  const router = useRouter()

  const { data: eventData, isLoading: eventLoading } = useQuery({
    queryKey: ['public-event', eventId],
    queryFn: async () => {
      const response = await fetch(`/api/events/${eventId}`)
      if (!response.ok) throw new Error('Failed to fetch event')
      return response.json()
    },
    enabled: !!eventId,
  })

  const { data: rankingsData, isLoading: rankingsLoading, error } = useQuery({
    queryKey: ['public-rankings', eventId],
    queryFn: async () => {
      const response = await fetch(`/api/events/${eventId}/demo-day/rankings?public=true`)
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Results not yet public')
        }
        throw new Error('Failed to fetch rankings')
      }
      return response.json()
    },
    enabled: !!eventId,
    retry: false,
  })

  const event = eventData?.data?.event
  const config = event?.demoDayConfig
  const rankings = rankingsData?.data?.rankings || []
  const isLoading = eventLoading || rankingsLoading

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!event || event.type !== 'DEMO_DAY') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-4">Demo Day Not Found</h2>
            <p className="text-gray-600">This event is not configured as a demo day or does not exist.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error?.message === 'Results not yet public') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Trophy className="w-8 h-8" />
              <Badge variant="secondary" className="bg-white/20 text-white">
                Demo Day
              </Badge>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{event.title}</h1>
            <p className="text-xl text-blue-100">{event.description}</p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-12">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              The results for this demo day are not yet public. Please check back later or contact the organizers for more information.
            </AlertDescription>
          </Alert>

          <div className="mt-8 text-center">
            <Button 
              variant="outline"
              onClick={() => router.push(`/demo-days/${eventId}/submit`)}
            >
              Back to Demo Day
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-4">Unable to Load Results</h2>
            <p className="text-gray-600 mb-4">{error.message}</p>
            <Button 
              variant="outline"
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const getWinnerBadge = (rank) => {
    switch (rank) {
      case 1:
        return <Badge className="bg-yellow-500 text-white">🥇 Winner</Badge>
      case 2:
        return <Badge className="bg-gray-400 text-white">🥈 Runner-up</Badge>
      case 3:
        return <Badge className="bg-orange-500 text-white">🥉 Third Place</Badge>
      default:
        return null
    }
  }

  const topThree = rankings.slice(0, 3)
  const restOfRankings = rankings.slice(3)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Trophy className="w-8 h-8" />
            <Badge variant="secondary" className="bg-white/20 text-white">
              Demo Day Results
            </Badge>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{event.title}</h1>
          <p className="text-xl text-blue-100 mb-6">{event.description}</p>
          
          <div className="flex items-center justify-center gap-6 text-blue-100">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              <span>{new Date(event.startDate).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              <span>{rankings.length} teams competed</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5" />
              <span>Max score: {config?.maxScore || 50}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {topThree.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-center mb-8">🏆 Top Performers</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {topThree.map((submission, index) => (
                <Card 
                  key={submission.id} 
                  className={`
                    ${index === 0 ? 'ring-2 ring-yellow-400 bg-yellow-50' : ''}
                    ${index === 1 ? 'ring-2 ring-gray-300 bg-gray-50' : ''}
                    ${index === 2 ? 'ring-2 ring-orange-300 bg-orange-50' : ''}
                  `}
                >
                  <CardHeader className="text-center">
                    <div className="flex justify-center mb-2">
                      {index === 0 && <Trophy className="w-12 h-12 text-yellow-500" />}
                      {index === 1 && <Trophy className="w-12 h-12 text-gray-400" />}
                      {index === 2 && <Trophy className="w-12 h-12 text-orange-500" />}
                    </div>
                    {getWinnerBadge(submission.rank)}
                    <CardTitle className="text-lg">{submission.teamName}</CardTitle>
                    <p className="text-gray-600">{submission.projectTitle}</p>
                  </CardHeader>
                  <CardContent className="text-center">
                    <div className="text-3xl font-bold text-blue-600 mb-2">
                      {submission.averageScore?.toFixed(1) || '0.0'}
                    </div>
                    <p className="text-sm text-gray-500 mb-4">
                      Average Score ({submission._count?.scores || 0} judges)
                    </p>
                    
                    {submission.category && (
                      <Badge variant="outline" className="mb-2">
                        {submission.category}
                      </Badge>
                    )}
                    
                    {submission.stage && (
                      <Badge variant="secondary" className="mb-2 capitalize">
                        {submission.stage}
                      </Badge>
                    )}

                    {config?.showDetailedScores && submission.scores && submission.scores.length > 0 && (
                      <div className="mt-4 text-left">
                        <h4 className="font-medium text-sm mb-2">Judge Feedback</h4>
                        {submission.scores.slice(0, 2).map((score, idx) => (
                          score.feedback && (
                            <div key={idx} className="text-xs text-gray-600 italic mb-1">
                              "{score.feedback}"
                              {config?.showJudgeNames && (
                                <span className="text-gray-500"> - {score.judge}</span>
                              )}
                            </div>
                          )
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {rankings.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Complete Rankings
                </CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => router.push(`/demo-days/${eventId}/submit`)}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Submit Your Demo
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <LiveRankings 
                eventId={eventId} 
                isPublic={true} 
                canManage={false} 
              />
            </CardContent>
          </Card>
        )}

        {rankings.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Results Yet</h3>
              <p className="text-gray-600 mb-6">
                Results will be published here once judging is complete.
              </p>
              <Button 
                onClick={() => router.push(`/demo-days/${eventId}/submit`)}
              >
                Submit Your Demo
              </Button>
            </CardContent>
          </Card>
        )}

        {config?.prizes && Array.isArray(config.prizes) && config.prizes.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Prizes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {config.prizes.map((prize, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Trophy className="w-6 h-6 text-yellow-600" />
                      <span className="font-medium">{prize.name}</span>
                    </div>
                    {prize.amount && (
                      <Badge variant="outline" className="bg-white">
                        ${prize.amount.toLocaleString()}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mt-12 text-center">
          <p className="text-gray-600 mb-4">
            Interested in participating in future demo days?
          </p>
          <div className="flex justify-center gap-4">
            <Button 
              variant="outline"
              onClick={() => router.push(`/demo-days/${eventId}/submit`)}
            >
              Learn More About Submissions
            </Button>
            <Button 
              onClick={() => router.push('/events')}
            >
              View All Events
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}