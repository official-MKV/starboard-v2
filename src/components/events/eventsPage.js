'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Plus,
  Calendar,
  MapPin,
  Users,
  Clock,
  Video,
  Filter,
  Search,
  Grid,
  List,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { CreateEventForm } from '@/components/events/create-event-form'
import { EventCard } from '@/components/events/event-card'
import { EventTable } from '@/components/events/event-table'
import { EventsCalendar } from '@/components/events/events-calendar'
import { EventsEmptyState } from '@/components/events/events-empty-state'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { PermissionWrapper } from '../permissionWrapper'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'

const EVENT_TYPES = [
  { value: 'WORKSHOP', label: 'Workshop', color: 'bg-blue-100 text-blue-800' },
  { value: 'MENTORING', label: 'Mentoring', color: 'bg-green-100 text-green-800' },
  { value: 'PITCH', label: 'Pitch', color: 'bg-purple-100 text-purple-800' },
  { value: 'NETWORKING', label: 'Networking', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'DEMO_DAY', label: 'Demo Day', color: 'bg-red-100 text-red-800' },
  { value: 'BOOTCAMP', label: 'Bootcamp', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'WEBINAR', label: 'Webinar', color: 'bg-cyan-100 text-cyan-800' },
  { value: 'OTHER', label: 'Other', color: 'bg-gray-100 text-gray-800' },
]

export default function EventsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { data: session } = useSession()

  // State management
  const [viewMode, setViewMode] = useState(searchParams.get('view') || 'grid')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingEventId, setEditingEventId] = useState(null)
  const [selectedFilters, setSelectedFilters] = useState({
    search: searchParams.get('search') || '',
    type: searchParams.get('type') || 'all',
    status: searchParams.get('status') || 'all',
    date: searchParams.get('date') || 'all',
  })

  // Update URL params when filters change
  const updateUrlParams = newFilters => {
    const params = new URLSearchParams(searchParams.toString())

    Object.entries(newFilters).forEach(([key, value]) => {
      if (value && value !== 'all' && value !== '') {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })

    if (viewMode !== 'grid') {
      params.set('view', viewMode)
    } else {
      params.delete('view')
    }

    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  // Fetch events
  const {
    data: eventsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['events', selectedFilters],
    queryFn: async () => {
      const params = new URLSearchParams()
      Object.entries(selectedFilters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          params.append(key, value)
        }
      })

      const response = await fetch(`/api/events?${params.toString()}`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to fetch events')
      }
      return response.json()
    },
  })

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    const newFilters = { ...selectedFilters, [key]: value }
    setSelectedFilters(newFilters)
    updateUrlParams(newFilters)
  }

  // Handle view mode change
  const handleViewModeChange = mode => {
    setViewMode(mode)
    updateUrlParams(selectedFilters)
  }

  // Handle event creation success
  const handleEventCreated = () => {
    setIsCreateDialogOpen(false)
    setEditingEventId(null)
    refetch()
    toast.success(editingEventId ? 'Event updated successfully' : 'Event created successfully')
  }

  // Handle edit event
  const handleEditEvent = eventId => {
    setEditingEventId(eventId)
    setIsCreateDialogOpen(true)
  }

  // Handle delete event
  const handleDeleteEvent = eventId => {
    // Handled by the components themselves
    refetch()
  }

  // Handle clear filters
  const handleClearFilters = () => {
    const clearedFilters = {
      search: '',
      type: 'all',
      status: 'all',
      date: 'all',
    }
    setSelectedFilters(clearedFilters)
    updateUrlParams(clearedFilters)
  }

  // Handle create event from calendar
  const handleCreateEventFromDate = date => {
    // You can pre-populate the form with the selected date
    setIsCreateDialogOpen(true)
  }

  const events = eventsData?.data?.events || []
  const stats = eventsData?.data?.stats || {
    total: 0,
    upcoming: 0,
    ongoing: 0,
    completed: 0,
  }

  // Determine empty state type
  const getEmptyStateType = () => {
    if (
      events.length === 0 &&
      selectedFilters.search === '' &&
      selectedFilters.type === 'all' &&
      selectedFilters.status === 'all' &&
      selectedFilters.date === 'all'
    ) {
      return 'no-events'
    }
    if (selectedFilters.status === 'upcoming') {
      return 'no-upcoming'
    }
    if (selectedFilters.status === 'completed') {
      return 'no-completed'
    }
    return 'no-results'
  }

  if (error) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Failed to load events</h2>
          <p className="text-gray-600 mb-4">{error.message}</p>
          <Button onClick={() => refetch()}>Try Again</Button>
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="container mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Events</h1>
            <p className="text-gray-600 mt-1">
              Manage your accelerator events, workshops, and meetings
            </p>
          </div>

          <PermissionWrapper permission="events.manage">
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="starboard-button">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Event
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingEventId ? 'Edit Event' : 'Create New Event'}</DialogTitle>
                </DialogHeader>
                <CreateEventForm
                  eventId={editingEventId}
                  onSuccess={handleEventCreated}
                  onCancel={() => {
                    setIsCreateDialogOpen(false)
                    setEditingEventId(null)
                  }}
                />
              </DialogContent>
            </Dialog>
          </PermissionWrapper>
        </div>

        {/* Stats Cards */}
        <div className="starboard-grid-responsive">
          <Card className="starboard-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            </CardContent>
          </Card>

          <Card className="starboard-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Upcoming</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.upcoming}</div>
            </CardContent>
          </Card>

          <Card className="starboard-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Ongoing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.ongoing}</div>
            </CardContent>
          </Card>

          <Card className="starboard-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">{stats.completed}</div>
            </CardContent>
          </Card>
        </div>

        {/* View Tabs */}
        <Tabs value={viewMode} onValueChange={handleViewModeChange} className="space-y-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <TabsList className="grid w-full lg:w-auto grid-cols-3">
              <TabsTrigger value="grid" className="flex items-center gap-2">
                <Grid className="w-4 h-4" />
                Grid
              </TabsTrigger>
              <TabsTrigger value="list" className="flex items-center gap-2">
                <List className="w-4 h-4" />
                List
              </TabsTrigger>
              <TabsTrigger value="calendar" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Calendar
              </TabsTrigger>
            </TabsList>

            {/* Filters - Hide on calendar view */}
            {viewMode !== 'calendar' && (
              <Card className="starboard-card w-full lg:w-auto">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    {/* Search */}
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Search events..."
                        value={selectedFilters.search}
                        onChange={e => handleFilterChange('search', e.target.value)}
                        className="starboard-input pl-10"
                      />
                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap gap-2">
                      <Select
                        value={selectedFilters.type}
                        onValueChange={value => handleFilterChange('type', value)}
                      >
                        <SelectTrigger className="w-full sm:w-[140px]">
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          {EVENT_TYPES.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={selectedFilters.status}
                        onValueChange={value => handleFilterChange('status', value)}
                      >
                        <SelectTrigger className="w-full sm:w-[140px]">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="upcoming">Upcoming</SelectItem>
                          <SelectItem value="ongoing">Ongoing</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select
                        value={selectedFilters.date}
                        onValueChange={value => handleFilterChange('date', value)}
                      >
                        <SelectTrigger className="w-full sm:w-[140px]">
                          <SelectValue placeholder="Period" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Time</SelectItem>
                          <SelectItem value="today">Today</SelectItem>
                          <SelectItem value="week">This Week</SelectItem>
                          <SelectItem value="month">This Month</SelectItem>
                          <SelectItem value="quarter">This Quarter</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Clear Filters Button */}
                      {(selectedFilters.search ||
                        selectedFilters.type !== 'all' ||
                        selectedFilters.status !== 'all' ||
                        selectedFilters.date !== 'all') && (
                        <Button variant="outline" size="sm" onClick={handleClearFilters}>
                          <Filter className="w-4 h-4 mr-2" />
                          Clear
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Grid View */}
          <TabsContent value="grid" className="mt-6">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : events.length === 0 ? (
              <EventsEmptyState
                type={getEmptyStateType()}
                onCreateEvent={() => setIsCreateDialogOpen(true)}
                onClearFilters={handleClearFilters}
                searchQuery={selectedFilters.search}
              />
            ) : (
              <div className="starboard-grid-responsive">
                {events.map(event => (
                  <EventCard
                    key={event.id}
                    event={event}
                    currentUserId={session?.user?.id}
                    onEdit={handleEditEvent}
                    onDelete={handleDeleteEvent}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* List View */}
          <TabsContent value="list" className="mt-6">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : events.length === 0 ? (
              <EventsEmptyState
                type={getEmptyStateType()}
                onCreateEvent={() => setIsCreateDialogOpen(true)}
                onClearFilters={handleClearFilters}
                searchQuery={selectedFilters.search}
              />
            ) : (
              <EventTable
                events={events}
                currentUserId={session?.user?.id}
                onEdit={handleEditEvent}
                onDelete={handleDeleteEvent}
              />
            )}
          </TabsContent>

          {/* Calendar View */}
          <TabsContent value="calendar" className="mt-6">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              <EventsCalendar
                events={events}
                onEventClick={event => router.push(`/events/${event.id}`)}
                onDateClick={() => {}} // Optional: handle date clicks
                onCreateEvent={handleCreateEventFromDate}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  )
}
