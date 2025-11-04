'use client'
import { useState } from 'react'

const PublicEventsPage = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('all')

  const filters = [
    { id: 'all', label: 'All Events' },
    { id: 'hackathon', label: 'Hackathons' },
    { id: 'seminar', label: 'Seminars' },
    { id: 'workshop', label: 'Workshops' },
    { id: 'networking', label: 'Networking' },
    { id: 'talk', label: 'Talks' },
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="w-full py-20">
        <div className="container mx-auto px-4 md:px-8 lg:px-16 max-w-7xl flex-col items-center justify-center flex text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            Events
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-3xl">
            Join us for workshops, networking sessions, and inspiring talks from
            industry leaders and successful entrepreneurs.
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="container mx-auto px-4 md:px-8 lg:px-16 max-w-7xl mb-12">
        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap justify-center gap-3">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setSelectedFilter(filter.id)}
              className={`px-6 py-2.5 rounded-full font-medium transition-all ${
                selectedFilter === filter.id
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* No Events State */}
      <div className="container mx-auto px-4 md:px-8 lg:px-16 max-w-7xl py-16 md:py-24">
        <div className="max-w-md mx-auto text-center">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">
            No Events Currently
          </h3>
          <p className="text-gray-600 mb-8">
            We don't have any events scheduled at the moment. Check back soon for
            upcoming workshops, seminars, and networking opportunities!
          </p>
          
        </div>
      </div>
 
    </div>
  )
}

export default PublicEventsPage
