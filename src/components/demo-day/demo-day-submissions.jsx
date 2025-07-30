// app/events/[eventId]/submissions/page.jsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Search,
  Trophy,
  User,
  Calendar,
  Tag,
  Globe,
  FileText,
  Video,
  Presentation,
  ExternalLink,
  Star,
  Send,
  Loader2,
  Eye,
  CheckCircle,
  Clock,
  Filter,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { PermissionWrapper } from '@/components/permissionWrapper'
import { toast } from 'sonner'
import { format } from 'date-fns'

// Helper functions
const getResourceIcon = (type) => {
  switch (type) {
    case "VIDEO": return Video
    case "PRESENTATION": return Presentation
    case "BUSINESS_PLAN": return FileText
    case "DEMO_LINK": return Globe
    default: return FileText
  }
}

const getFileType = (url) => {
  if (!url || typeof url !== 'string') return "unknown"
  const extension = url.split(".").pop()?.toLowerCase()
  if (["jpg", "jpeg", "png", "gif"].includes(extension)) return "image"
  if (["mp4", "webm", "mov"].includes(extension)) return "video"
  if (extension === "pdf") return "pdf"
  return "unknown"
}

const canPreviewFile = (url) => {
  return getFileType(url) !== "unknown"
}

export default function DemoDaySubmissionsPage({ params }) {
  const router = useRouter()
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [filterBy, setFilterBy] = useState('all')
  const [selectedSubmission, setSelectedSubmission] = useState(null)
  const [showScoringModal, setShowScoringModal] = useState(false)

  const eventId = params.eventId

  // Fetch event details with demo day config
  const { data: eventData } = useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      const response = await fetch(`/api/events/${eventId}`)
      if (!response.ok) throw new Error('Failed to fetch event')
      return response.json()
    },
  })

  // Fetch submissions
  const { data: submissionsData, isLoading } = useQuery({
    queryKey: ['demo-day-submissions', eventId],
    queryFn: async () => {
      const response = await fetch(`/api/events/${eventId}/demo-day/submissions`)
      if (!response.ok) throw new Error('Failed to fetch submissions')
      return response.json()
    },
  })

  const event = eventData?.data?.event
  const submissions = submissionsData?.data?.submissions || []

  // Helper functions for scoring status
  const getCurrentUserScore = (submission) => {
    if (!session?.user?.id || !submission.scores) return null
    return submission.scores.find(score => score.judgeId === session.user.id)
  }

  const hasUserScored = (submission) => {
    return !!getCurrentUserScore(submission)
  }

  // Filter and sort submissions
  const filteredSubmissions = submissions
    .filter((submission) => {
      const matchesSearch = 
        submission.projectTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        submission.submitter.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        submission.submitter.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (submission.category && submission.category.toLowerCase().includes(searchTerm.toLowerCase()))
      
      const matchesFilter = 
        filterBy === 'all' ||
        (filterBy === 'scored-by-me' && hasUserScored(submission)) ||
        (filterBy === 'not-scored-by-me' && !hasUserScored(submission))
      
      return matchesSearch && matchesFilter
    })
    .sort((a, b) => {
      // Sort: Not scored by current user first, then scored
      const aScored = hasUserScored(a)
      const bScored = hasUserScored(b)
      
      if (aScored && !bScored) return 1  // a goes after b
      if (!aScored && bScored) return -1 // a goes before b
      
      // If both have same scoring status, sort by project title
      return a.projectTitle.localeCompare(b.projectTitle)
    })

  // Auto-select first unscored submission if none selected
  useEffect(() => {
    if (filteredSubmissions.length > 0 && !selectedSubmission) {
      const firstUnscored = filteredSubmissions.find(s => !hasUserScored(s))
      setSelectedSubmission(firstUnscored || filteredSubmissions[0])
    }
  }, [filteredSubmissions, selectedSubmission])

  // Scoring mutation
  const scoreMutation = useMutation({
    mutationFn: async (scores) => {
      const response = await fetch(`/api/events/${eventId}/demo-day/submissions/${selectedSubmission.id}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scores),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to submit score')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['demo-day-submissions', eventId])
      setShowScoringModal(false)
      toast.success('Score submitted successfully!')
      
      // Auto-select next unscored submission
      const currentIndex = filteredSubmissions.findIndex(s => s.id === selectedSubmission.id)
      const nextUnscored = filteredSubmissions.slice(currentIndex + 1).find(s => !hasUserScored(s))
      if (nextUnscored) {
        setSelectedSubmission(nextUnscored)
      }
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  if (!session) {
    return <div>Please sign in to access this page.</div>
  }

  return (
    <PermissionWrapper permissions={['demo-day.judge', 'demo-day.manage']} requireAll={false}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => router.push(`/events/${eventId}`)}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Event
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {event?.title} - Submissions
                </h1>
                <p className="text-sm text-gray-600">
                  {submissions.length} total submissions
                </p>
              </div>
            </div>

            {/* Sticky Score Button */}
            {selectedSubmission && !hasUserScored(selectedSubmission) && (
              <Button
                onClick={() => setShowScoringModal(true)}
                className="bg-red-600 hover:bg-red-700 text-white font-medium"
              >
                <Star className="w-4 h-4 mr-2" />
                Score Submission
              </Button>
            )}
          </div>
        </div>

        <div className="flex h-[calc(100vh-80px)]">
          {/* Left Sidebar - 30% */}
          <div className="w-[30%] bg-white border-r border-gray-200 flex flex-col">
            {/* Search and Filters */}
            <div className="p-4 border-b border-gray-200 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search submissions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={filterBy} onValueChange={setFilterBy}>
                <SelectTrigger>
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Submissions</SelectItem>
                  <SelectItem value="not-scored-by-me">Not Scored by Me</SelectItem>
                  <SelectItem value="scored-by-me">Scored by Me</SelectItem>
                </SelectContent>
              </Select>

              <div className="text-xs text-gray-500">
                Showing {filteredSubmissions.length} of {submissions.length} submissions
              </div>
            </div>

            {/* Submissions List */}
            <div className="flex-1 overflow-auto">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : filteredSubmissions.length > 0 ? (
                <div className="space-y-1 p-2">
                  {filteredSubmissions.map((submission) => {
                    const isScored = hasUserScored(submission)
                    const isSelected = selectedSubmission?.id === submission.id
                    
                    return (
                      <div
                        key={submission.id}
                        onClick={() => setSelectedSubmission(submission)}
                        className={`
                          p-3 rounded-lg cursor-pointer transition-all
                          ${isSelected ? 'bg-blue-50 border-blue-200 border' : 'hover:bg-gray-50'}
                          ${isScored ? 'opacity-70' : ''}
                        `}
                      >
                        <div className="flex items-start gap-3">
                          {/* Status Indicator */}
                          <div className={`
                            w-3 h-3 rounded-full mt-1 flex-shrink-0
                            ${isScored ? 'bg-green-500' : 'bg-red-500'}
                          `} />
                          
                          <div className="flex-1 min-w-0">
                            <h4 className={`
                              font-medium text-sm truncate
                              ${isScored ? 'text-gray-600' : 'text-gray-900'}
                            `}>
                              {submission.projectTitle}
                            </h4>
                            
                            <div className="flex items-center gap-2 mt-1">
                              <Avatar className="w-4 h-4">
                                <AvatarImage src={submission.submitter.avatar} />
                                <AvatarFallback className="text-xs">
                                  {submission.submitter.firstName?.[0]}
                                  {submission.submitter.lastName?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-gray-500 truncate">
                                {submission.submitter.firstName} {submission.submitter.lastName}
                              </span>
                            </div>

                            {submission.averageScore && (
                              <div className="mt-1">
                                <span className="text-xs text-gray-500">
                                  Avg: {submission.averageScore.toFixed(1)} pts
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Score Status Icon */}
                          {isScored ? (
                            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                          ) : (
                            <Clock className="w-4 h-4 text-red-500 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <Trophy className="w-8 h-8 mb-2" />
                  <p className="text-sm">No submissions found</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Main Content - 70% */}
          <div className="flex-1 bg-white overflow-auto">
            {selectedSubmission ? (
              <SubmissionDetailView 
                submission={selectedSubmission}
                hasUserScored={hasUserScored(selectedSubmission)}
                currentUserScore={getCurrentUserScore(selectedSubmission)}
                onStartScoring={() => setShowScoringModal(true)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <Trophy className="w-16 h-16 mb-4" />
                <h3 className="text-lg font-medium mb-2">Select a Submission</h3>
                <p className="text-sm">Choose a submission from the left to view details</p>
              </div>
            )}
          </div>
        </div>

        {/* Scoring Modal */}
        {showScoringModal && selectedSubmission && (
          <ScoringModal
            submission={selectedSubmission}
            demoDayConfig={event?.demoDayConfig}
            onClose={() => setShowScoringModal(false)}
            onSubmit={scoreMutation.mutate}
            isSubmitting={scoreMutation.isPending}
          />
        )}
      </div>
    </PermissionWrapper>
  )
}

// Submission Detail View Component
function SubmissionDetailView({ submission, hasUserScored, currentUserScore, onStartScoring }) {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="border-b pb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {submission.projectTitle}
            </h2>
            <p className="text-gray-600">{submission.description}</p>
          </div>
          
          {hasUserScored && currentUserScore && (
            <div className="ml-4 p-3 bg-green-50 rounded-lg">
              <div className="text-center">
                <p className="text-sm text-green-600 mb-1">Your Score</p>
                <p className="text-xl font-bold text-green-800">
                  {currentUserScore.totalScore}
                </p>
                <p className="text-xs text-green-600">points</p>
              </div>
            </div>
          )}
        </div>

        {/* Submitter Info */}
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4" />
            <Avatar className="w-6 h-6">
              <AvatarImage src={submission.submitter.avatar} />
              <AvatarFallback className="text-xs">
                {submission.submitter.firstName?.[0]}
                {submission.submitter.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <span>
              {submission.submitter.firstName} {submission.submitter.lastName}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>{format(new Date(submission.submittedAt), 'MMM d, yyyy')}</span>
          </div>
        </div>

        {/* Tags */}
        <div className="flex items-center gap-2 mt-3">
          {submission.category && (
            <Badge variant="outline">
              <Tag className="w-3 h-3 mr-1" />
              {submission.category}
            </Badge>
          )}
          {submission.stage && (
            <Badge variant="outline">{submission.stage}</Badge>
          )}
          {submission.averageScore > 0 && (
            <Badge className="bg-blue-100 text-blue-800">
              Avg: {submission.averageScore.toFixed(1)} pts
            </Badge>
          )}
        </div>
      </div>

      {/* Project URL */}
      {submission.submissionUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Live Project</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => window.open(submission.submissionUrl, '_blank')}
              className="w-full"
              size="lg"
            >
              <Globe className="w-5 h-5 mr-2" />
              Visit Project Website
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Resources */}
      {submission.resources && submission.resources.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Submission Materials</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {submission.resources.map((resource) => {
              const Icon = getResourceIcon(resource.type)
              const fileType = getFileType(resource.url)
              
              return (
                <div key={resource.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="w-5 h-5 text-gray-500" />
                      <h4 className="font-medium">{resource.title}</h4>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(resource.url, '_blank')}
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Open
                    </Button>
                  </div>
                  
                  {resource.description && (
                    <p className="text-sm text-gray-600 ml-7">{resource.description}</p>
                  )}

                  {/* Inline Resource Viewer */}
                  <div className="ml-7">
                    <ResourceViewer resource={resource} fileType={fileType} />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Score Button for unscored submissions */}
      {!hasUserScored && (
        <div className="sticky bottom-6 flex justify-center">
          <Button
            onClick={onStartScoring}
            size="lg"
            className="bg-red-600 hover:bg-red-700 text-white font-medium shadow-lg"
          >
            <Star className="w-5 h-5 mr-2" />
            Score This Submission
          </Button>
        </div>
      )}
    </div>
  )
}

// Resource Viewer Component
function ResourceViewer({ resource, fileType }) {
  switch (fileType) {
    case "image":
      return (
        <div className="max-w-full">
          <img
            src={resource.url}
            alt={resource.title}
            className="max-w-full max-h-96 object-contain rounded-lg border"
          />
        </div>
      )
    case "video":
      return (
        <div className="max-w-full">
          <video
            controls
            className="max-w-full max-h-96 rounded-lg border"
            src={resource.url}
          >
            Your browser does not support the video tag.
          </video>
        </div>
      )
    case "pdf":
      return (
        <iframe
          src={resource.url}
          className="w-full h-96 border rounded-lg"
          title={resource.title}
        />
      )
    default:
      return (
        <div className="p-4 border rounded-lg bg-gray-50">
          <p className="text-sm text-gray-600">
            Preview not available. Click "Open" to view this file.
          </p>
        </div>
      )
  }
}

// Scoring Modal Component
function ScoringModal({ submission, demoDayConfig, onClose, onSubmit, isSubmitting }) {
  // Get scoring criteria directly from config - no hardcoded fallbacks
  const scoringCriteria = demoDayConfig?.scoringCriteria || []
  const scoringWeights = demoDayConfig?.scoringWeights || {}

  // If no criteria in config, fall back to weights-based criteria
  const finalScoringCriteria = scoringCriteria.length > 0 
    ? scoringCriteria 
    : Object.entries(scoringWeights).map(([key, weight]) => ({
        key,
        label: key.charAt(0).toUpperCase() + key.slice(1), // Capitalize first letter
        description: `Score for ${key}`,
        weight
      }))

  // Initialize scoring data - all scores start at 5 (middle value)
  const initializeScoringData = () => {
    const initialData = {
      feedback: '',
      notes: ''
    }
    
    finalScoringCriteria.forEach(criteria => {
      initialData[criteria.key] = [5] // Start at middle value (1-10 scale)
    })
    
    return initialData
  }

  const [scoringData, setScoringData] = useState(initializeScoringData)

  const handleSubmit = () => {
    // Create scores object with raw 1-10 scores
    const scores = {
      feedback: scoringData.feedback.trim() || null,
      notes: scoringData.notes.trim() || null,
      isComplete: true
    }

    // Add each criteria raw score (1-10)
    finalScoringCriteria.forEach(criteria => {
      scores[criteria.key] = scoringData[criteria.key][0]
    })

    // Calculate weighted total score
    const totalScore = finalScoringCriteria.reduce((sum, criteria) => {
      const rawScore = scoringData[criteria.key]?.[0] || 0
      const weightedScore = rawScore * criteria.weight
      return sum + weightedScore
    }, 0)
    
    scores.totalScore = totalScore

    onSubmit(scores)
  }

  // Calculate current weighted total score
  const totalWeightedScore = finalScoringCriteria.reduce((sum, criteria) => {
    const rawScore = scoringData[criteria.key]?.[0] || 0
    const weightedScore = rawScore * criteria.weight
    return sum + weightedScore
  }, 0)

  // Calculate maximum possible weighted score
  const maxTotalScore = finalScoringCriteria.reduce((sum, criteria) => sum + (10 * criteria.weight), 0)

  // Show message if no criteria configured
  if (finalScoringCriteria.length === 0) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>No Scoring Criteria Configured</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-600">
              No scoring criteria have been configured for this demo day event. 
              Please contact the event organizer to set up scoring criteria.
            </p>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            Score: {submission.projectTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Submission Info */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-2">{submission.projectTitle}</h4>
            <p className="text-sm text-gray-600">{submission.description}</p>
          </div>

          {/* Dynamic Weighted Scoring Criteria */}
          <div className="space-y-6">
            {finalScoringCriteria.map((criteria) => {
              const rawScore = scoringData[criteria.key]?.[0] || 5
              const weightedScore = rawScore * criteria.weight
              
              return (
                <div key={criteria.key} className="space-y-3 p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <Label className="text-base font-medium">{criteria.label}</Label>
                      {criteria.description && (
                        <p className="text-sm text-gray-600 mt-1">{criteria.description}</p>
                      )}
                      <p className="text-xs text-blue-600 mt-1">
                        Weight: {criteria.weight} points (max: {criteria.weight * 10})
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-lg font-bold text-blue-600">
                        {rawScore}/10
                      </div>
                      <div className="text-sm text-gray-500">
                        × {criteria.weight} = {weightedScore}
                      </div>
                    </div>
                  </div>
                  
                  <Slider
                    value={scoringData[criteria.key] || [5]}
                    onValueChange={(value) => setScoringData(prev => ({ ...prev, [criteria.key]: value }))}
                    max={10}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                  
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Poor (1) = {1 * criteria.weight} pts</span>
                    <span>Average (5) = {5 * criteria.weight} pts</span>
                    <span>Excellent (10) = {10 * criteria.weight} pts</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Total Weighted Score */}
          <div className="text-center p-6 bg-blue-50 rounded-lg border-2 border-blue-200">
            <p className="text-sm text-blue-600 mb-2">Total Weighted Score</p>
            <p className="text-4xl font-bold text-blue-800 mb-2">{totalWeightedScore}</p>
            <p className="text-sm text-blue-600 mb-3">out of {maxTotalScore} points</p>
            <Progress value={(totalWeightedScore / maxTotalScore) * 100} className="h-3" />
            
            {/* Score Breakdown */}
            <div className="mt-4 text-xs text-blue-600">
              <p>Breakdown: {finalScoringCriteria.map(criteria => {
                const rawScore = scoringData[criteria.key]?.[0] || 5
                const weightedScore = rawScore * criteria.weight
                return `${criteria.label}: ${rawScore}×${criteria.weight}=${weightedScore}`
              }).join(' + ')}</p>
            </div>
          </div>

          {/* Feedback */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="feedback">Feedback for Team (Optional)</Label>
              <Textarea
                id="feedback"
                placeholder="Provide constructive feedback that will be shared with the team..."
                rows={3}
                value={scoringData.feedback}
                onChange={(e) => setScoringData(prev => ({ ...prev, feedback: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Private Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Private notes for your reference (only visible to you and organizers)..."
                rows={2}
                value={scoringData.notes}
                onChange={(e) => setScoringData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting Score...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Score
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}