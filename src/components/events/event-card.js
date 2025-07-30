'use client'

import { useState } from 'react'
import { format, isSameDay, differenceInDays } from 'date-fns'
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  Video,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Copy,
  UserCheck,
  Trophy,
  Send,
  Award,
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

import { DemoDaySubmissionModal } from '../demo-day/demo-day-submission-modal'
import Link from 'next/link'
import { toast } from 'sonner'
import { PermissionWrapper } from '../permissionWrapper'

const EVENT_TYPES = {
  WORKSHOP: { label: 'Workshop', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  MENTORING: { label: 'Mentoring', color: 'bg-green-100 text-green-800 border-green-200' },
  PITCH: { label: 'Pitch', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  NETWORKING: { label: 'Networking', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  DEMO_DAY: { label: 'Hackathon', color: 'bg-red-100 text-red-800 border-red-200' },
  BOOTCAMP: { label: 'Bootcamp', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  WEBINAR: { label: 'Webinar', color: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  OTHER: { label: 'Other', color: 'bg-gray-100 text-gray-800 border-gray-200' },
}

export function EventCard({ event, currentUserId }) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [showSubmissionModal, setShowSubmissionModal] = useState(false)

  const eventType = EVENT_TYPES[event.type] || EVENT_TYPES.OTHER
  const startDate = new Date(event.startDate)
  const endDate = new Date(event.endDate)
  const now = new Date()

  const getEventStatus = () => {
    if (now < startDate) return { label: 'Upcoming', color: 'bg-blue-100 text-blue-800' }
    if (now >= startDate && now <= endDate)
      return { label: 'Ongoing', color: 'bg-green-100 text-green-800' }
    return { label: 'Completed', color: 'bg-gray-100 text-gray-800' }
  }

  const formatEventDates = () => {
    const startFormatted = format(startDate, 'MMM d, yyyy')
    const endFormatted = format(endDate, 'MMM d, yyyy')
    const startTime = format(startDate, 'h:mm a')
    const endTime = format(endDate, 'h:mm a')

    // If same day, show: "Mar 15, 2024 • 9:00 AM - 5:00 PM"
    if (isSameDay(startDate, endDate)) {
      return `${startFormatted} • ${startTime} - ${endTime}`
    }

    // If different days, show: "Mar 15, 2024 9:00 AM - Mar 16, 2024 5:00 PM"
    return `${startFormatted} ${startTime} - ${endFormatted} ${endTime}`
  }

  const getEventDuration = () => {
    const daysDiff = differenceInDays(endDate, startDate)
    const totalMinutes = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60))
    
    if (daysDiff >= 1) {
      return `${daysDiff + 1} day${daysDiff > 0 ? 's' : ''}`
    }
    
    if (totalMinutes >= 60) {
      const hours = Math.floor(totalMinutes / 60)
      const minutes = totalMinutes % 60
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
    }
    
    return `${totalMinutes}m`
  }

  const status = getEventStatus()
  const registrationCount = event._count?.registrations || event.registrations?.length || 0
  const speakerCount = event.speakers?.length || 0
  const submissionCount = event._count?.demoDaySubmissions || 0

  const isDemoDay = event.type === 'DEMO_DAY'
  const demoDayConfig = event.demoDayConfig
  const submissionDeadline = demoDayConfig?.submissionDeadline ? new Date(demoDayConfig.submissionDeadline) : null
  const isSubmissionOpen = submissionDeadline ? now <= submissionDeadline : false
  const userSubmission = event.userSubmission
  const hasSubmitted = !!userSubmission

  const handleCopyLink = () => {
    const eventLinkUrl = `${window.location.origin}/events/${event.id}`
    navigator.clipboard.writeText(eventLinkUrl)
    toast.success('Event link copied to clipboard')
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/events/${event.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete event')
      }

      toast.success('Event deleted successfully')
      window.location.reload()
    } catch (error) {
      toast.error('Failed to delete event')
      console.error('Delete error:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <Card className="starboard-card group hover:shadow-lg transition-all duration-200 w-full">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={`${eventType.color} border`}>
                  {isDemoDay && <Trophy className="w-3 h-3 mr-1" />}
                  {eventType.label}
                </Badge>
                <Badge variant="outline" className={status.color}>
                  {status.label}
                </Badge>
                {event.isPublic && (
                  <Badge variant="outline" className="text-xs">
                    Public
                  </Badge>
                )}
              </div>

              <Link href={`/events/${event.id}`} className="block">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <h3 className="font-semibold text-lg text-gray-900 hover:text-primary transition-colors cursor-pointer truncate">
                      {event.title}
                    </h3>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>{event.title}</p>
                  </TooltipContent>
                </Tooltip>
              </Link>

              {event.description && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="text-sm text-gray-600 line-clamp-2 overflow-hidden">
                      {event.description}
                    </p>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>{event.description}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            <div className="flex-shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link href={`/events/${event.id}`}>
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Link>
                  </DropdownMenuItem>
                  <PermissionWrapper permission={"events.manage"}>
                    <DropdownMenuItem asChild>
                      <Link href={`/events/${event.id}/edit`}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Event
                      </Link>
                    </DropdownMenuItem>
                  </PermissionWrapper>
                 
                  <DropdownMenuItem onClick={handleCopyLink}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Link
                  </DropdownMenuItem>
                  {!isDemoDay && (
                    <PermissionWrapper permission={"events.manage"}>
                      <DropdownMenuItem asChild>
                        <Link href={`/events/${event.id}/registrations`}>
                          <UserCheck className="w-4 h-4 mr-2" />
                          Manage Registrations
                        </Link>
                      </DropdownMenuItem>
                    </PermissionWrapper>
                  )}
               
                  <DropdownMenuSeparator />
                  <PermissionWrapper permission={"events.manage"}>
                    <DropdownMenuItem
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {isDeleting ? 'Deleting...' : 'Delete Event'}
                    </DropdownMenuItem>
                  </PermissionWrapper>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Updated date display */}
          <div className="flex items-start gap-2 text-sm text-gray-600 min-w-0">
            <Calendar className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="flex flex-col min-w-0">
              <span className="truncate font-medium">
                {formatEventDates()}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="w-4 h-4 flex-shrink-0" />
            <span>{getEventDuration()}</span>
          </div>

          {(event.location || event.virtualLink) && (
            <div className="flex items-center gap-2 text-sm text-gray-600 min-w-0">
              {event.virtualLink ? (
                <Video className="w-4 h-4 flex-shrink-0" />
              ) : (
                <MapPin className="w-4 h-4 flex-shrink-0" />
              )}
              <span className="truncate">
                {event.virtualLink ? 'Virtual Meeting' : event.location}
              </span>
            </div>
          )}

          {isDemoDay && demoDayConfig && (
            <div className="space-y-3 p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center gap-2 text-sm">
                <Trophy className="w-4 h-4 text-red-600" />
                <span className="font-medium text-red-800">Hackathon Event</span>
              </div>
              <div className="text-xs text-red-700 space-y-1">
                <p><strong>Submission Deadline:</strong> {format(submissionDeadline, 'MMM d, yyyy h:mm a')}</p>
                <p><strong>Max Team Size:</strong> {demoDayConfig.maxTeamSize} members</p>
                {hasSubmitted && (
                  <p className="text-green-700"><strong>✓ Your submission received</strong></p>
                )}
              </div>
              
              {!hasSubmitted && isSubmissionOpen && (
                <Button 
                  onClick={() => setShowSubmissionModal(true)}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-medium"
                  size="sm"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Submit Your Project
                </Button>
              )}
              
              {!hasSubmitted && !isSubmissionOpen && (
                <div className="text-xs text-gray-600 text-center py-2">
                  Submission deadline has passed
                </div>
              )}
            </div>
          )}

          {speakerCount > 0 && !isDemoDay && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Speakers ({speakerCount})</h4>
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {event.speakers.slice(0, 3).map(speaker => (
                    <Tooltip key={speaker.id}>
                      <TooltipTrigger asChild>
                        <Avatar className="w-8 h-8 border-2 border-white">
                          <AvatarImage src={speaker.avatar} />
                          <AvatarFallback className="text-xs">
                            {speaker.name
                              .split(' ')
                              .map(n => n[0])
                              .join('')}
                          </AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{speaker.name}</p>
                        <p className="text-xs text-gray-500">{speaker.role}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                  {speakerCount > 3 && (
                    <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center">
                      <span className="text-xs text-gray-600">+{speakerCount - 3}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <PermissionWrapper permission={"demo-day.manage"}>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="w-4 h-4" />
                <span>
                  {isDemoDay ? 
                    `${submissionCount} submissions` :
                    `${registrationCount}${event.maxAttendees ? ` / ${event.maxAttendees}` : ''} registered`
                  }
                </span>
              </div>
            </PermissionWrapper>
       
            <div className="flex gap-2">
              <Link href={`/events/${event.id}`}>
                <Button variant="outline" size="sm" className="starboard-button">
                  View Details
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  )
}