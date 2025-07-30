'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Trophy, 
  Users, 
  FileText, 
  BarChart3, 
  Settings, 
  Calendar,
  ExternalLink,
  Copy,
  Eye
} from 'lucide-react'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'
import { usePermissions } from '@/lib/hooks/usePermissions'
import {PERMISSIONS} from "@/lib/utils/permissions"
import { SubmissionForm } from '@/components/demo-day/SubmissionForm'
import { JudgingPanel } from '@/components/demo-day/JudgingPanel'
import { LiveRankings } from '@/components/demo-day/LiveRankings'
import { JudgeAssignment } from '@/components/demo-day/JudgeAssignment'
import { DemoDayStats } from '@/components/demo-day/DemoDayStats'

export default function DemoDayDashboard({params}) {
  const eventId = params.eventId
  const [activeTab, setActiveTab] = useState('overview')
  const router = useRouter()
  const { hasPermission, user } = usePermissions()

  const { data: eventData, isLoading } = useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      const response = await fetch(`/api/events/${eventId}`)
      if (!response.ok) throw new Error('Failed to fetch event')
      return response.json()
    },
    enabled: !!eventId,
  })

  const { data: eligibilityData } = useQuery({
    queryKey: ['demo-day-eligibility', eventId],
    queryFn: async () => {
      const response = await fetch(`/api/events/${eventId}/demo-day/eligibility`)
      if (!response.ok) return { data: { canSubmit: false } }
      return response.json()
    },
    enabled: !!eventId && hasPermission(PERMISSIONS.DEMO_DAY_PARTICIPATE),
  })

  const { data: judgeData } = useQuery({
    queryKey: ['demo-day-judge-check', eventId],
    queryFn: async () => {
      const response = await fetch(`/api/events/${eventId}/demo-day/judges`)
      if (!response.ok) return { data: { judges: [] } }
      const result = await response.json()
      return {
        data: {
          isJudge: result.data.judges.some(j => j.judgeId === user?.id)
        }
      }
    },
    enabled: !!eventId && !!user?.id,
  })

  
  const event = eventData?.data?.event

  const config = event?.demoDayConfig
  const canParticipate = hasPermission(PERMISSIONS.DEMO_DAY_PARTICIPATE)
  const canJudge = hasPermission(PERMISSIONS.DEMO_DAY_JUDGE) && judgeData?.data?.isJudge
  const canManage = hasPermission(PERMISSIONS.DEMO_DAY_MANAGE)
  const canSubmit = eligibilityData?.data?.canSubmit
  const hasExistingSubmission = eligibilityData?.data?.hasExistingSubmission

  const copySubmissionLink = () => {
    const link = `${window.location.origin}/demo-days/${eventId}/submit`
    navigator.clipboard.writeText(link)
    toast.success('Submission link copied to clipboard')
  }

  const copyResultsLink = () => {
    const link = `${window.location.origin}/demo-days/${eventId}/results`
    navigator.clipboard.writeText(link)
    toast.success('Results link copied to clipboard')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!event || event.type !== 'DEMO_DAY') {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-4">Demo Day Not Found</h2>
          <p className="text-gray-600">This event is not configured as a demo day.</p>
        </CardContent>
      </Card>
    )
  }

  const getStatusBadge = () => {
    const now = new Date()
    const submissionDeadline = config?.submissionDeadline ? new Date(config.submissionDeadline) : null
    const judgingStart = config?.judgingStartTime ? new Date(config.judgingStartTime) : null
    const judgingEnd = config?.judgingEndTime ? new Date(config.judgingEndTime) : null

    if (submissionDeadline && now < submissionDeadline) {
      return <Badge className="bg-blue-100 text-blue-800">Submissions Open</Badge>
    }
    if (judgingStart && judgingEnd && now >= judgingStart && now <= judgingEnd) {
      return <Badge className="bg-yellow-100 text-yellow-800">Judging In Progress</Badge>
    }
    if (judgingEnd && now > judgingEnd) {
      return <Badge className="bg-green-100 text-green-800">Judging Complete</Badge>
    }
    return <Badge variant="outline">Preparing</Badge>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{event.title}</h1>
          <p className="text-gray-600 mt-1">{event.description}</p>
          <div className="flex items-center gap-2 mt-2">
            {getStatusBadge()}
            <Badge variant="secondary">
              <Trophy className="w-3 h-3 mr-1" />
              Demo Day
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={copySubmissionLink}
          >
            <Copy className="w-4 h-4 mr-2" />
            Copy Submission Link
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={copyResultsLink}
          >
            <Copy className="w-4 h-4 mr-2" />
            Copy Results Link
          </Button>
          <Button
            variant="outline"
            size="sm"
            asChild
          >
            <a href={`/demo-days/${eventId}/results`} target="_blank" rel="noopener noreferrer">
              <Eye className="w-4 h-4 mr-2" />
              View Public Results
            </a>
          </Button>
        </div>
      </div>

      {config && (
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4" />
                  <span className="font-medium">Submission Deadline</span>
                </div>
                <p className="text-gray-600">
                  {new Date(config.submissionDeadline).toLocaleString()}
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4" />
                  <span className="font-medium">Max Team Size</span>
                </div>
                <p className="text-gray-600">{config.maxTeamSize} members</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Trophy className="w-4 h-4" />
                  <span className="font-medium">Max Score</span>
                </div>
                <p className="text-gray-600">{config.maxScore} points</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4" />
                  <span className="font-medium">Categories</span>
                </div>
                <p className="text-gray-600">
                  {config.categories?.length || 0} categories
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {(canParticipate || hasExistingSubmission) && (
            <TabsTrigger value="submission">My Submission</TabsTrigger>
          )}
          {canJudge && (
            <TabsTrigger value="judging">Judging</TabsTrigger>
          )}
          <TabsTrigger value="rankings">Rankings</TabsTrigger>
          {canManage && (
            <TabsTrigger value="judges">Judges</TabsTrigger>
          )}
          {canManage && (
            <TabsTrigger value="settings">Settings</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview">
          <DemoDayStats eventId={eventId} />
        </TabsContent>

        {(canParticipate || hasExistingSubmission) && (
          <TabsContent value="submission">
            {hasExistingSubmission ? (
              <SubmissionForm
                eventId={eventId}
                submissionId={eligibilityData.data.existingSubmissionId}
                onSuccess={() => router.refresh()}
                onCancel={() => setActiveTab('overview')}
              />
            ) : canSubmit ? (
              <SubmissionForm
                eventId={eventId}
                onSuccess={() => router.refresh()}
                onCancel={() => setActiveTab('overview')}
              />
            ) : (
              <Card className="max-w-2xl mx-auto">
                <CardContent className="p-8 text-center">
                  <h2 className="text-xl font-semibold mb-4">Submission Not Available</h2>
                  <p className="text-gray-600 mb-4">{eligibilityData?.data?.reason}</p>
                  <Button onClick={() => setActiveTab('overview')} variant="outline">
                    Go Back
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        {canJudge && (
          <TabsContent value="judging">
            <JudgingPanel eventId={eventId} judgeId={user?.id} />
          </TabsContent>
        )}

        <TabsContent value="rankings">
          <LiveRankings 
            eventId={eventId} 
            isPublic={false} 
            canManage={canManage} 
          />
        </TabsContent>

        {canManage && (
          <TabsContent value="judges">
            <JudgeAssignment eventId={eventId} />
          </TabsContent>
        )}

        {canManage && (
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Demo Day Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Submission Requirements</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center justify-between">
                          <span>Video Required</span>
                          <Badge variant={config?.requireVideo ? 'default' : 'outline'}>
                            {config?.requireVideo ? 'Yes' : 'No'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Presentation Required</span>
                          <Badge variant={config?.requirePresentation ? 'default' : 'outline'}>
                            {config?.requirePresentation ? 'Yes' : 'No'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Demo Required</span>
                          <Badge variant={config?.requireDemo ? 'default' : 'outline'}>
                            {config?.requireDemo ? 'Yes' : 'No'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Business Plan Required</span>
                          <Badge variant={config?.requireBusinessPlan ? 'default' : 'outline'}>
                            {config?.requireBusinessPlan ? 'Yes' : 'No'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Results Settings</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center justify-between">
                          <span>Show Results Live</span>
                          <Badge variant={config?.showResultsLive ? 'default' : 'outline'}>
                            {config?.showResultsLive ? 'Yes' : 'No'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Show Judge Names</span>
                          <Badge variant={config?.showJudgeNames ? 'default' : 'outline'}>
                            {config?.showJudgeNames ? 'Yes' : 'No'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Show Detailed Scores</span>
                          <Badge variant={config?.showDetailedScores ? 'default' : 'outline'}>
                            {config?.showDetailedScores ? 'Yes' : 'No'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Allow Late Submissions</span>
                          <Badge variant={config?.allowLateSubmissions ? 'default' : 'outline'}>
                            {config?.allowLateSubmissions ? 'Yes' : 'No'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  {config?.categories?.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Categories</h4>
                      <div className="flex flex-wrap gap-2">
                        {config.categories.map(category => (
                          <Badge key={category} variant="outline">
                            {category}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-4">
                    <Button
                      onClick={() => router.push(`/events/${eventId}/edit`)}
                      className="w-full"
                    >
                      Edit Demo Day Configuration
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}