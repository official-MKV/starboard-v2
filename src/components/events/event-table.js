'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  Video,
  Globe,
  Lock,
  MoreVertical,
  Edit,
  Trash2,
  ExternalLink,
  UserPlus,
  UserMinus,
  PlayCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Trophy,
  Send,
  Award,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PermissionWrapper } from '../permissionWrapper'
import { DemoDaySubmissionModal } from '../demo-day/demo-day-submission-modal'
import { formatDistanceToNow, format, isAfter, isBefore, isWithinInterval } from 'date-fns'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'

const EVENT_TYPES = {
  WORKSHOP: { label: 'Workshop', color: 'bg-blue-100 text-blue-800' },
  MENTORING: { label: 'Mentoring', color: 'bg-green-100 text-green-800' },
  PITCH: { label: 'Pitch', color: 'bg-purple-100 text-purple-800' },
  NETWORKING: { label: 'Networking', color: 'bg-yellow-100 text-yellow-800' },
  DEMO_DAY: { label: 'Hackathon', color: 'bg-red-100 text-red-800' },
  BOOTCAMP: { label: 'Bootcamp', color: 'bg-indigo-100 text-indigo-800' },
  WEBINAR: { label: 'Webinar', color: 'bg-cyan-100 text-cyan-800' },
  OTHER: { label: 'Other', color: 'bg-gray-100 text-gray-800' },
}

export function EventTable({ events, currentUserId, onEdit, onDelete }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [sortField, setSortField] = useState('startDate')
  const [sortDirection, setSortDirection] = useState('asc')
  const [showSubmissionModal, setShowSubmissionModal] = useState(null)

  const getEventStatus = event => {
    const now = new Date()
    const startDate = new Date(event.startDate)
    const endDate = new Date(event.endDate)

    const isUpcoming = isAfter(startDate, now)
    const isOngoing = isWithinInterval(now, { start: startDate, end: endDate })
    const isCompleted = isBefore(endDate, now)

    if (isOngoing) return { label: 'Live', color: 'bg-green-500', priority: 3 }
    if (isUpcoming) return { label: 'Upcoming', color: 'bg-blue-500', priority: 2 }
    if (isCompleted) return { label: 'Completed', color: 'bg-gray-500', priority: 1 }
    return { label: 'Draft', color: 'bg-yellow-500', priority: 0 }
  }

  const handleSort = field => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortedEvents = [...events].sort((a, b) => {
    let aValue, bValue

    switch (sortField) {
      case 'title':
        aValue = a.title.toLowerCase()
        bValue = b.title.toLowerCase()
        break
      case 'startDate':
        aValue = new Date(a.startDate)
        bValue = new Date(b.startDate)
        break
      case 'type':
        aValue = a.type
        bValue = b.type
        break
      case 'registrations':
        aValue = a._count.registrations
        bValue = b._count.registrations
        break
      case 'status':
        aValue = getEventStatus(a).priority
        bValue = getEventStatus(b).priority
        break
      default:
        aValue = a.startDate
        bValue = b.startDate
    }

    if (sortDirection === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
    }
  })

  const SortButton = ({ field, children }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => handleSort(field)}
      className="h-auto p-0 font-medium hover:bg-transparent hover:text-gray-900"
    >
      <span className="mr-1">{children}</span>
      {sortField === field ? (
        sortDirection === 'asc' ? (
          <ArrowUp className="w-3 h-3" />
        ) : (
          <ArrowDown className="w-3 h-3" />
        )
      ) : (
        <ArrowUpDown className="w-3 h-3 opacity-50" />
      )}
    </Button>
  )

  const registerMutation = useMutation({
    mutationFn: async eventId => {
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
      queryClient.invalidateQueries({ queryKey: ['events'] })
      toast.success('Successfully registered for event')
    },
    onError: error => {
      toast.error(error.message)
    },
  })

  const cancelMutation = useMutation({
    mutationFn: async eventId => {
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
      queryClient.invalidateQueries({ queryKey: ['events'] })
      toast.success('Registration cancelled')
    },
    onError: error => {
      toast.error(error.message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async eventId => {
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
      queryClient.invalidateQueries({ queryKey: ['events'] })
      toast.success('Event deleted successfully')
    },
    onError: error => {
      toast.error(error.message)
    },
  })

  const handleRegisterToggle = event => {
    const userRegistration = event.registrations?.find(reg => reg.user.id === currentUserId)
    const isRegistered = !!userRegistration

    if (isRegistered) {
      cancelMutation.mutate(event.id)
    } else {
      registerMutation.mutate(event.id)
    }
  }

  const handleDelete = eventId => {
    if (confirm('Are you sure you want to delete this event?')) {
      deleteMutation.mutate(eventId)
    }
  }

  const handleRowClick = (event) => {
    router.push(`/events/${event.id}`)
  }

  const MobileEventCard = ({ event }) => {
    const eventStatus = getEventStatus(event)
    const userRegistration = event.registrations?.find(reg => reg.user.id === currentUserId)
    const isRegistered = !!userRegistration
    const isCreator = event.creator.id === currentUserId
    const isUpcoming = isAfter(new Date(event.startDate), new Date())
    const isCompleted = isBefore(new Date(event.endDate), new Date())
    const isHackathon = event.type === 'DEMO_DAY'
    
    const demoDayConfig = event.demoDayConfig
    const submissionDeadline = demoDayConfig?.submissionDeadline ? new Date(demoDayConfig.submissionDeadline) : null
    const isSubmissionOpen = submissionDeadline ? new Date() <= submissionDeadline : false
    const hasSubmitted = !!event.userSubmission

    return (
      <Card className="starboard-card mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge className={`${eventStatus.color} text-white border-0`}>
                  {eventStatus.label}
                </Badge>
                <Badge variant="secondary" className={EVENT_TYPES[event.type]?.color}>
                  {isHackathon && <Trophy className="w-3 h-3 mr-1" />}
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
                {isHackathon && hasSubmitted && (
                  <Badge className="bg-green-100 text-green-800">
                    <Award className="w-3 h-3 mr-1" />
                    Submitted
                  </Badge>
                )}
              </div>
              <CardTitle
                className="text-lg cursor-pointer hover:text-blue-600 transition-colors"
                onClick={() => router.push(`/events/${event.id}`)}
              >
                {event.title}
              </CardTitle>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push(`/events/${event.id}`)}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                {isHackathon && (
                  <>
                    <DropdownMenuItem onClick={() => router.push(`/events/${event.id}?tab=submissions`)}>
                      <Trophy className="w-4 h-4 mr-2" />
                      View Submissions
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push(`/events/${event.id}?tab=rankings`)}>
                      <Award className="w-4 h-4 mr-2" />
                      View Rankings
                    </DropdownMenuItem>
                  </>
                )}
                <PermissionWrapper permission="events.manage">
                  {(isCreator || true) && (
                    <>
                      <DropdownMenuItem onClick={() => onEdit?.(event.id)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Event
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDelete(event.id)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Event
                      </DropdownMenuItem>
                    </>
                  )}
                </PermissionWrapper>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="flex items-center text-sm text-gray-600">
            <Calendar className="w-4 h-4 mr-2" />
            <span>{format(new Date(event.startDate), 'MMM dd, yyyy • h:mm a')}</span>
          </div>

          {(event.location || event.virtualLink) && (
            <div className="flex items-center text-sm text-gray-600">
              {event.virtualLink ? (
                <Video className="w-4 h-4 mr-2" />
              ) : (
                <MapPin className="w-4 h-4 mr-2" />
              )}
              <span>{event.virtualLink ? 'Virtual Event' : event.location}</span>
            </div>
          )}

          <div className="flex items-center text-sm text-gray-600">
            <Users className="w-4 h-4 mr-2" />
            <span>
              {isHackathon ? 
                `${event._count?.demoDaySubmissions || 0} submissions` :
                `${event._count.registrations} registered${event.maxAttendees ? ` / ${event.maxAttendees} max` : ''}`
              }
            </span>
          </div>

          {isHackathon && demoDayConfig && (
            <div className="p-3 bg-red-50 rounded border border-red-200">
              <div className="text-xs text-red-700 space-y-1">
                <p><strong>Submission Deadline:</strong> {format(submissionDeadline, 'MMM d, h:mm a')}</p>
                <p><strong>Max Team Size:</strong> {demoDayConfig.maxTeamSize} members</p>
                {hasSubmitted && (
                  <p className="text-green-700 font-medium">✓ Your submission received</p>
                )}
              </div>
            </div>
          )}

          {event.speakers.length > 0 && !isHackathon && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Speakers:</span>
              <div className="flex -space-x-1">
                {event.speakers.slice(0, 3).map(speaker => (
                  <Avatar key={speaker.id} className="w-6 h-6 border border-white">
                    <AvatarImage src={speaker.avatar} alt={speaker.name} />
                    <AvatarFallback className="text-xs">
                      {speaker.name
                        .split(' ')
                        .map(n => n[0])
                        .join('')
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              {event.speakers.length > 3 && (
                <span className="text-xs text-gray-500">+{event.speakers.length - 3} more</span>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              {isCompleted && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(`/events/${event.id}?tab=recordings`)}
                >
                  <PlayCircle className="w-4 h-4 mr-1" />
                  Recordings
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              {isHackathon && !hasSubmitted && isSubmissionOpen && (
                <Button
                  onClick={() => setShowSubmissionModal(event)}
                  className="bg-red-600 hover:bg-red-700 text-white"
                  size="sm"
                >
                  <Send className="w-4 h-4 mr-1" />
                  Submit
                </Button>
              )}

              {!isCreator && isUpcoming && !isHackathon && (
                <Button
                  variant={isRegistered ? 'outline' : 'default'}
                  size="sm"
                  onClick={() => handleRegisterToggle(event)}
                  disabled={registerMutation.isPending || cancelMutation.isPending}
                  className={isRegistered ? 'text-red-600 hover:text-red-700' : ''}
                >
                  {isRegistered ? (
                    <UserMinus className="w-4 h-4 mr-1" />
                  ) : (
                    <UserPlus className="w-4 h-4 mr-1" />
                  )}
                  {isRegistered ? 'Cancel' : 'Register'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="hidden lg:block">
        <div className="starboard-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">
                  <SortButton field="title">Event</SortButton>
                </TableHead>
                <TableHead>
                  <SortButton field="type">Type</SortButton>
                </TableHead>
                <TableHead>
                  <SortButton field="startDate">Date & Time</SortButton>
                </TableHead>
                <TableHead>Location</TableHead>
                <TableHead>
                  <SortButton field="registrations">Participants</SortButton>
                </TableHead>
                <TableHead>
                  <SortButton field="status">Status</SortButton>
                </TableHead>
                <TableHead className="w-[150px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedEvents.map(event => {
                const eventStatus = getEventStatus(event)
                const userRegistration = event.registrations?.find(
                  reg => reg.user.id === currentUserId
                )
                const isRegistered = !!userRegistration
                const isCreator = event.creator.id === currentUserId
                const isUpcoming = isAfter(new Date(event.startDate), new Date())
                const isCompleted = isBefore(new Date(event.endDate), new Date())
                const isHackathon = event.type === 'DEMO_DAY'
                
                const demoDayConfig = event.demoDayConfig
                const submissionDeadline = demoDayConfig?.submissionDeadline ? new Date(demoDayConfig.submissionDeadline) : null
                const isSubmissionOpen = submissionDeadline ? new Date() <= submissionDeadline : false
                const hasSubmitted = !!event.userSubmission

                return (
                  <TableRow
                    key={event.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleRowClick(event)}
                  >
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium text-gray-900 flex items-center gap-2">
                          {event.title}
                          {isHackathon && <Trophy className="w-4 h-4 text-red-600" />}
                        </div>
                        {event.description && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {event.description}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          {event.isPublic ? (
                            <Badge variant="outline" className="text-xs">
                              <Globe className="w-3 h-3 mr-1" />
                              Public
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              <Lock className="w-3 h-3 mr-1" />
                              Private
                            </Badge>
                          )}
                          {isHackathon && hasSubmitted && (
                            <Badge className="bg-green-100 text-green-800 text-xs">
                              <Award className="w-3 h-3 mr-1" />
                              Submitted
                            </Badge>
                          )}
                          {event.speakers.length > 0 && !isHackathon && (
                            <div className="flex -space-x-1">
                              {event.speakers.slice(0, 2).map(speaker => (
                                <Tooltip key={speaker.id}>
                                  <TooltipTrigger asChild>
                                    <Avatar className="w-5 h-5 border border-white">
                                      <AvatarImage src={speaker.avatar} alt={speaker.name} />
                                      <AvatarFallback className="text-xs">
                                        {speaker.name
                                          .split(' ')
                                          .map(n => n[0])
                                          .join('')
                                          .toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{speaker.name}</p>
                                  </TooltipContent>
                                </Tooltip>
                              ))}
                              {event.speakers.length > 2 && (
                                <span className="text-xs text-gray-500 ml-1">
                                  +{event.speakers.length - 2}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        {isHackathon && demoDayConfig && (
                          <div className="text-xs text-red-600">
                            Deadline: {format(submissionDeadline, 'MMM d, h:mm a')}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={EVENT_TYPES[event.type]?.color}>
                        {isHackathon && <Trophy className="w-3 h-3 mr-1" />}
                        {EVENT_TYPES[event.type]?.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm font-medium">
                          {format(new Date(event.startDate), 'MMM dd, yyyy')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {format(new Date(event.startDate), 'h:mm a')} -{' '}
                          {format(new Date(event.endDate), 'h:mm a')}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm text-gray-600">
                        {event.virtualLink ? (
                          <>
                            <Video className="w-4 h-4 mr-1" />
                            Virtual
                          </>
                        ) : event.location ? (
                          <>
                            <MapPin className="w-4 h-4 mr-1" />
                            {event.location.length > 20
                              ? `${event.location.substring(0, 20)}...`
                              : event.location}
                          </>
                        ) : (
                          <span className="text-gray-400">TBD</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {isHackathon ? 
                            (event._count?.demoDaySubmissions || 0) : 
                            event._count.registrations
                          }
                        </span>
                        {event.maxAttendees && !isHackathon && (
                          <span className="text-xs text-gray-500">/ {event.maxAttendees}</span>
                        )}
                        {isRegistered && !isHackathon && (
                          <Badge variant="outline" className="text-xs">
                            Registered
                          </Badge>
                        )}
                        {isHackathon && (
                          <span className="text-xs text-gray-500">submissions</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${eventStatus.color} text-white border-0`}>
                        {eventStatus.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        {isHackathon && !hasSubmitted && isSubmissionOpen && (
                          <Button
                            onClick={() => setShowSubmissionModal(event)}
                            className="bg-red-600 hover:bg-red-700 text-white"
                            size="sm"
                          >
                            <Send className="w-3 h-3 mr-1" />
                            Submit
                          </Button>
                        )}

                        {!isCreator && isUpcoming && !isHackathon && (
                          <Button
                            variant={isRegistered ? 'outline' : 'default'}
                            size="sm"
                            onClick={() => handleRegisterToggle(event)}
                            disabled={registerMutation.isPending || cancelMutation.isPending}
                            className={isRegistered ? 'text-red-600 hover:text-red-700' : ''}
                          >
                            {isRegistered ? (
                              <UserMinus className="w-3 h-3" />
                            ) : (
                              <UserPlus className="w-3 h-3" />
                            )}
                          </Button>
                        )}

                        {isCompleted && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/events/${event.id}?tab=recordings`)}
                          >
                            <PlayCircle className="w-3 h-3" />
                          </Button>
                        )}

                        <PermissionWrapper permission="events.manage">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="w-3 h-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => router.push(`/events/${event.id}`)}>
                                <ExternalLink className="w-4 h-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              {isHackathon && (
                                <>
                                  <DropdownMenuItem onClick={() => router.push(`/events/${event.id}?tab=submissions`)}>
                                    <Trophy className="w-4 h-4 mr-2" />
                                    View Submissions
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => router.push(`/events/${event.id}?tab=rankings`)}>
                                    <Award className="w-4 h-4 mr-2" />
                                    View Rankings
                                  </DropdownMenuItem>
                                </>
                              )}
                              {(isCreator || true) && (
                                <>
                                  <DropdownMenuItem onClick={() => onEdit?.(event.id)}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit Event
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleDelete(event.id)}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete Event
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </PermissionWrapper>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="lg:hidden">
        {sortedEvents.map(event => (
          <MobileEventCard key={event.id} event={event} />
        ))}
      </div>

      {showSubmissionModal && (
        <DemoDaySubmissionModal
          event={showSubmissionModal}
          onClose={() => setShowSubmissionModal(null)}
          onSuccess={() => {
            setShowSubmissionModal(null)
            queryClient.invalidateQueries({ queryKey: ['events'] })
            toast.success('Submission created successfully!')
          }}
        />
      )}
    </>
  )
}