'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { PermissionWrapper } from '@/components/permissionWrapper'
import {
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Copy,
  Trash2,
  Users,
  Calendar,
  Eye,
  BarChart3,
  Settings,
} from 'lucide-react'
import { formatDate, formatRelativeTime } from '@/lib/utils'
import { PERMISSIONS } from '@/lib/utils/permissions'

export function ApplicationsList({ userId, workspaces }) {
  const [applications, setApplications] = useState([])
  const [filteredApplications, setFilteredApplications] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch applications from API
  useEffect(() => {
    const fetchApplications = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/applications', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error('Failed to fetch applications')
        }

        const data = await response.json()
        setApplications(data.applications || [])
        setFilteredApplications(data.applications || [])
      } catch (err) {
        console.error('Error fetching applications:', err)
        setError(err.message)
        setApplications([])
        setFilteredApplications([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchApplications()
  }, [userId, workspaces])

  // Filter applications based on search and status
  useEffect(() => {
    let filtered = applications

    if (searchTerm) {
      filtered = filtered.filter(
        app =>
          app.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (app.description && app.description.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(app => {
        const now = new Date()
        switch (statusFilter) {
          case 'active':
            return app.isActive && (!app.closeDate || new Date(app.closeDate) > now)
          case 'closed':
            return !app.isActive || (app.closeDate && new Date(app.closeDate) <= now)
          case 'draft':
            return !app.isPublic
          default:
            return true
        }
      })
    }

    setFilteredApplications(filtered)
  }, [applications, searchTerm, statusFilter])

  const getStatusBadge = application => {
    const now = new Date()

    if (!application.isPublic) {
      return <Badge variant="secondary">Draft</Badge>
    }

    if (application.closeDate && new Date(application.closeDate) <= now) {
      return <Badge variant="destructive">Closed</Badge>
    }

    if (application.openDate && new Date(application.openDate) > now) {
      return <Badge variant="warning">Scheduled</Badge>
    }

    return <Badge variant="success">Active</Badge>
  }

  const handleDuplicateApplication = async applicationId => {
    try {
      const response = await fetch(`/api/applications/${applicationId}/duplicate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to duplicate application')
      }

      // Refresh the list
      window.location.reload()
    } catch (err) {
      console.error('Error duplicating application:', err)
      // You could show a toast notification here
    }
  }

  const handleDeleteApplication = async applicationId => {
    if (
      !confirm('Are you sure you want to delete this application? This action cannot be undone.')
    ) {
      return
    }

    try {
      const response = await fetch(`/api/applications/${applicationId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to delete application')
      }

      // Remove from local state
      setApplications(prev => prev.filter(app => app.id !== applicationId))
    } catch (err) {
      console.error('Error deleting application:', err)
      // You could show a toast notification here
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse">
            <div className="h-24 bg-slate-gray-100 rounded-lg"></div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Search className="h-8 w-8 text-red-400" />
        </div>
        <p className="text-red-600 mb-2">Failed to load applications</p>
        <p className="text-sm text-slate-gray-500 mb-4">{error}</p>
        <Button onClick={() => window.location.reload()} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-gray-400 h-4 w-4" />
          <Input
            placeholder="Search applications..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10 starboard-input"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-neutral-300 rounded-md text-sm starboard-input"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="closed">Closed</option>
            <option value="draft">Draft</option>
          </select>

          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            More Filters
          </Button>
        </div>
      </div>

      {/* Applications List */}
      {filteredApplications.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-slate-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="h-8 w-8 text-slate-gray-400" />
          </div>
          <p className="text-slate-gray-600 mb-2">
            {searchTerm ? 'No applications match your search' : 'No applications found'}
          </p>
          <p className="text-sm text-slate-gray-500 mb-4">
            {searchTerm
              ? 'Try adjusting your search terms'
              : 'Create your first application to get started'}
          </p>
          {!searchTerm && (
            <PermissionWrapper permission={PERMISSIONS.APPLICATIONS_CREATE} fallback={null}>
              <Link href="/applications/create">
                <Button className="starboard-button">Create Application</Button>
              </Link>
            </PermissionWrapper>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredApplications.map(application => (
            <div
              key={application.id}
              className="border border-neutral-200 rounded-lg p-6 hover:shadow-soft transition-shadow bg-white"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-charcoal-800">{application.title}</h3>
                    {getStatusBadge(application)}
                    {!application.isPublic && <Badge variant="outline">Private</Badge>}
                  </div>

                  {application.description && (
                    <p className="text-slate-gray-600 mb-4">{application.description}</p>
                  )}

                  <div className="flex items-center space-x-6 text-sm text-slate-gray-500">
                    <div className="flex items-center space-x-1">
                      <Users className="h-4 w-4" />
                      <span>{application.submissionCount || 0} submissions</span>
                    </div>

                    {application.closeDate && (
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>Closes {formatRelativeTime(new Date(application.closeDate))}</span>
                      </div>
                    )}

                    <div className="flex items-center space-x-1">
                      <span>Created {formatRelativeTime(new Date(application.createdAt))}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <PermissionWrapper permission={PERMISSIONS.APPLICATIONS_REVIEW} fallback={null}>
                    <Link href={`/applications/${application.id}`}>
                      <Button variant="outline" size="sm">
                        <Users className="mr-2 h-4 w-4" />
                        {application.submissionCount || 0}
                      </Button>
                    </Link>
                  </PermissionWrapper>

                  <PermissionWrapper permission={PERMISSIONS.ANALYTICS_VIEW} fallback={null}>
                    <Link href={`/applications/${application.id}`}>
                      <Button variant="outline" size="sm">
                        <BarChart3 className="mr-2 h-4 w-4" />
                        Analytics
                      </Button>
                    </Link>
                  </PermissionWrapper>

                  <div className="relative group">
                    <Button variant="outline" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>

                    {/* Dropdown Menu */}
                    <div className="hidden group-hover:block absolute right-0 top-full mt-1 w-48 bg-white border border-neutral-200 rounded-lg shadow-lg z-10">
                      <div className="py-1">
                        <Link
                          href={`/applications/${application.id}`}
                          className="flex items-center px-4 py-2 text-sm text-charcoal-700 hover:bg-slate-gray-50"
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </Link>

                        <PermissionWrapper
                          permission={PERMISSIONS.APPLICATIONS_EDIT}
                          fallback={null}
                        >
                          <Link
                            href={`/applications/${application.id}/edit`}
                            className="flex items-center px-4 py-2 text-sm text-charcoal-700 hover:bg-slate-gray-50"
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Application
                          </Link>
                        </PermissionWrapper>

                        <PermissionWrapper
                          permission={PERMISSIONS.APPLICATIONS_MANAGE}
                          fallback={null}
                        >
                          <Link
                            href={`/applications/${application.id}/settings`}
                            className="flex items-center px-4 py-2 text-sm text-charcoal-700 hover:bg-slate-gray-50"
                          >
                            <Settings className="mr-2 h-4 w-4" />
                            Settings
                          </Link>
                        </PermissionWrapper>

                        <PermissionWrapper
                          permission={PERMISSIONS.APPLICATIONS_CREATE}
                          fallback={null}
                        >
                          <button
                            onClick={() => handleDuplicateApplication(application.id)}
                            className="flex items-center w-full px-4 py-2 text-sm text-charcoal-700 hover:bg-slate-gray-50"
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicate
                          </button>
                        </PermissionWrapper>

                        <PermissionWrapper
                          permission={PERMISSIONS.APPLICATIONS_DELETE}
                          fallback={null}
                        >
                          <div className="border-t border-neutral-200"></div>
                          <button
                            onClick={() => handleDeleteApplication(application.id)}
                            className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </button>
                        </PermissionWrapper>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {filteredApplications.length > 0 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-slate-gray-600">
            Showing {filteredApplications.length} of {applications.length} applications
          </p>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" disabled>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
