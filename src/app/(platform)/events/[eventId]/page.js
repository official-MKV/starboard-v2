'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
  Download,
  Edit,
  Trash2,
  UserPlus,
  UserMinus,
  PlayCircle,
  ArrowLeft,
  ExternalLink,
  Mail,
  Phone,
  Building,
  User,
  FileText,
  Tag,
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
import { formatDistanceToNow, format, isAfter, isBefore, isWithinInterval } from 'date-fns'
import { toast } from 'sonner'

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
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  const eventId = params.eventId

  // Fetch event details
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

  // Fetch recordings
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

  // Calculate event status
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

  // Check if current user is registered
  const userRegistration = event?.registrations?.find(reg => reg.user.id === session?.user?.id)
  const isRegistered = !!userRegistration
  const isCreator = event?.creator.id === session?.user?.id
  const isUpcoming = event ? isAfter(new Date(event.startDate), new Date()) : false
  const isCompleted = event ? isBefore(new Date(event.endDate), new Date()) : false

  // Registration mutations
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
        if (errorData.error?.code === 'HAS_REGISTRATIONS') {
          if (
            confirm(
              `This event has ${errorData.error.registrationCount} registrations. Are you sure you want to delete it?`
            )
          ) {
            const forceResponse = await fetch(`/api/events/${eventId}?force=true`, {
              method: 'DELETE',
            })
            if (!forceResponse.ok) {
              const forceErrorData = await forceResponse.json()
              throw new Error(forceErrorData.error?.message || 'Failed to delete event')
            }
            return forceResponse.json()
          } else {
            throw new Error('Deletion cancelled')
          }
        }
        throw new Error(errorData.error?.message || 'Failed to delete event')
      }

      return response.json()
    },
    onSuccess: () => {
      toast.success('Event deleted successfully')
      router.push('/events')
    },
    onError: error => {
      if (error.message !== 'Deletion cancelled') {
        toast.error(error.message)
      }
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

  // Handle URL hash for recordings
  useEffect(() => {
    if (window.location.hash === '#recordings') {
      setActiveTab('recordings')
    }
  }, [])

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
            {error?.message ||
              'The event you are looking for does not exist or you do not have access to it.'}
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
            </div>

            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">{event.title}</h1>
                {event.description && <p className="text-lg text-gray-600">{event.description}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {!isCreator && isUpcoming && (
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

          {event.virtualLink && isUpcoming && isRegistered && (
            <Button variant="outline" onClick={() => window.open(event.virtualLink, '_blank')}>
              <Video className="w-4 h-4 mr-2" />
              Join Meeting
            </Button>
          )}

          <Button variant="outline" onClick={handleShare}>
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>

          <PermissionWrapper permission="events.manage">
            {(isCreator || true) && (
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
            )}
          </PermissionWrapper>
        </div>

        {/* Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="speakers">Speakers</TabsTrigger>
            <TabsTrigger value="attendees">Attendees</TabsTrigger>
            <TabsTrigger value="recordings">
              Recordings
              {recordings.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {recordings.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

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
                          {event.virtualLink && (
                            <Button
                              variant="link"
                              size="sm"
                              className="p-0 h-auto text-blue-600"
                              onClick={() => window.open(event.virtualLink, '_blank')}
                            >
                              <ExternalLink className="w-3 h-3 mr-1" />
                              Open Meeting Link
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium">
                          {event._count.registrations} registered
                          {event.maxAttendees && ` / ${event.maxAttendees} max`}
                        </p>
                        {event.maxAttendees && (
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{
                                width: `${Math.min(100, (event._count.registrations / event.maxAttendees) * 100)}%`,
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-gray-400" />
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          <AvatarImage
                            src={event.creator.avatar}
                            alt={`${event.creator.firstName} ${event.creator.lastName}`}
                          />
                          <AvatarFallback>
                            {event.creator.firstName[0]}
                            {event.creator.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">
                          {event.creator.firstName} {event.creator.lastName}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          Organizer
                        </Badge>
                      </div>
                    </div>
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
                        <pre className="whitespace-pre-wrap font-sans text-sm">
                          {event.instructions}
                        </pre>
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

                {/* Resources */}
                {event.resources && event.resources.length > 0 && (
                  <Card className="starboard-card">
                    <CardHeader>
                      <CardTitle className="text-sm">Resources</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {event.resources.map(eventResource => {
                        const resource = eventResource.resource
                        return (
                          <div
                            key={resource.id}
                            className="flex items-center gap-3 p-3 rounded-lg border"
                          >
                            <FileText className="w-4 h-4 text-gray-400" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{resource.title}</p>
                              {resource.description && (
                                <p className="text-xs text-gray-500 truncate">
                                  {resource.description}
                                </p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(resource.fileUrl, '_blank')}
                            >
                              <Download className="w-3 h-3" />
                            </Button>
                          </div>
                        )
                      })}
                    </CardContent>
                  </Card>
                )}

                {/* Quick Stats */}
                <Card className="starboard-card">
                  <CardHeader>
                    <CardTitle className="text-sm">Quick Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Speakers</span>
                      <span className="font-medium">{event._count.speakers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Registered</span>
                      <span className="font-medium">{event._count.registrations}</span>
                    </div>
                    {event.waitlist && event.waitlist.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Waitlist</span>
                        <span className="font-medium">{event.waitlist.length}</span>
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

          {/* Speakers Tab */}
          <TabsContent value="speakers">
            <Card className="starboard-card">
              <CardHeader>
                <CardTitle>Speakers & Presenters</CardTitle>
              </CardHeader>
              <CardContent>
                {event.speakers && event.speakers.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {event.speakers.map(speaker => (
                      <div
                        key={speaker.id}
                        className="flex flex-col items-center text-center p-4 rounded-lg border"
                      >
                        <Avatar className="w-16 h-16 mb-4">
                          <AvatarImage src={speaker.avatar} alt={speaker.name} />
                          <AvatarFallback>
                            {speaker.name
                              .split(' ')
                              .map(n => n[0])
                              .join('')
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        <h3 className="font-semibold text-lg mb-1">{speaker.name}</h3>

                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant={speaker.isExternal ? 'outline' : 'secondary'}>
                            {speaker.isExternal ? 'External' : 'Internal'}
                          </Badge>
                          <Badge variant="outline">{speaker.role}</Badge>
                        </div>

                        {speaker.jobTitle && speaker.company && (
                          <p className="text-sm text-gray-600 mb-2">
                            {speaker.jobTitle} at {speaker.company}
                          </p>
                        )}

                        {speaker.bio && (
                          <p className="text-sm text-gray-700 line-clamp-3">{speaker.bio}</p>
                        )}

                        {speaker.email && (
                          <div className="flex items-center gap-2 mt-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => (window.location.href = `mailto:${speaker.email}`)}
                            >
                              <Mail className="w-3 h-3 mr-1" />
                              Contact
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No speakers added</h3>
                    <p className="text-gray-500">
                      Speakers will be displayed here once they are added to the event.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Attendees Tab */}
          <TabsContent value="attendees">
            <Card className="starboard-card">
              <CardHeader>
                <CardTitle>Registered Attendees</CardTitle>
              </CardHeader>
              <CardContent>
                {event.registrations && event.registrations.length > 0 ? (
                  <div className="space-y-4">
                    {event.registrations.map(registration => (
                      <div
                        key={registration.id}
                        className="flex items-center gap-4 p-3 rounded-lg border"
                      >
                        <Avatar className="w-10 h-10">
                          <AvatarImage
                            src={registration.user.avatar}
                            alt={`${registration.user.firstName} ${registration.user.lastName}`}
                          />
                          <AvatarFallback>
                            {registration.user.firstName[0]}
                            {registration.user.lastName[0]}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1">
                          <p className="font-medium">
                            {registration.user.firstName} {registration.user.lastName}
                          </p>
                          <p className="text-sm text-gray-500">
                            Registered{' '}
                            {formatDistanceToNow(new Date(registration.createdAt), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>

                        <Badge
                          variant={registration.status === 'ATTENDED' ? 'default' : 'secondary'}
                        >
                          {registration.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No registrations yet</h3>
                    <p className="text-gray-500">Registered attendees will appear here.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recordings Tab */}
          <TabsContent value="recordings">
            <Card className="starboard-card">
              <CardHeader>
                <CardTitle>Event Recordings</CardTitle>
              </CardHeader>
              <CardContent>
                {recordings.length > 0 ? (
                  <div className="space-y-6">
                    {recordings.map(recording => (
                      <div key={recording.id} className="border rounded-lg p-6">
                        <div className="flex items-start gap-4">
                          <div className="w-32 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                            {recording.thumbnailUrl ? (
                              <img
                                src={recording.thumbnailUrl}
                                alt={recording.title}
                                className="w-full h-full object-cover rounded-lg"
                              />
                            ) : (
                              <PlayCircle className="w-8 h-8 text-gray-400" />
                            )}
                          </div>

                          <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-2">{recording.title}</h3>
                            {recording.description && (
                              <p className="text-gray-600 mb-3">{recording.description}</p>
                            )}

                            <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                              {recording.duration && (
                                <span>
                                  {Math.floor(recording.duration / 60)}:
                                  {(recording.duration % 60).toString().padStart(2, '0')}
                                </span>
                              )}
                              {recording.format && (
                                <span className="uppercase">{recording.format}</span>
                              )}
                              {recording.quality && <span>{recording.quality}</span>}
                              <span>{recording.viewCount} views</span>
                            </div>

                            <div className="flex gap-2">
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => window.open(recording.recordingUrl, '_blank')}
                              >
                                <PlayCircle className="w-4 h-4 mr-2" />
                                Watch
                              </Button>
                              {recording.downloadUrl && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(recording.downloadUrl, '_blank')}
                                >
                                  <Download className="w-4 h-4 mr-2" />
                                  Download
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <PlayCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No recordings available
                    </h3>
                    <p className="text-gray-500">
                      {isCompleted
                        ? 'Recordings will appear here after the event is processed.'
                        : 'Recordings will be available after the event concludes.'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Dialog */}
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
      </div>
    </TooltipProvider>
  )
}
