import React from 'react'
import EventsPage from '@/components/events/eventsPage'

export const metadata = {
  title: 'Starboard Events',
  description: 'Starboard Events',
  keywords: 'events, activities, meetups, conferences, workshops',
  openGraph: {
    title: 'Events',
    type: 'website',
  },
 
  
}

const page = () => {
  return (
    <div>
      <EventsPage />
    </div>
  )
}

export default page