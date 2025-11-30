'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
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
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
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

export default function SubmissionDetailPage({ params }) {
  const router = useRouter()
  const { data: session } = useSession()

  const { eventId, submissionId } = params

  // Fetch submission details
  const { data: submissionData, isLoading } = useQuery({
    queryKey: ['demo-day-submission', eventId, submissionId],
    queryFn: async () => {
      const response = await fetch(`/api/events/${eventId}/demo-day/submissions/${submissionId}`)
      if (!response.ok) throw new Error('Failed to fetch submission')
      return response.json()
    },
  })

  const submission = submissionData?.data?.submission

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!submission) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Submission Not Found</h3>
          <p className="text-sm text-gray-600 mb-4">The submission you're looking for doesn't exist.</p>
          <Button onClick={() => router.push(`/events/${eventId}/submissions`)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Submissions
          </Button>
        </div>
      </div>
    )
  }

  // Get current user's score if they are a judge
  const currentUserScore = submission.scores?.find(score => score.judgeId === session?.user?.id)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/events/${eventId}/submissions`)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Submissions
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {submission.projectTitle}
              </h1>
              <p className="text-sm text-gray-600">
                Submitted by {submission.submitter.firstName} {submission.submitter.lastName}
              </p>
            </div>
          </div>

          {currentUserScore && (
            <div className="p-3 bg-green-50 rounded-lg">
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
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Project Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Project Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">{submission.projectTitle}</h3>
              <p className="text-gray-600">{submission.description}</p>
            </div>

            {/* Submitter Info */}
            <div className="flex items-center gap-4 text-sm text-gray-600 pt-4 border-t">
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
            <div className="flex items-center gap-2">
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
                  Avg Score: {submission.averageScore.toFixed(1)} pts
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Project URL */}
        {submission.submissionUrl && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Live Project</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => {
                  let url = submission.submissionUrl
                  // Add https:// if no protocol is specified
                  if (!url.startsWith('http://') && !url.startsWith('https://')) {
                    url = 'https://' + url
                  }
                  window.open(url, '_blank')
                }}
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
                        onClick={() => {
                          let url = resource.url
                          // Add https:// if no protocol is specified
                          if (!url.startsWith('http://') && !url.startsWith('https://')) {
                            url = 'https://' + url
                          }
                          window.open(url, '_blank')
                        }}
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

        {/* Scores (if available) */}
        {submission.scores && submission.scores.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                Scores ({submission.scores.length} judge{submission.scores.length !== 1 ? 's' : ''})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {submission.scores.map((score) => (
                  <div key={score.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-xs">
                          {score.judge.firstName?.[0]}
                          {score.judge.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">
                          {score.judge.firstName} {score.judge.lastName}
                        </p>
                        {score.feedback && (
                          <p className="text-xs text-gray-600 mt-1">{score.feedback}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-blue-600">{score.totalScore}</p>
                      <p className="text-xs text-gray-500">points</p>
                    </div>
                  </div>
                ))}
              </div>

              {submission.averageScore > 0 && (
                <div className="mt-4 pt-4 border-t text-center">
                  <p className="text-sm text-gray-600 mb-1">Average Score</p>
                  <p className="text-3xl font-bold text-blue-600">{submission.averageScore.toFixed(2)}</p>
                  <p className="text-sm text-gray-500">out of {submission.event?.demoDayConfig?.maxScore || 100}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
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
