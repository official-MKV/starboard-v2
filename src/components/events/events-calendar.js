'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Video,
  Users,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { EventStatusBadge } from './event-status-badge'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  getDay,
} from 'date-fns'

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

export function EventsCalendar({ events, onEventClick, onDateClick, onCreateEvent }) {
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)

  // Calculate calendar dates
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 })
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 })

  const dateFormat = 'MMMM yyyy'
  const dayFormat = 'd'

  // Group events by date
  const eventsByDate = useMemo(() => {
    const grouped = {}

    events.forEach(event => {
      const eventDate = format(new Date(event.startDate), 'yyyy-MM-dd')
      if (!grouped[eventDate]) {
        grouped[eventDate] = []
      }
      grouped[eventDate].push(event)
    })

    return grouped
  }, [events])

  const goToPreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
    setSelectedDate(new Date())
  }

  const handleDateClick = date => {
    setSelectedDate(date)
    onDateClick?.(date)
  }

  const handleEventClick = (event, e) => {
    e.stopPropagation()
    onEventClick?.(event)
  }

  const renderCalendarDays = () => {
    const days = []
    let day = startDate

    while (day <= endDate) {
      const formattedDate = format(day, dayFormat)
      const cloneDay = day
      const dateKey = format(day, 'yyyy-MM-dd')
      const dayEvents = eventsByDate[dateKey] || []

      days.push(
        <div
          key={day.toString()}
          className={`
            min-h-[120px] p-2 border border-gray-200 cursor-pointer transition-colors
            ${!isSameMonth(day, monthStart) ? 'bg-gray-50 text-gray-400' : 'bg-white hover:bg-gray-50'}
            ${isSameDay(day, selectedDate) ? 'bg-blue-50 border-blue-300' : ''}
            ${isToday(day) ? 'ring-2 ring-blue-500 ring-inset' : ''}
          `}
          onClick={() => handleDateClick(cloneDay)}
        >
          {/* Date number */}
          <div className="flex items-center justify-between mb-2">
            <span
              className={`
              text-sm font-medium
              ${!isSameMonth(day, monthStart) ? 'text-gray-400' : 'text-gray-900'}
              ${isToday(day) ? 'text-blue-600 font-bold' : ''}
            `}
            >
              {formattedDate}
            </span>

            {onCreateEvent && isSameMonth(day, monthStart) && (
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                onClick={e => {
                  e.stopPropagation()
                  onCreateEvent(cloneDay)
                }}
              >
                <Plus className="w-3 h-3" />
              </Button>
            )}
          </div>

          {/* Events */}
          <div className="space-y-1">
            {dayEvents.slice(0, 3).map((event, index) => (
              <Tooltip key={event.id}>
                <TooltipTrigger asChild>
                  <div
                    className={`
                      text-xs p-1 rounded truncate cursor-pointer transition-colors
                      ${EVENT_TYPES[event.type]?.color}
                      hover:opacity-80
                    `}
                    onClick={e => handleEventClick(event, e)}
                  >
                    <div className="flex items-center gap-1">
                      {event.virtualLink ? (
                        <Video className="w-3 h-3 flex-shrink-0" />
                      ) : event.location ? (
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                      ) : (
                        <Clock className="w-3 h-3 flex-shrink-0" />
                      )}
                      <span className="truncate">{event.title}</span>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-1">
                    <p className="font-medium">{event.title}</p>
                    <p className="text-xs">
                      {format(new Date(event.startDate), 'h:mm a')} -{' '}
                      {format(new Date(event.endDate), 'h:mm a')}
                    </p>
                    {event.location && (
                      <p className="text-xs flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {event.location}
                      </p>
                    )}
                    {event.virtualLink && (
                      <p className="text-xs flex items-center gap-1">
                        <Video className="w-3 h-3" />
                        Virtual Event
                      </p>
                    )}
                    <p className="text-xs flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {event._count.registrations} registered
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}

            {dayEvents.length > 3 && (
              <div className="text-xs text-gray-500 text-center py-1">
                +{dayEvents.length - 3} more
              </div>
            )}
          </div>
        </div>
      )

      day = addDays(day, 1)
    }

    return days
  }

  const renderDayNames = () => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    return (
      <div className="grid grid-cols-7 border-b border-gray-200">
        {dayNames.map(name => (
          <div key={name} className="p-3 text-center text-sm font-medium text-gray-500 bg-gray-50">
            {name}
          </div>
        ))}
      </div>
    )
  }

  // Selected date events
  const selectedDateEvents = selectedDate
    ? eventsByDate[format(selectedDate, 'yyyy-MM-dd')] || []
    : []

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-900">{format(currentDate, dateFormat)}</h2>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToNextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-3">
          <Card className="starboard-card overflow-hidden">
            <div className="group">
              {renderDayNames()}
              <div className="grid grid-cols-7">{renderCalendarDays()}</div>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Selected Date Events */}
          {selectedDate && (
            <Card className="starboard-card">
              <CardHeader>
                <CardTitle className="text-lg">
                  {isToday(selectedDate) ? 'Today' : format(selectedDate, 'EEEE, MMMM d')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedDateEvents.length > 0 ? (
                  <div className="space-y-3">
                    {selectedDateEvents.map(event => (
                      <div
                        key={event.id}
                        className="p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => router.push(`/events/${event.id}`)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm truncate mb-1">{event.title}</h4>
                            <p className="text-xs text-gray-500 mb-2">
                              {format(new Date(event.startDate), 'h:mm a')} -{' '}
                              {format(new Date(event.endDate), 'h:mm a')}
                            </p>
                            <div className="flex items-center gap-2">
                              <EventStatusBadge
                                startDate={event.startDate}
                                endDate={event.endDate}
                                className="text-xs"
                              />
                              <Badge
                                variant="secondary"
                                className={`${EVENT_TYPES[event.type]?.color} text-xs`}
                              >
                                {EVENT_TYPES[event.type]?.label}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No events scheduled</p>
                    {onCreateEvent && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => onCreateEvent(selectedDate)}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Create Event
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Upcoming Events */}
          <Card className="starboard-card">
            <CardHeader>
              <CardTitle className="text-lg">Upcoming Events</CardTitle>
            </CardHeader>
            <CardContent>
              {events
                .filter(event => new Date(event.startDate) > new Date())
                .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                .slice(0, 5)
                .map(event => (
                  <div
                    key={event.id}
                    className="flex items-center gap-3 py-2 cursor-pointer hover:bg-gray-50 rounded-lg px-2 transition-colors"
                    onClick={() => router.push(`/events/${event.id}`)}
                  >
                    <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{event.title}</p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(event.startDate), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  </div>
                ))}

              {events.filter(event => new Date(event.startDate) > new Date()).length === 0 && (
                <div className="text-center py-6">
                  <Clock className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No upcoming events</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Event Types Legend */}
          <Card className="starboard-card">
            <CardHeader>
              <CardTitle className="text-lg">Event Types</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(EVENT_TYPES).map(([type, config]) => (
                  <div key={type} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded ${config.color.split(' ')[0]}`} />
                    <span className="text-sm">{config.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
