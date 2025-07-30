'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  Trophy,
  Star,
  MessageSquare,
  Save,
  CheckCircle,
  Clock,
  User,
  ExternalLink,
  BarChart3,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'

export default function JudgeScoringPage({ params }) {
  const { eventId } = params
  const searchParams = useSearchParams()
  const judgeId = searchParams.get('judge')
  const [currentSubmissionIndex, setCurrentSubmissionIndex] = useState(0)
  const [scores, setScores] = useState({})
  const [feedback, setFeedback] = useState('')

  // Fetch event and submissions for judging
  const { data: judgingData, isLoading } = useQuery({
    queryKey: ['judge-scoring', eventId, judgeId],
    queryFn: async () => {
      const response = await fetch(`/api/judge/${eventId}/submissions?judge=${judgeId}`)
      if (!response.ok) throw new Error('Access denied')
      return response.json()
    },
  })

  const { data: myProgressData } = useQuery({
    queryKey: ['judge-progress', eventId, judgeId],
    queryFn: async () => {
      const response = await fetch(`/api/judge/${eventId}/progress?judge=${judgeId}`)
      if (!response.ok) return { data: { completed: 0, total: 0 } }
      return response.json()
    },
  })

  const submissions = judgingData?.data?.submissions || []
  const event = judgingData?.data?.event
  const judge = judgingData?.data?.judge
  const criteria = event?.demoDayConfig?.scoringCriteria || {}
  const maxScore = event?.demoDayConfig?.maxScore || 10
  const progress = myProgressData?.data || { completed: 0, total: submissions.length }

  const currentSubmission = submissions[currentSubmissionIndex]

  // Load existing scores for current submission
  useEffect(() => {
    if (currentSubmission && criteria) {
      const existingScore = currentSubmission.scores?.find(s => s.judgeId === judgeId)
      if (existingScore && existingScore.criteriaScores) {
        // Load existing scores from criteriaScores JSON
        setScores(existingScore.criteriaScores)
        setFeedback(existingScore.feedback || '')
      } else {
        // Initialize with default scores for all criteria
        const defaultScores = {}
        Object.keys(criteria).forEach(criterion => {
          defaultScores[criterion] = maxScore / 2 // Start at middle score
        })
        setScores(defaultScores)
        setFeedback('')
      }
    }
  }, [currentSubmission, judgeId, criteria, maxScore])

  const scoreMutation = useMutation({
    mutationFn: async (scoreData) => {
      const response = await fetch(`/api/judge/${eventId}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          judgeId,
          submissionId: currentSubmission.id,
          ...scoreData,
        }),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to save score')
      }
      return response.json()
    },
    onSuccess: (data) => {
      toast.success('Score saved successfully')
      
      // Update progress
      if (data.data.progress) {
        queryClient.setQueryData(['judge-progress', eventId, judgeId], {
          data: data.data.progress
        })
      }
      
      // Move to next submission if not at the end
      if (currentSubmissionIndex < submissions.length - 1) {
        setCurrentSubmissionIndex(prev => prev + 1)
      } else if (data.data.progress?.isComplete) {
        toast.success('🎉 All submissions scored! Thank you for judging.')
      }
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const handleSubmitScore = () => {
    // Validate all criteria are scored
    const missingCriteria = Object.keys(criteria).filter(criterion => 
      scores[criterion] === undefined || scores[criterion] === null
    )
    
    if (missingCriteria.length > 0) {
      toast.error(`Please score all criteria: ${missingCriteria.join(', ')}`)
      return
    }
    
    scoreMutation.mutate({
      criteriaScores: scores,
      feedback: feedback.trim(),
    })
  }

  const getTotalScore = () => {
    let weightedTotal = 0
    let totalWeight = 0
    
    Object.entries(criteria).forEach(([criterion, weight]) => {
      const score = scores[criterion]
      if (score !== undefined && score !== null) {
        const criterionWeight = parseFloat(weight)
        weightedTotal += (score / maxScore) * criterionWeight
        totalWeight += criterionWeight
      }
    })
    
    return weightedTotal
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
          <p>Loading judging interface...</p>
        </div>
      </div>
    )
  }

  if (!judge || submissions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="text-center py-8">
            <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No submissions to judge</h2>
            <p className="text-gray-600">Check back later or contact the event organizer.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Trophy className="w-6 h-6 text-red-600" />
                {event?.title}
              </h1>
              <p className="text-gray-600">Judge: {judge.user.firstName} {judge.user.lastName}</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Progress</div>
              <div className="font-semibold">{progress.completed} of {progress.total} submissions</div>
              <Progress value={(progress.completed / progress.total) * 100} className="w-32 mt-1" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Submission Details - same as before */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Submission {currentSubmissionIndex + 1} of {submissions.length}</span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentSubmissionIndex === 0}
                      onClick={() => setCurrentSubmissionIndex(prev => prev - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentSubmissionIndex === submissions.length - 1}
                      onClick={() => setCurrentSubmissionIndex(prev => prev + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {currentSubmission.projectTitle}
                  </h2>
                  <p className="text-gray-700 leading-relaxed">
                    {currentSubmission.description}
                  </p>
                  
                  <div className="flex items-center gap-4 mt-4">
                    {currentSubmission.category && (
                      <Badge variant="outline">{currentSubmission.category}</Badge>
                    )}
                    {currentSubmission.stage && (
                      <Badge variant="outline">{currentSubmission.stage}</Badge>
                    )}
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <User className="w-4 h-4" />
                      {currentSubmission.submitter.firstName} {currentSubmission.submitter.lastName}
                    </div>
                  </div>
                </div>

                {/* Resources */}
                {currentSubmission.resources?.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Submission Materials</h3>
                    <div className="grid gap-3">
                      {currentSubmission.resources.map(resource => (
                        <div key={resource.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <h4 className="font-medium">{resource.title}</h4>
                            <p className="text-sm text-gray-600">{resource.type.replace('_', ' ')}</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(resource.url, '_blank')}
                          >
                            <ExternalLink className="w-4 h-4 mr-1" />
                            Open
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {currentSubmission.submissionUrl && (
                  <div>
                    <h3 className="font-semibold mb-2">Project URL</h3>
                    <Button
                      variant="outline"
                      onClick={() => window.open(currentSubmission.submissionUrl, '_blank')}
                      className="w-full"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Project
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Scoring Panel */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  Score Submission
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Dynamic Scoring Criteria */}
                {Object.entries(criteria).map(([criterion, weight]) => (
                  <div key={criterion} className="space-y-2">
                    <div className="flex justify-between">
                      <Label className="font-medium">{criterion}</Label>
                      <span className="text-sm text-gray-600">
                        {scores[criterion] || (maxScore / 2)}/{maxScore}
                      </span>
                    </div>
                    <Slider
                      value={[scores[criterion] || (maxScore / 2)]}
                      onValueChange={([value]) => setScores(prev => ({ ...prev, [criterion]: value }))}
                      max={maxScore}
                      min={0}
                      step={0.5}
                      className="w-full"
                    />
                    <div className="text-xs text-gray-500 flex justify-between">
                      <span>Weight: {weight}%</span>
                      <span>Contribution: {((scores[criterion] || (maxScore / 2)) / maxScore * parseFloat(weight)).toFixed(1)}</span>
                    </div>
                  </div>
                ))}

                <div className="pt-4 border-t">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total Score:</span>
                    <span>{getTotalScore().toFixed(1)}/100</span>
                  </div>
                  <Progress value={getTotalScore()} className="mt-2" />
                </div>

                {/* Feedback */}
                <div className="space-y-2">
                  <Label>Feedback (Optional)</Label>
                  <Textarea
                    placeholder="Provide constructive feedback for the team..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={4}
                  />
                </div>

                <Button 
                  onClick={handleSubmitScore}
                  disabled={scoreMutation.isPending}
                  className="w-full"
                >
                  {scoreMutation.isPending ? (
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Score
                </Button>
              </CardContent>
            </Card>

            {/* Submission Navigation */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">All Submissions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {submissions.map((submission, index) => {
                    const hasScore = submission.scores?.some(s => s.judgeId === judgeId)
                    return (
                      <div
                        key={submission.id}
                        className={`p-2 rounded cursor-pointer transition-colors ${
                          index === currentSubmissionIndex 
                            ? 'bg-blue-100 border border-blue-300' 
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => setCurrentSubmissionIndex(index)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {index + 1}. {submission.projectTitle}
                            </span>
                          </div>
                          {hasScore && (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}