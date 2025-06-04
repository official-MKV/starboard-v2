// components/events/event-card.jsx
'use client'

import { useState } from 'react'
import { format } from 'date-fns'
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
import Link from 'next/link'
import { toast } from 'sonner'

const EVENT_TYPES = {
  WORKSHOP: { label: 'Workshop', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  MENTORING: { label: 'Mentoring', color: 'bg-green-100 text-green-800 border-green-200' },
  PITCH: { label: 'Pitch', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  NETWORKING: { label: 'Networking', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  DEMO_DAY: { label: 'Demo Day', color: 'bg-red-100 text-red-800 border-red-200' },
  BOOTCAMP: { label: 'Bootcamp', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  WEBINAR: { label: 'Webinar', color: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  OTHER: { label: 'Other', color: 'bg-gray-100 text-gray-800 border-gray-200' },
}

export function EventCard({ event }) {
  const [isDeleting, setIsDeleting] = useState(false)

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

  const status = getEventStatus()
  const registrationCount = event._count?.registrations || event.registrations?.length || 0
  const speakerCount = event.speakers?.length || 0

  const handleCopyLink = () => {
    const eventUrl = `${window.location.origin}/events/${event.id}`
    navigator.clipboard.writeText(eventUrl)
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
    <Card className="starboard-card group hover:shadow-lg transition-all duration-200">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={`${eventType.color} border`}>{eventType.label}</Badge>
              <Badge variant="outline" className={status.color}>
                {status.label}
              </Badge>
              {event.isPublic && (
                <Badge variant="outline" className="text-xs">
                  Public
                </Badge>
              )}
            </div>

            <Link href={`/events/${event.id}`}>
              <h3 className="font-semibold text-lg text-gray-900 hover:text-primary transition-colors cursor-pointer truncate-with-tooltip">
                {event.title}
              </h3>
            </Link>

            {event.description && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-sm text-gray-600 line-clamp-2 truncate-with-tooltip">
                    {event.description}
                  </p>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>{event.description}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>

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
              <DropdownMenuItem asChild>
                <Link href={`/events/${event.id}/edit`}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Event
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyLink}>
                <Copy className="w-4 h-4 mr-2" />
                Copy Link
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/events/${event.id}/registrations`}>
                  <UserCheck className="w-4 h-4 mr-2" />
                  Manage Registrations
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {isDeleting ? 'Deleting...' : 'Delete Event'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="w-4 h-4 flex-shrink-0" />
          <span>
            {format(startDate, 'MMM d, yyyy')} at {format(startDate, 'h:mm a')}
            {!format(startDate, 'MMM d, yyyy').includes(format(endDate, 'MMM d, yyyy')) && (
              <>
                {' '}
                - {format(endDate, 'MMM d, yyyy')} at {format(endDate, 'h:mm a')}
              </>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock className="w-4 h-4 flex-shrink-0" />
          <span>{Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60))} minutes</span>
        </div>

        {(event.location || event.virtualLink) && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            {event.virtualLink ? (
              <Video className="w-4 h-4 flex-shrink-0" />
            ) : (
              <MapPin className="w-4 h-4 flex-shrink-0" />
            )}
            <span className="truncate-with-tooltip">
              {event.virtualLink ? 'Virtual Meeting' : event.location}
            </span>
          </div>
        )}

        {speakerCount > 0 && (
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
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Users className="w-4 h-4" />
            <span>
              {registrationCount}
              {event.maxAttendees && ` / ${event.maxAttendees}`} registered
            </span>
          </div>

          <Link href={`/events/${event.id}`}>
            <Button variant="outline" size="sm" className="starboard-button">
              View Details
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
