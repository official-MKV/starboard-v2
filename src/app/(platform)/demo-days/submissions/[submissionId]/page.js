'use client'

import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Play, 
  FileText, 
  ExternalLink, 
  Download,
  Star,
  Users,
  Calendar,
  Trophy,
  MessageSquare,
  Eye,
  EyeOff
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'

const RESOURCE_ICONS = {
  VIDEO: Play,
  PRESENTATION: FileText,
  DEMO_LINK: ExternalLink,
  BUSINESS_PLAN: FileText,
  PITCH_DECK: FileText,
  PROTOTYPE: ExternalLink,
  OTHER: FileText,
}

const CRITERIA_LABELS = {
  innovation: 'Innovation',
  execution: 'Execution',
  marketSize: 'Market Size',
  team: 'Team',
  presentation: 'Presentation',
}

export default function SubmissionDetailPage({ params }) {
  const { submissionId } = params
  const router = useRouter()
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState('overview')

  // Fetch submission details
  const { data: submissionData, isLoading, refetch } = useQuery({
    queryKey: ['submission-detail', submissionId],
    queryFn: async () => {
      const response = await fetch(`/api/demo-days/submissions/${submissionId}`)
      if (!response.ok) throw new Error('Failed to fetch submission')
      return response.json()
    },
  })

  // Delete submission mutation
  const deleteSubmissionMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/demo-days/submissions/${submissionId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to delete submission')
      }
      return response.json()
    },
    onSuccess: () => {
      toast.success('Submission deleted successfully')
      router.back()
    },
    onError: (error) => {
      toast.error(error.message)
    },
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

  const submission = submissionData?.data?.submission
  const event = submission?.event

  if (!submission) {
    return (
      <div className="container mx-auto px-6 py-8">
        <Alert>
          <AlertDescription>Submission not found.</AlertDescription>
        </Alert>
      </div>
    )
  }

  const isOwner = submission.submitterId === session?.user?.id
  const canEdit = isOwner && !submission.isSubmitted
  const scoreProgress = submission.averageScore ? (submission.averageScore / 50) * 100 : 0

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getResourceIcon = (type) => {
    const Icon = RESOURCE_ICONS[type] || FileText
    return Icon
  }

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this submission? This action cannot be undone.')) {
      deleteSubmissionMutation.mutate()
    }
  }

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{submission.projectTitle}</h1>
            <p className="text-gray-600">{submission.teamName}</p>
          </div>
        </div>

        <div className="flex gap-2">
          {canEdit && (
            <Button variant="outline" onClick={() => router.push(`/demo-days/submissions/${submissionId}/edit`)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          )}
          {isOwner && (
            <Button 
              variant="outline" 
              onClick={handleDelete}
              disabled={deleteSubmissionMutation.isPending}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          )}
          <Button onClick={() => router.push(`/demo-days/${event.id}/rankings`)}>
            <Trophy className="w-4 h-4 mr-2" />
            View Rankings
          </Button>
        </div>
      </div>

      {/* Status and Badges */}
      <div className="flex flex-wrap gap-2">
        <Badge variant={submission.isSubmitted ? 'default' : 'destructive'}>
          {submission.isSubmitted ? 'Submitted' : 'Draft'}
        </Badge>
        {submission.category && (
          <Badge variant="outline">{submission.category}</Badge>
        )}
        {submission.stage && (
          <Badge variant="secondary">{submission.stage}</Badge>
        )}
        {submission.rank && (
          <Badge className="bg-yellow-100 text-yellow-800">
            Rank #{submission.rank}
          </Badge>
        )}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="resources">Resources</TabsTrigger>
              {submission.scores && submission.scores.length > 0 && (
                <TabsTrigger value="scores">Scores</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Project Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 whitespace-pre-wrap">{submission.description}</p>
                </CardContent>
              </Card>

              {submission.teamMembers && submission.teamMembers.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Team Members
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {submission.teamMembers.map((member, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-medium">
                              {(typeof member === 'string' ? member : member.name)?.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">
                              {typeof member === 'string' ? member : member.name}
                            </p>
                            {typeof member === 'object' && member.role && (
                              <p className="text-sm text-gray-500">{member.role}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="resources" className="space-y-4">
              {submission.resources && submission.resources.length > 0 ? (
                <div className="space-y-4">
                  {submission.resources.map((resource) => {
                    const Icon = getResourceIcon(resource.type)
                    return (
                      <Card key={resource.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Icon className="w-6 h-6 text-blue-600" />
                              <div>
                                <h4 className="font-medium">{resource.title}</h4>
                                <p className="text-sm text-gray-500">{resource.type}</p>
                                {resource.description && (
                                  <p className="text-sm text-gray-600 mt-1">{resource.description}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {resource.url && (
                                <Button variant="outline" size="sm" asChild>
                                  <a href={resource.url} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="w-4 h-4" />
                                  </a>
                                </Button>
                              )}
                              {resource.fileUrl && (
                                <Button variant="outline" size="sm" asChild>
                                  <a href={resource.fileUrl} target="_blank" rel="noopener noreferrer">
                                    <Download className="w-4 h-4" />
                                  </a>
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Resources</h3>
                    <p className="text-gray-600">No resources have been uploaded for this submission.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="scores" className="space-y-4">
              {submission.scores && submission.scores.length > 0 ? (
                <div className="space-y-4">
                  {submission.scores.map((score) => (
                    <Card key={score.id}>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>
                            {score.judge.firstName} {score.judge.lastName}
                          </span>
                          <Badge variant="outline">
                            {score.totalScore} / 50
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-5 gap-4">
                          {Object.entries(CRITERIA_LABELS).map(([key, label]) => (
                            <div key={key} className="text-center">
                              <p className="text-sm text-gray-600">{label}</p>
                              <p className="text-lg font-semibold">
                                {score[key]?.toFixed(1) || '—'}
                              </p>
                            </div>
                          ))}
                        </div>
                        
                        {score.feedback && (
                          <div>
                            <h4 className="font-medium mb-2">Feedback</h4>
                            <p className="text-gray-700 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">
                              {score.feedback}
                            </p>
                          </div>
                        )}

                        <div className="text-sm text-gray-500">
                          Scored on {formatDate(score.scoredAt)}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Star className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Scores Yet</h3>
                    <p className="text-gray-600">This submission hasn't been scored by any judges yet.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Submitter Info */}
          <Card>
            <CardHeader>
              <CardTitle>Submitted By</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={submission.submitter.avatar} />
                  <AvatarFallback>
                    {submission.submitter.firstName[0]}
                    {submission.submitter.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {submission.submitter.firstName} {submission.submitter.lastName}
                  </p>
                  <p className="text-sm text-gray-500">{submission.submitter.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Score Summary */}
          {submission.averageScore !== null && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  Score Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {submission.averageScore?.toFixed(1)} / 50
                  </div>
                  <p className="text-sm text-gray-600">Average Score</p>
                </div>
                
                <Progress value={scoreProgress} className="h-3" />
                
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{submission.scores?.length || 0} judges</span>
                  <span>{Math.round(scoreProgress)}%</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Submission Details */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Pitch Duration:</span>
                <span>{submission.pitchDuration} minutes</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Team Size:</span>
                <span>{submission.teamMembers?.length || 0} members</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Resources:</span>
                <span>{submission.resources?.length || 0} files</span>
              </div>
              
              <Separator />
              
              <div className="flex justify-between">
                <span className="text-gray-600">Created:</span>
                <span className="text-sm">{formatDate(submission.createdAt)}</span>
              </div>
              
              {submission.submittedAt && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Submitted:</span>
                  <span className="text-sm">{formatDate(submission.submittedAt)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Event Info */}
          <Card>
            <CardHeader>
              <CardTitle>Event</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <h4 className="font-medium">{event.title}</h4>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  {formatDate(event.startDate)}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => router.push(`/demo-days/${event.id}`)}
                >
                  View Event
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}