'use client'

import { useState, useEffect } from 'react'
import { Search, Play, Headphones, FileText, ExternalLink, Calendar, Filter } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const ResourceLibrary = () => {
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [featuredVideo, setFeaturedVideo] = useState({
    id: 'featured-manual',
    title: 'How to Start a Tech Startup in Nigeria',
    description: 'Learn the fundamentals of starting and scaling a technology startup in Nigeria with insights from industry experts.',
    type: 'VIDEO',
    externalUrl: 'https://www.youtube.com/watch?v=odg_OBOLqo4',
    author: 'Starboard',
    duration: 1245, // 20 minutes 45 seconds (in seconds)
    publishedAt: new Date('2024-01-15'),
    topics: ['Entrepreneurship', 'Technology', 'Startup'],
    isFeatured: true,
  })
  const [selectedType, setSelectedType] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedTopic, setSelectedTopic] = useState('all')
  const [filterOptions, setFilterOptions] = useState({
    categories: [],
    topics: [],
    types: ['VIDEO', 'PODCAST', 'DOCUMENT', 'PRESENTATION', 'ARTICLE'],
  })

  useEffect(() => {
    fetchResources()
  }, [])

  const fetchResources = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/public/resources?limit=100')
      const data = await response.json()

      if (data.success) {
        const allResources = data.data.resources

        // Only override featured video if there's a featured video in the database
        const featured = allResources.find(r => r.isFeatured && r.type === 'VIDEO')
        if (featured) {
          setFeaturedVideo(featured)
        }

        setResources(allResources)

        // Extract unique categories and topics from resources
        const categories = [...new Set(allResources.map(r => r.category).filter(Boolean))]
        const topics = [...new Set(allResources.flatMap(r => r.topics || []))]

        // Set filter options
        setFilterOptions({
          categories,
          topics,
          types: ['VIDEO', 'PODCAST', 'DOCUMENT', 'PRESENTATION', 'ARTICLE'],
        })
      }
    } catch (error) {
      console.error('Failed to fetch resources:', error)
    } finally {
      setLoading(false)
    }
  }

  const getYouTubeThumbnail = (url) => {
    if (!url) return '/noise.jpg'

     
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    const match = url.match(regExp)

    if (match && match[2].length === 11) {
      return `https://img.youtube.com/vi/${match[2]}/maxresdefault.jpg`
    }

    return '/noise.jpg'
  }

  const getResourceThumbnail = (resource) => {
    if (resource.thumbnailUrl) return resource.thumbnailUrl
    if (resource.type === 'VIDEO' && resource.externalUrl) {
      return getYouTubeThumbnail(resource.externalUrl)
    }
    return '/noise.jpg'
  }

  const getResourceIcon = (type) => {
    switch (type) {
      case 'VIDEO':
        return <Play className="w-5 h-5" />
      case 'PODCAST':
        return <Headphones className="w-5 h-5" />
      default:
        return <FileText className="w-5 h-5" />
    }
  }

  const formatDuration = (seconds) => {
    if (!seconds) return null
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    }
    return `${minutes}m`
  }

  const formatDate = (date) => {
    if (!date) return null
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const handleResourceClick = (resource) => {
    const url = resource.externalUrl || resource.fileUrl
    if (url) {
      window.open(url, '_blank')
    }
  }

  // Filter and group resources
  const filteredResources = resources.filter(r =>
    r.id !== featuredVideo?.id &&
    (selectedType === 'all' || r.type === selectedType) &&
    (selectedCategory === 'all' || r.category === selectedCategory) &&
    (selectedTopic === 'all' || (r.topics && r.topics.includes(selectedTopic))) &&
    (search === '' ||
     r.title.toLowerCase().includes(search.toLowerCase()) ||
     r.description?.toLowerCase().includes(search.toLowerCase()) ||
     r.author?.toLowerCase().includes(search.toLowerCase()) ||
     (r.topics && r.topics.some(topic => topic.toLowerCase().includes(search.toLowerCase()))))
  )

  const latestVideos = filteredResources
    .filter(r => r.type === 'VIDEO')
    .sort((a, b) => new Date(b.publishedAt || b.createdAt) - new Date(a.publishedAt || a.createdAt))
    .slice(0, 6)

  const podcasts = filteredResources
    .filter(r => r.type === 'PODCAST')
    .sort((a, b) => new Date(b.publishedAt || b.createdAt) - new Date(a.publishedAt || a.createdAt))
    .slice(0, 6)

  const documents = filteredResources
    .filter(r => r.type === 'DOCUMENT' || r.type === 'PRESENTATION' || r.type === 'ARTICLE')
    .sort((a, b) => new Date(b.publishedAt || b.createdAt) - new Date(a.publishedAt || a.createdAt))
    .slice(0, 6)

  const ResourceCard = ({ resource }) => (
    <div
      onClick={() => handleResourceClick(resource)}
      className="group cursor-pointer overflow-hidden bg-white rounded-lg hover:shadow-xl transition-all"
    >
      {/* Thumbnail */}
      <div className="relative overflow-hidden h-48">
        <img
          src={getResourceThumbnail(resource)}
          alt={resource.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0" />

        {/* Type Badge */}
        <div className="absolute top-4 left-4">
          <Badge className="bg-black/50 text-white backdrop-blur-sm border-none">
            <span className="mr-1">{getResourceIcon(resource.type)}</span>
            {resource.type}
          </Badge>
        </div>

        {/* Duration */}
        {resource.duration && (
          <div className="absolute bottom-4 right-4">
            <Badge className="bg-black/70 text-white backdrop-blur-sm border-none">
              {formatDuration(resource.duration)}
            </Badge>
          </div>
        )}

        {/* Play Icon Overlay */}
        {resource.type === 'VIDEO' && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
              <Play className="w-8 h-8 text-black ml-1" fill="black" />
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 line-clamp-2 mb-2 text-lg">
          {resource.title}
        </h3>

        {resource.author && (
          <p className="text-gray-600 mb-2 text-sm">
            {resource.author}
          </p>
        )}

        {resource.description && (
          <p className="text-gray-600 mb-3 text-sm line-clamp-2">
            {resource.description}
          </p>
        )}

        {/* Meta Info */}
        <div className="flex items-center gap-3 text-sm text-gray-500">
          {resource.publishedAt && (
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {formatDate(resource.publishedAt)}
            </div>
          )}
          {resource.topics && resource.topics.length > 0 && (
            <div className="flex gap-1">
              {resource.topics.slice(0, 2).map(topic => (
                <Badge key={topic} variant="outline" className="text-xs">
                  {topic}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="animate-pulse">
            <div className="h-96 bg-gray-200 rounded-xl mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i}>
                  <div className="bg-gray-200 h-48 rounded-lg mb-4"></div>
                  <div className="bg-gray-200 h-4 rounded mb-2"></div>
                  <div className="bg-gray-200 h-4 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full min-h-screen bg-white">
      {/* Header */}
      <div className="w-full border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">Library</h1>
          <p className="text-xl text-gray-600 max-w-3xl mb-8">
            Explore our curated collection of videos, podcasts, and learning materials to accelerate your startup journey.
          </p>

          {/* Search and Filters */}
          <div className="flex flex-col gap-4 max-w-6xl">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search library..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-12 h-14 text-lg rounded-full border-gray-300"
              />
            </div>

            {/* Filters Row */}
            <div className="flex flex-col md:flex-row gap-3">
              {/* Type Filter */}
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-full md:w-48 h-12">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {filterOptions.types.map(type => (
                    <SelectItem key={type} value={type}>
                      {type.charAt(0) + type.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Category Filter */}
              {filterOptions.categories.length > 0 && (
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full md:w-48 h-12">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {filterOptions.categories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Topic Filter */}
              {filterOptions.topics.length > 0 && (
                <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                  <SelectTrigger className="w-full md:w-48 h-12">
                    <SelectValue placeholder="All Topics" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Topics</SelectItem>
                    {filterOptions.topics.map(topic => (
                      <SelectItem key={topic} value={topic}>
                        {topic}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Clear Filters Button */}
              {(selectedType !== 'all' || selectedCategory !== 'all' || selectedTopic !== 'all') && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedType('all')
                    setSelectedCategory('all')
                    setSelectedTopic('all')
                  }}
                  className="h-12"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Featured Video */}
        {featuredVideo && (
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Featured</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <ResourceCard resource={featuredVideo} />
            </div>
          </div>
        )}

        {/* Latest Videos */}
        {latestVideos.length > 0 && (
          <div className="mb-16">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-gray-900">Latest Videos</h2>
              {latestVideos.length >= 6 && (
                <Button variant="ghost" className="text-gray-600">
                  View All
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {latestVideos.map((resource) => (
                <ResourceCard key={resource.id} resource={resource} />
              ))}
            </div>
          </div>
        )}

        {/* Podcasts */}
        {podcasts.length > 0 && (
          <div className="mb-16">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-gray-900">Our Podcasts</h2>
              {podcasts.length >= 6 && (
                <Button variant="ghost" className="text-gray-600">
                  View All
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {podcasts.map((resource) => (
                <ResourceCard key={resource.id} resource={resource} />
              ))}
            </div>
          </div>
        )}

        {/* Seminar Documents */}
        {documents.length > 0 && (
          <div className="mb-16">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-gray-900">Seminar Documents</h2>
              {documents.length >= 6 && (
                <Button variant="ghost" className="text-gray-600">
                  View All
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {documents.map((resource) => (
                <ResourceCard key={resource.id} resource={resource} />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {latestVideos.length === 0 && podcasts.length === 0 && documents.length === 0 && !featuredVideo && (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">No resources found. Check back soon!</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ResourceLibrary
