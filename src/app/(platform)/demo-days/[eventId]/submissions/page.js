'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Filter, Eye, Download, MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SubmissionCard } from '@/components/demo-day/SubmissionCard'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { useRouter } from 'next/navigation'

export default function SubmissionsPage({ params }) {
  const { eventId } = params
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')

  // Fetch submissions
  const { data: submissionsData, isLoading } = useQuery({
    queryKey: ['demo-day-submissions', eventId, searchTerm, statusFilter, categoryFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (categoryFilter !== 'all') params.append('category', categoryFilter)
      
      const response = await fetch(`/api/demo-days/${eventId}/submissions?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch submissions')
      return response.json()
    },
  })

  // Fetch demo day config for categories
  const { data: configData } = useQuery({
    queryKey: ['demo-day-config', eventId],
    queryFn: async () => {
      const response = await fetch(`/api/demo-days/${eventId}/config`)
      if (!response.ok) throw new Error('Failed to fetch config')
      return response.json()
    },
  })

  const submissions = submissionsData?.data?.submissions || []
  const config = configData?.data?.config
  const categories = config?.categories || []

  const filteredSubmissions = submissions.filter(submission => {
    const matchesSearch = !searchTerm || 
      submission.projectTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.teamName.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'submitted' && submission.isSubmitted) ||
      (statusFilter === 'draft' && !submission.isSubmitted)
    
    const matchesCategory = categoryFilter === 'all' || 
      submission.category === categoryFilter

    return matchesSearch && matchesStatus && matchesCategory
  })

  const handleViewSubmission = (submission) => {
    router.push(`/demo-days/submissions/${submission.id}`)
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Demo Day Submissions</h1>
          <p className="text-gray-600">
            {submissions.length} total submissions
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => router.push(`/demo-days/${eventId}/rankings`)}>
            <Eye className="w-4 h-4 mr-2" />
            View Rankings
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search submissions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>

            {categories.length > 0 && (
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full md:w-[140px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Submissions Grid */}
      {filteredSubmissions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSubmissions.map((submission) => (
            <SubmissionCard
              key={submission.id}
              submission={submission}
              showScores={true}
              showActions={true}
              onView={handleViewSubmission}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No submissions found"
          description="No submissions match your current filters."
          action={
            <Button onClick={() => {
              setSearchTerm('')
              setStatusFilter('all')
              setCategoryFilter('all')
            }}>
              Clear Filters
            </Button>
          }
        />
      )}
    </div>
  )
}
