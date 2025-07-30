"use client"

import { useState, useEffect } from "react"
import { Calendar, Users, ArrowUp, ExternalLink, Settings, Plus } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { usePermissions } from "@/lib/hooks/usePermissions"
import { PERMISSIONS } from "@/lib/utils/permissions"
import Link from "next/link"

export function UpcomingEvents({ userId }) {
  const { hasPermission } = usePermissions()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })
  }

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  useEffect(() => {
    const fetchEvents = async () => {
      if (!hasPermission(PERMISSIONS.EVENTS_VIEW)) {
        setLoading(false)
        return
      }

      try {
        const response = await fetch("/api/events/statistics")
        if (response.ok) {
          const data = await response.json()
          setEvents(data?.data?.upcomingEventsList || [])
        }
      } catch (error) {
        console.error("Error fetching events:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [hasPermission])

  if (!hasPermission(PERMISSIONS.EVENTS_VIEW)) {
    return null
  }

  if (loading) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Upcoming Events</h2>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="starboard-card">
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-6 bg-gray-200 rounded mb-4"></div>
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-2 bg-gray-200 rounded"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Upcoming Events</h2>
        {hasPermission(PERMISSIONS.EVENTS_CREATE) && (
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Schedule Event
          </Button>
        )}
      </div>

      {events.length === 0 ? (
        <Card className="starboard-card">
          <CardContent className="p-8 text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No upcoming events</h3>
            <p className="text-gray-600 mb-6">Schedule your first event to get started.</p>
            {hasPermission(PERMISSIONS.EVENTS_CREATE) && (
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Schedule Event
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {events.map((event) => {
            const registrationPercentage = (event.registrationCount / event.maxAttendees) * 100
            const isFull = registrationPercentage >= 100
            const isRegistrationOpen = event.isRegistrationOpen && !isFull

            return (
              <Card key={event.id} className="starboard-card hover:shadow-lg transition-shadow duration-200">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg font-semibold mb-1">{event.title}</CardTitle>
                      <div className="text-sm text-gray-600">
                        {formatDate(event.startDate)} at {formatTime(event.startDate)}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">{event.daysUntil} days away</div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant={event.type === "PITCH" ? "default" : "secondary"}>{event.type}</Badge>
                      <Badge
                        variant={isRegistrationOpen ? "default" : "secondary"}
                        className={
                          isRegistrationOpen
                            ? "bg-green-100 text-green-800"
                            : isFull
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                        }
                      >
                        {isFull ? "Full" : isRegistrationOpen ? "Open" : "Closed"}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">
                          {event.registrationCount}/{event.maxAttendees} registered
                        </span>
                      </div>
                      {event.registrationTrend > 0 && (
                        <div className="flex items-center text-green-600">
                          <ArrowUp className="w-4 h-4" />
                          <span className="text-sm">+{event.registrationTrend} new</span>
                        </div>
                      )}
                    </div>
                    <Progress value={registrationPercentage} className="h-2" />
                  </div>

                  <div className="flex gap-2">
                    <Button asChild variant="outline" size="sm" className="flex-1 bg-transparent">
                      <Link href={`/events/${event.id}`}>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View Event
                      </Link>
                    </Button>
                    {hasPermission(PERMISSIONS.EVENTS_MANAGE) && (
                      <Button asChild variant="outline" size="sm" className="flex-1 bg-transparent">
                        <Link href={`/events/${event.id}/registrations`}>
                          <Settings className="w-4 h-4 mr-2" />
                          Manage
                        </Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
