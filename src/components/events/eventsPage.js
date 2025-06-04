// app/(dashboard)/events/page.tsx
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
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { PermissionWrapper } from '../permissionWrapper'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
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

  // State management
  const [viewMode, setViewMode] = useState(searchParams.get('view') || 'grid')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
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
    refetch()
    toast.success('Event created successfully')
  }

  const events = eventsData?.data?.events || []
  const stats = eventsData?.data?.stats || {
    total: 0,
    upcoming: 0,
    ongoing: 0,
    completed: 0,
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
                  <DialogTitle>Create New Event</DialogTitle>
                </DialogHeader>
                <CreateEventForm onSuccess={handleEventCreated} />
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

        {/* Filters and Controls */}
        <Card className="starboard-card">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search events..."
                    value={selectedFilters.search}
                    onChange={e => handleFilterChange('search', e.target.value)}
                    className="starboard-input pl-10"
                  />
                </div>

                <Select
                  value={selectedFilters.type}
                  onValueChange={value => handleFilterChange('type', value)}
                >
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Event Type" />
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
                  <SelectTrigger className="w-full sm:w-[180px]">
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
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Time Period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="quarter">This Quarter</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* View Controls */}
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleViewModeChange('grid')}
                    >
                      <Grid className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Grid View</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleViewModeChange('list')}
                    >
                      <List className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>List View</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Events Content */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : events.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No events found"
            description="Create your first event to get started with your accelerator program."
            action={
              <PermissionWrapper permission="events.manage">
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Event
                </Button>
              </PermissionWrapper>
            }
          />
        ) : (
          <div className="space-y-6">
            {viewMode === 'grid' ? (
              <div className="starboard-grid-responsive">
                {events.map(event => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            ) : (
              <EventTable events={events} />
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
