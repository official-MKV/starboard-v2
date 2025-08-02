'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  Video,
  Globe,
  Lock,
  Share2,
  Edit,
  Trash2,
  UserPlus,
  UserMinus,
  PlayCircle,
  ArrowLeft,
  Trophy,
  Award,
  BarChart3,
  Send,
  FileText,
  Tag,
  Star,
  Eye,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { PermissionWrapper } from '@/components/permissionWrapper'
import { CreateEventForm } from '@/components/events/create-event-form'
import { DemoDaySubmissionModal } from '@/components/demo-day/demo-day-submission-modal'
import { DemoDayRankings } from '@/components/demo-day/demo-day-rankings'
import { DemoDayScoring } from '@/components/demo-day/demo-day-scoring'
import { formatDistanceToNow, format, isAfter, isBefore, isWithinInterval } from 'date-fns'
import { toast } from 'sonner'
import { DemoDayJudgeManagement } from '@/components/demo-day/demo-day-judge-management'

const EVENT_TYPES = {
  WORKSHOP: { label: 'Workshop', color: 'bg-blue-100 text-blue-800' },
  MENTORING: { label: 'Mentoring', color: 'bg-green-100 text-green-800' },
  PITCH: { label: 'Pitch', color: 'bg-purple-100 text-purple-800' },
  NETWORKING: { label: 'Networking', color: 'bg-yellow-100 text-yellow-800' },
  DEMO_DAY: { label: 'Demo Day', color: 'bg-red-100 text-red-800' },
  BOOTCAMP: { label: 'Bootcamp', color: 'bg-indigo-100 text-indigo-800' },
  WEBINAR: { label: 'Webinar', color: 'bg-cyan-100 text-cyan-800' },
  OTHER: { label: 'Other', color: 'bg-gray-100 text-gray-800' },
}

export default function EventDetailPage({ params }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [showSubmissionModal, setShowSubmissionModal] = useState(false)
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview')

  const eventId = params.eventId

  const {
    data: eventData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      const response = await fetch(`/api/events/${eventId}`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to fetch event')
      }
      return response.json()
    },
  })
  console.log(eventData)

  const { data: recordingsData } = useQuery({
    queryKey: ['event-recordings', eventId],
    queryFn: async () => {
      const response = await fetch(`/api/events/${eventId}/recordings`)
      if (!response.ok) return { data: { recordings: [] } }
      return response.json()
    },
  })

  const event = eventData?.data?.event
  const recordings = recordingsData?.data?.recordings || []
  const isDemoDay = event?.type === 'DEMO_DAY'
  
  const userSubmission = event?.userSubmission
  const hasSubmitted = !!userSubmission
  const demoDayConfig = event?.demoDayConfig
  const submissionDeadline = demoDayConfig?.submissionDeadline ? new Date(demoDayConfig.submissionDeadline) : null
  const isSubmissionOpen = submissionDeadline ? new Date() <= submissionDeadline : false

  const getEventStatus = () => {
    if (!event) return { label: 'Loading', color: 'bg-gray-500' }

    const now = new Date()
    const startDate = new Date(event.startDate)
    const endDate = new Date(event.endDate)

    const isUpcoming = isAfter(startDate, now)
    const isOngoing = isWithinInterval(now, { start: startDate, end: endDate })
    const isCompleted = isBefore(endDate, now)

    if (isOngoing) return { label: 'Live', color: 'bg-green-500' }
    if (isUpcoming) return { label: 'Upcoming', color: 'bg-blue-500' }
    if (isCompleted) return { label: 'Completed', color: 'bg-gray-500' }
    return { label: 'Draft', color: 'bg-yellow-500' }
  }

  const eventStatus = getEventStatus()
  
  const userRegistration = event?.registrations?.find(reg => reg.user.id === session?.user?.id)
  const isRegistered = !!userRegistration
  const isCreator = event?.creator.id === session?.user?.id
  const isUpcoming = event ? isAfter(new Date(event.startDate), new Date()) : false
  const isCompleted = event ? isBefore(new Date(event.endDate), new Date()) : false

  const registerMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/events/${eventId}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to register')
      }

      return response.json()
    },
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ['event', eventId] })
      if (data.data.type === 'waitlist') {
        toast.success(`Added to waitlist at position ${data.data.position}`)
      } else {
        toast.success('Successfully registered for event')
      }
    },
    onError: error => {
      toast.error(error.message)
    },
  })

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/events/${eventId}/register`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to cancel registration')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', eventId] })
      toast.success('Registration cancelled')
    },
    onError: error => {
      toast.error(error.message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to delete event')
      }

      return response.json()
    },
    onSuccess: () => {
      toast.success('Event deleted successfully')
      router.push('/events')
    },
    onError: error => {
      toast.error(error.message)
    },
  })

  const handleRegisterToggle = () => {
    if (isRegistered) {
      cancelMutation.mutate()
    } else {
      registerMutation.mutate()
    }
  }

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this event?')) {
      deleteMutation.mutate()
    }
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: event.title,
        text: event.description,
        url: window.location.href,
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast.success('Event link copied to clipboard')
    }
  }

  const formatEventDate = () => {
    if (!event) return ''

    const start = new Date(event.startDate)
    const end = new Date(event.endDate)

    if (format(start, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd')) {
      return `${format(start, 'EEEE, MMMM dd, yyyy • h:mm a')} - ${format(end, 'h:mm a')}`
    }

    return `${format(start, 'EEEE, MMMM dd • h:mm a')} - ${format(end, 'EEEE, MMMM dd • h:mm a')}`
  }

  const getTabs = () => {
    const tabs = [
      { id: 'overview', label: 'Overview' }
    ]

    if (isDemoDay) {
    
      tabs.push(
        { id: 'rankings', label: 'Rankings', icon: Award, permissions: ['events.manage', 'demo-day.judge'] },
        { id: 'judges', label: 'Judge Management', icon: Users, permissions: ['events.manage'] }
      )
    } else {
      tabs.push(
        { id: 'speakers', label: 'Speakers' },
        { id: 'attendees', label: 'Attendees' }
      )
    }

    tabs.push({ id: 'recordings', label: 'Recordings' })
    return tabs
  }

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab && getTabs().some(t => t.id === tab)) {
      setActiveTab(tab)
    } else if (window.location.hash === '#recordings') {
      setActiveTab('recordings')
    }
  }, [searchParams])

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Event not found</h2>
          <p className="text-gray-600 mb-4">
            {error?.message || 'The event you are looking for does not exist or you do not have access to it.'}
          </p>
          <Button onClick={() => router.push('/events')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Events
          </Button>
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="container mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/events')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Events
          </Button>
        </div>

        {/* Banner */}
        {event.bannerImage && (
          <div className="relative h-64 md:h-80 rounded-lg overflow-hidden">
            <img src={event.bannerImage} alt={event.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/30" />
            <div className="absolute bottom-6 left-6 right-6">
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge className={`${eventStatus.color} text-white border-0`}>
                  {eventStatus.label}
                </Badge>
                <Badge variant="secondary" className={EVENT_TYPES[event.type]?.color}>
                  {isDemoDay && <Trophy className="w-3 h-3 mr-1" />}
                  {EVENT_TYPES[event.type]?.label}
                </Badge>
                {event.isPublic ? (
                  <Badge variant="outline" className="bg-white/90 backdrop-blur-sm">
                    <Globe className="w-3 h-3 mr-1" />
                    Public
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-white/90 backdrop-blur-sm">
                    <Lock className="w-3 h-3 mr-1" />
                    Private
                  </Badge>
                )}
                {isDemoDay && hasSubmitted && (
                  <Badge className="bg-green-500 text-white border-0">
                    <Award className="w-3 h-3 mr-1" />
                    Submitted
                  </Badge>
                )}
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{event.title}</h1>
              {event.description && (
                <p className="text-lg text-white/90 max-w-3xl">{event.description}</p>
              )}
            </div>
          </div>
        )}

        {/* Header without banner */}
        {!event.bannerImage && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge className={`${eventStatus.color} text-white border-0`}>
                {eventStatus.label}
              </Badge>
              <Badge variant="secondary" className={EVENT_TYPES[event.type]?.color}>
                {isDemoDay && <Trophy className="w-3 h-3 mr-1" />}
                {EVENT_TYPES[event.type]?.label}
              </Badge>
              {event.isPublic ? (
                <Badge variant="outline">
                  <Globe className="w-3 h-3 mr-1" />
                  Public
                </Badge>
              ) : (
                <Badge variant="outline">
                  <Lock className="w-3 h-3 mr-1" />
                  Private
                </Badge>
              )}
              {isDemoDay && hasSubmitted && (
                <Badge className="bg-green-500 text-white border-0">
                  <Award className="w-3 h-3 mr-1" />
                  Submitted
                </Badge>
              )}
            </div>

            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">{event.title}</h1>
                {event.description && <p className="text-lg text-gray-600">{event.description}</p>}
              </div>
            </div>
          </div>
        )}

      
        <div className="flex flex-wrap items-center gap-3">
        
          {isDemoDay && !hasSubmitted && isSubmissionOpen && (
            <PermissionWrapper permissions={["demo-day.participate", "events.manage"]}>
              <Button
                onClick={() => setShowSubmissionModal(true)}
                className="bg-red-600 hover:bg-red-700 text-white font-medium"
              >
                <Send className="w-4 h-4 mr-2" />
                Submit Your Project
              </Button>
            </PermissionWrapper>
          )}

          {/* Demo Day Score Submissions Button */}
          {isDemoDay && (
            <PermissionWrapper permissions={["demo-day.judge", "events.manage"]}>
              <Button
                variant="outline"
                onClick={() => router.push(`/events/${eventId}/submissions`)}
                className="border-red-200 text-red-700 hover:bg-red-50"
              >
                <Star className="w-4 h-4 mr-2" />
                Score Submissions
              </Button>
            </PermissionWrapper>
          )}

          {/* Regular Event Registration */}
          {!isCreator && isUpcoming && !isDemoDay && (
            <Button
              variant={isRegistered ? 'outline' : 'default'}
              onClick={handleRegisterToggle}
              disabled={registerMutation.isPending || cancelMutation.isPending}
              className={isRegistered ? 'text-red-600 hover:text-red-700 border-red-200' : ''}
            >
              {registerMutation.isPending || cancelMutation.isPending ? (
                <Clock className="w-4 h-4 mr-2 animate-spin" />
              ) : isRegistered ? (
                <UserMinus className="w-4 h-4 mr-2" />
              ) : (
                <UserPlus className="w-4 h-4 mr-2" />
              )}
              {isRegistered ? 'Cancel Registration' : 'Register for Event'}
            </Button>
          )}

          {event.virtualLink && isUpcoming && (isRegistered || isDemoDay) && (
            <Button variant="outline" onClick={() => window.open(event.virtualLink, '_blank')}>
              <Video className="w-4 h-4 mr-2" />
              Join Meeting
            </Button>
          )}

          <Button variant="outline" onClick={handleShare}>
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>

          {/* Edit and Delete Buttons */}
          <PermissionWrapper permission="events.manage">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="outline"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="text-red-600 hover:text-red-700 border-red-200"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          </PermissionWrapper>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className={`grid w-full ${isDemoDay ? 'grid-cols-4' : 'grid-cols-4'}`}>
            {getTabs().map(tab => {
              const tabContent = (
                <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2">
                  {tab.icon && <tab.icon className="w-4 h-4" />}
                  {tab.label}
                  {tab.id === 'recordings' && recordings.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {recordings.length}
                    </Badge>
                  )}
                </TabsTrigger>
              )

              // Wrap tabs that require permissions
              if (tab.permissions) {
                return (
                  <PermissionWrapper 
                    key={tab.id} 
                    permissions={tab.permissions} 
                    requireAll={false}
                  >
                    {tabContent}
                  </PermissionWrapper>
                )
              }

              return tabContent
            })}
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Event Details */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="starboard-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Event Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="font-medium">{formatEventDate()}</p>
                        {isUpcoming && (
                          <p className="text-sm text-gray-500">
                            {formatDistanceToNow(new Date(event.startDate), { addSuffix: true })}
                          </p>
                        )}
                      </div>
                    </div>

                    {(event.location || event.virtualLink) && (
                      <div className="flex items-start gap-3">
                        {event.virtualLink ? (
                          <Video className="w-5 h-5 text-gray-400 mt-0.5" />
                        ) : (
                          <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                        )}
                        <div>
                          <p className="font-medium">
                            {event.virtualLink ? 'Virtual Event' : event.location}
                          </p>
                        </div>
                      </div>
                    )}
                    <PermissionWrapper permissions={["demo-day.judge","events.manage"]}>

                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium">
                          {isDemoDay ? 
                            `${event._count?.demoDaySubmissions || 0} submissions` :
                            `${event._count.registrations} registered${event.maxAttendees ? ` / ${event.maxAttendees} max` : ''}`
                          }
                        </p>
                      </div>
                    </div>

                    </PermissionWrapper>
 
                    {/* Demo Day Specific Info */}
                    {isDemoDay && demoDayConfig && (
                      <>
                        <Separator />
                        <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
                          <h4 className="font-medium text-red-800 flex items-center gap-2">
                            <Trophy className="w-4 h-4" />
                            Hackathon Information
                          </h4>
                          <div className="text-sm text-black space-y-1">
                            <p><strong>Submission Deadline:</strong> {format(submissionDeadline, 'EEEE, MMMM dd, yyyy • h:mm a')}</p>
                            <p><strong>Max Team Size:</strong> {demoDayConfig.maxTeamSize} members</p>
                            <p><strong>Pitch Duration:</strong> {demoDayConfig.maxPitchDuration} minutes</p>
                            {hasSubmitted && (
                              <p className="text-green-700 font-medium">✓ Your submission has been received</p>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Agenda */}
                {event.agenda && (
                  <Card className="starboard-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Agenda
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="prose prose-sm max-w-none">
                        <pre className="whitespace-pre-wrap font-sans text-sm">{event.agenda}</pre>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Instructions */}
                {event.instructions && (
                  <Card className="starboard-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Instructions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="prose prose-sm max-w-none">
                        <pre className="whitespace-pre-wrap font-sans text-sm">{event.instructions}</pre>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Tags */}
                {event.tags && event.tags.length > 0 && (
                  <Card className="starboard-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <Tag className="w-4 h-4" />
                        Tags
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {event.tags.map(tag => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Quick Stats */}
                <Card className="starboard-card">
                  <CardHeader>
                    <CardTitle className="text-sm">Quick Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {!isDemoDay && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Speakers</span>
                          <span className="font-medium">{event._count.speakers}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Registered</span>
                          <span className="font-medium">{event._count.registrations}</span>
                        </div>
                      </>
                    )}
                    {isDemoDay && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Submissions</span>
                        <span className="font-medium">{event._count?.demoDaySubmissions || 0}</span>
                      </div>
                    )}
                    {recordings.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Recordings</span>
                        <span className="font-medium">{recordings.length}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Demo Day Tabs */}
          {isDemoDay && (
            <>
              <PermissionWrapper permissions={['events.manage', 'demo-day.judge']} requireAll={false}>
                <TabsContent value="rankings">
                  <DemoDayRankings eventId={eventId} />
                </TabsContent>
              </PermissionWrapper>

              <PermissionWrapper permission="events.manage">
                <TabsContent value="judges">
                  <DemoDayJudgeManagement eventId={eventId} />
                </TabsContent>
              </PermissionWrapper>
            </>
          )}

          {/* Regular Event Tabs */}
          {!isDemoDay && (
            <>
              <TabsContent value="speakers">
                {/* Speakers content - keep existing implementation */}
              </TabsContent>

              <TabsContent value="attendees">
                {/* Attendees content - keep existing implementation */}
              </TabsContent>
            </>
          )}

          {/* Recordings Tab */}
          <TabsContent value="recordings">
            {/* Recordings content - keep existing implementation */}
          </TabsContent>
        </Tabs>

        {/* Edit Dialog */}
        <PermissionWrapper permission="events.manage">
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Event</DialogTitle>
              </DialogHeader>
              <CreateEventForm
                eventId={eventId}
                onSuccess={() => {
                  setIsEditDialogOpen(false)
                  refetch()
                  toast.success('Event updated successfully')
                }}
                onCancel={() => setIsEditDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </PermissionWrapper>

        {/* Demo Day Submission Modal */}
        {showSubmissionModal && (
          <DemoDaySubmissionModal
            event={event}
            onClose={() => setShowSubmissionModal(false)}
            onSuccess={() => {
              setShowSubmissionModal(false)
              refetch()
              toast.success('Submission created successfully!')
            }}
          />
        )}
      </div>
    </TooltipProvider>
  )
}