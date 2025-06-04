// components/events/event-table.jsx
'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import {
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Copy,
  UserCheck,
  Users,
  Calendar,
  MapPin,
  Video,
  ExternalLink,
  ArrowUpDown,
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { PermissionWrapper } from '../permissionWrapper'
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

export function EventTable({ events }) {
  const [sortField, setSortField] = useState('startDate')
  const [sortDirection, setSortDirection] = useState('asc')

  const handleSort = field => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortedEvents = [...events].sort((a, b) => {
    let aValue
    let bValue

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
        aValue = a._count?.registrations || 0
        bValue = b._count?.registrations || 0
        break
      default:
        return 0
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  const getEventStatus = (startDate, endDate) => {
    const now = new Date()
    const start = new Date(startDate)
    const end = new Date(endDate)

    if (now < start) return { label: 'Upcoming', color: 'bg-blue-100 text-blue-800' }
    if (now >= start && now <= end)
      return { label: 'Ongoing', color: 'bg-green-100 text-green-800' }
    return { label: 'Completed', color: 'bg-gray-100 text-gray-800' }
  }

  const handleCopyLink = eventId => {
    const eventUrl = `${window.location.origin}/events/${eventId}`
    navigator.clipboard.writeText(eventUrl)
    toast.success('Event link copied to clipboard')
  }

  const handleDelete = async (eventId, eventTitle) => {
    if (
      !confirm(`Are you sure you want to delete "${eventTitle}"? This action cannot be undone.`)
    ) {
      return
    }

    try {
      const response = await fetch(`/api/events/${eventId}`, {
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
    }
  }

  const SortButton = ({ field, children }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-auto p-0 font-medium"
      onClick={() => handleSort(field)}
    >
      {children}
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  )

  return (
    <div className="starboard-table">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
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
              <SortButton field="registrations">Registrations</SortButton>
            </TableHead>
            <TableHead>Speakers</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[70px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedEvents.map(event => {
            const eventType = EVENT_TYPES[event.type] || EVENT_TYPES.OTHER
            const status = getEventStatus(event.startDate, event.endDate)
            const registrationCount = event._count?.registrations || 0
            const speakerCount = event._count?.speakers || 0

            return (
              <TableRow key={event.id} className="hover:bg-gray-50">
                <TableCell className="max-w-0">
                  <div className="space-y-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link
                          href={`/events/${event.id}`}
                          className="font-medium text-gray-900 hover:text-primary truncate block"
                        >
                          {event.title}
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{event.title}</p>
                      </TooltipContent>
                    </Tooltip>
                    {event.description && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className="text-sm text-gray-500 truncate cursor-help">
                            {event.description}
                          </p>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>{event.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    <div className="flex items-center gap-2">
                      {event.isPublic && (
                        <Badge variant="outline" className="text-xs">
                          Public
                        </Badge>
                      )}
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  <Badge className={`${eventType.color} border`}>{eventType.label}</Badge>
                </TableCell>

                <TableCell>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-sm">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(event.startDate), 'MMM d, yyyy')}
                    </div>
                    <div className="text-sm text-gray-500">
                      {format(new Date(event.startDate), 'h:mm a')} -{' '}
                      {format(new Date(event.endDate), 'h:mm a')}
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  <div className="flex items-center gap-1 text-sm">
                    {event.virtualLink ? (
                      <>
                        <Video className="w-3 h-3" />
                        <span>Virtual</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 ml-1"
                          onClick={() => window.open(event.virtualLink, '_blank')}
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <MapPin className="w-3 h-3" />
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="truncate cursor-help max-w-[120px]">
                              {event.location}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{event.location}</p>
                          </TooltipContent>
                        </Tooltip>
                      </>
                    )}
                  </div>
                </TableCell>

                <TableCell>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">
                      {registrationCount}
                      {event.maxAttendees && ` / ${event.maxAttendees}`}
                    </span>
                  </div>
                </TableCell>

                <TableCell>
                  {speakerCount > 0 ? (
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-1">
                        {(event.speakers || []).slice(0, 3).map((speaker, index) => (
                          <Tooltip key={speaker.id}>
                            <TooltipTrigger asChild>
                              <Avatar className="w-6 h-6 border border-white">
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
                          <div className="w-6 h-6 rounded-full bg-gray-100 border border-white flex items-center justify-center">
                            <span className="text-xs text-gray-600">+{speakerCount - 3}</span>
                          </div>
                        )}
                      </div>
                      <span className="text-sm text-gray-500">
                        {speakerCount} speaker{speakerCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500">No speakers</span>
                  )}
                </TableCell>

                <TableCell>
                  <Badge variant="outline" className={status.color}>
                    {status.label}
                  </Badge>
                </TableCell>

                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
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

                      <PermissionWrapper permissions={['events.manage']} fallback={null}>
                        <DropdownMenuItem asChild>
                          <Link href={`/events/${event.id}/edit`}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Event
                          </Link>
                        </DropdownMenuItem>
                      </PermissionWrapper>

                      <DropdownMenuItem onClick={() => handleCopyLink(event.id)}>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Link
                      </DropdownMenuItem>

                      <PermissionWrapper permissions={['events.manage']} fallback={null}>
                        <DropdownMenuItem asChild>
                          <Link href={`/events/${event.id}/registrations`}>
                            <UserCheck className="w-4 h-4 mr-2" />
                            Manage Registrations
                          </Link>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          onClick={() => handleDelete(event.id, event.title)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Event
                        </DropdownMenuItem>
                      </PermissionWrapper>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      {sortedEvents.length === 0 && (
        <div className="text-center py-8 text-gray-500">No events found matching your filters.</div>
      )}
    </div>
  )
}
