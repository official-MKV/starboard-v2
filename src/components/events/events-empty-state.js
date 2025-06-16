'use client'

import { Calendar, Plus, Search, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export function EventsEmptyState({ type, onCreateEvent, onClearFilters, searchQuery }) {
  const getContent = () => {
    switch (type) {
      case 'no-events':
        return {
          icon: Calendar,
          title: 'No events yet',
          description: 'Create your first event to get started with your accelerator program.',
          action: onCreateEvent ? (
            <Button onClick={onCreateEvent} className="starboard-button">
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Event
            </Button>
          ) : null,
        }

      case 'no-results':
        return {
          icon: Search,
          title: searchQuery
            ? `No events found for "${searchQuery}"`
            : 'No events match your filters',
          description: 'Try adjusting your search terms or filters to find events.',
          action: onClearFilters ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClearFilters}>
                <Filter className="w-4 h-4 mr-2" />
                Clear Filters
              </Button>
              {onCreateEvent && (
                <Button onClick={onCreateEvent}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Event
                </Button>
              )}
            </div>
          ) : null,
        }

      case 'no-upcoming':
        return {
          icon: Calendar,
          title: 'No upcoming events',
          description:
            'All your events have concluded. Create a new event to schedule upcoming activities.',
          action: onCreateEvent ? (
            <Button onClick={onCreateEvent}>
              <Plus className="w-4 h-4 mr-2" />
              Schedule New Event
            </Button>
          ) : null,
        }

      case 'no-completed':
        return {
          icon: Calendar,
          title: 'No completed events',
          description: 'Events you have hosted will appear here once they are finished.',
          action: null,
        }

      default:
        return {
          icon: Calendar,
          title: 'No events',
          description: 'Events will appear here.',
          action: null,
        }
    }
  }

  const content = getContent()
  const IconComponent = content.icon

  return (
    <Card className="starboard-card">
      <CardContent className="flex flex-col items-center justify-center py-16">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-6">
          <IconComponent className="w-8 h-8 text-gray-400" />
        </div>

        <h3 className="text-xl font-semibold text-gray-900 mb-2">{content.title}</h3>

        <p className="text-gray-600 text-center max-w-md mb-6">{content.description}</p>

        {content.action}
      </CardContent>
    </Card>
  )
}
