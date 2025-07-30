'use client'

import { useQuery } from '@tanstack/react-query'
import { Trophy, Star, BarChart3, MessageSquare, Award, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function DemoDayScoring({ eventId, userSubmission }) {
  const { data: scoringData, isLoading } = useQuery({
    queryKey: ['demo-day-user-scoring', eventId],
    queryFn: async () => {
      const response = await fetch(`/api/events/${eventId}/demo-day/my-submission`)
      if (!response.ok) throw new Error('Failed to fetch scoring data')
      return response.json()
    },
    enabled: !!userSubmission,
  })

  const submission = scoringData?.data?.submission
  const scores = submission?.scores || []

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </CardContent>
      </Card>
    )
  }

  if (!userSubmission) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Submission Found</h3>
          <p className="text-gray-500">You haven't submitted a project for this demo day yet</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Submission Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-red-600" />
            Your Submission
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-xl font-semibold mb-2">{submission?.projectTitle}</h3>
            <p className="text-gray-600">{submission?.description}</p>
          </div>

          <div className="flex items-center gap-4">
            {submission?.rank && (
              <Badge className="bg-yellow-100 text-yellow-800">
                <Award className="w-3 h-3 mr-1" />
                Rank #{submission.rank}
              </Badge>
            )}
            {submission?.averageScore && (
              <Badge variant="outline" className="font-mono">
                {submission.averageScore.toFixed(1)} / 50 points
              </Badge>
            )}
            <Badge variant="secondary">
              {scores.length} judges scored
            </Badge>
          </div>

          {submission?.averageScore && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Overall Score</span>
                <span>{submission.averageScore.toFixed(1)} / 50</span>
              </div>
              <Progress value={(submission.averageScore / 50) * 100} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Individual Scores */}
      {scores.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Judge Scores
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {scores.map((score) => (
              <div key={score.id} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">
                    Judge {score.judge?.firstName} {score.judge?.lastName}
                  </h4>
                  <Badge variant="outline" className="font-mono">
                    {score.totalScore?.toFixed(1) || '0'} / 50
                  </Badge>
                </div>

                {/* Detailed Criteria Scores */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {score.innovation !== null && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Innovation</span>
                        <span>{score.innovation}/10</span>
                      </div>
                      <Progress value={score.innovation * 10} className="h-1" />
                    </div>
                  )}
                  {score.execution !== null && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Execution</span>
                        <span>{score.execution}/10</span>
                      </div>
                      <Progress value={score.execution * 10} className="h-1" />
                    </div>
                  )}
                  {score.marketSize !== null && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Market Size</span>
                        <span>{score.marketSize}/10</span>
                      </div>
                      <Progress value={score.marketSize * 10} className="h-1" />
                    </div>
                  )}
                  {score.team !== null && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Team</span>
                        <span>{score.team}/10</span>
                      </div>
                      <Progress value={score.team * 10} className="h-1" />
                    </div>
                  )}
                  {score.presentation !== null && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Presentation</span>
                        <span>{score.presentation}/10</span>
                      </div>
                      <Progress value={score.presentation * 10} className="h-1" />
                    </div>
                  )}
                </div>

                {score.feedback && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-start gap-2">
                      <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Feedback</p>
                        <p className="text-sm text-gray-600">{score.feedback}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Your submission hasn't been scored by any judges yet. Scores will appear here once judges complete their evaluations.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}