'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DashboardHeader } from '@/components/dashboard/header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Edit,
  Users,
  BarChart3,
  Settings,
  Globe,
  Calendar,
  Clock,
  FileText,
  Eye,
  Copy,
  Share2,
  Download,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { formatDate, formatRelativeTime } from '@/lib/utils'
import { toast } from 'sonner'

export default function ApplicationDetailPage({ params }) {
  const { applicationId } = params
  const [application, setApplication] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    const fetchApplication = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/applications/${applicationId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error?.message || 'Failed to fetch application')
        }

        const data = await response.json()
        setApplication(data.application)
      } catch (err) {
        console.error('Error fetching application:', err)
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    if (applicationId) {
      fetchApplication()
    }
  }, [applicationId])

  const getStatusBadge = () => {
    if (!application) return null

    const now = new Date()

    if (!application.isActive) {
      return <Badge variant="secondary">Inactive</Badge>
    }

    if (application.closeDate && new Date(application.closeDate) <= now) {
      return <Badge variant="destructive">Closed</Badge>
    }

    if (application.openDate && new Date(application.openDate) > now) {
      return <Badge variant="warning">Scheduled</Badge>
    }

    return <Badge variant="success">Active</Badge>
  }

  const getPublicUrl = () => {
    return `${window.location.origin}/apply/${applicationId}`
  }

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(getPublicUrl())
      toast.success('URL copied to clipboard!')
    } catch (err) {
      toast.error('Failed to copy URL')
    }
  }

  const handleDuplicateApplication = async () => {
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

      const data = await response.json()
      toast.success('Application duplicated successfully!')

      // Navigate to the duplicated application
      window.location.href = `/applications/${data.application.id}`
    } catch (err) {
      console.error('Error duplicating application:', err)
      toast.error('Failed to duplicate application')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-snow-100">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-slate-gray-600">Loading application...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-snow-100">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-4 text-red-600" />
            <p className="text-red-600 mb-2">Failed to load application</p>
            <p className="text-sm text-slate-gray-500 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!application) {
    return (
      <div className="min-h-screen bg-snow-100">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-4 text-slate-gray-400" />
            <p className="text-slate-gray-600 mb-2">Application not found</p>
            <Link href="/applications">
              <Button variant="outline">Back to Applications</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-snow-100">
      <div className="">
        <DashboardHeader
          title={application.title}
          description={`Created by ${application.creator.firstName} ${
            application.creator.lastName
          } • ${formatRelativeTime(new Date(application.createdAt))}`}
          actions={
            <div className="flex items-center space-x-3">
              {application.isPublic && (
                <Link href={getPublicUrl()} target="_blank">
                  <Button variant="outline" size="sm">
                    <Globe className="mr-2 h-4 w-4" />
                    View Public
                  </Button>
                </Link>
              )}

              <Link href={`/applications/${applicationId}/edit`}>
                <Button variant="outline" size="sm">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </Link>

              <Button className="starboard-button" size="sm">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Button>
            </div>
          }
        />

        <main className="p-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="starboard-card">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-charcoal-900">
                      {application.stats.totalSubmissions}
                    </p>
                    <p className="text-sm text-slate-gray-600">Total Submissions</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="starboard-card">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-charcoal-900">
                      {application.stats.pendingReviews}
                    </p>
                    <p className="text-sm text-slate-gray-600">Pending Reviews</p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="starboard-card">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-charcoal-900">
                      {application.stats.accepted}
                    </p>
                    <p className="text-sm text-slate-gray-600">Accepted</p>
                  </div>
                  <Users className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="starboard-card">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-charcoal-900">
                      {application.stats.averageScore?.toFixed(1) || '0.0'}
                    </p>
                    <p className="text-sm text-slate-gray-600">Avg. Score</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="submissions">Submissions</TabsTrigger>
              <TabsTrigger value="form">Form Fields</TabsTrigger>
              <TabsTrigger value="form-preview">Form Preview</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Application Details */}
                <div className="lg:col-span-2 space-y-6">
                  <Card className="starboard-card">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Application Details</CardTitle>
                        {getStatusBadge()}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-medium text-charcoal-800 mb-2">Description</h4>
                        <p className="text-slate-gray-600">{application.description}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-medium text-charcoal-800 mb-1">Opens</h4>
                          <p className="text-sm text-slate-gray-600">
                            {application.openDate
                              ? formatDate(new Date(application.openDate))
                              : 'Immediately'}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-medium text-charcoal-800 mb-1">Closes</h4>
                          <p className="text-sm text-slate-gray-600">
                            {application.closeDate
                              ? formatDate(new Date(application.closeDate))
                              : 'No deadline'}
                          </p>
                        </div>
                      </div>

                      {application.reviewerInstructions && (
                        <div>
                          <h4 className="font-medium text-charcoal-800 mb-2">
                            Reviewer Instructions
                          </h4>
                          <p className="text-sm text-slate-gray-600 bg-slate-gray-50 p-3 rounded-lg">
                            {application.reviewerInstructions}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Quick Actions */}
                  <Card className="starboard-card">
                    <CardHeader>
                      <CardTitle>Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <Link href={`/applications/${applicationId}/submissions`}>
                          <Button variant="outline" className="w-full justify-start">
                            <Users className="mr-2 h-4 w-4" />
                            Review Submissions
                          </Button>
                        </Link>

                        <Link href={`/applications/${applicationId}/analytics`}>
                          <Button variant="outline" className="w-full justify-start">
                            <BarChart3 className="mr-2 h-4 w-4" />
                            View Analytics
                          </Button>
                        </Link>

                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={handleDuplicateApplication}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Duplicate Application
                        </Button>

                        <Button variant="outline" className="w-full justify-start">
                          <Download className="mr-2 h-4 w-4" />
                          Export Data
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                  {/* Settings */}
                  <Card className="starboard-card">
                    <CardHeader>
                      <CardTitle className="text-lg">Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Public Application</span>
                        <Badge variant={application.isPublic ? 'success' : 'secondary'}>
                          {application.isPublic ? 'Yes' : 'No'}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Multiple Submissions</span>
                        <Badge
                          variant={application.allowMultipleSubmissions ? 'success' : 'secondary'}
                        >
                          {application.allowMultipleSubmissions ? 'Allowed' : 'Not Allowed'}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Authentication Required</span>
                        <Badge
                          variant={application.requireAuthentication ? 'warning' : 'secondary'}
                        >
                          {application.requireAuthentication ? 'Yes' : 'No'}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Submission Limit</span>
                        <span className="text-sm text-slate-gray-600">
                          {application.maxSubmissions || 'No limit'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Share */}
                  {application.isPublic && (
                    <Card className="starboard-card">
                      <CardHeader>
                        <CardTitle className="text-lg">Share Application</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <label className="text-sm font-medium text-slate-gray-700">
                            Public URL
                          </label>
                          <div className="flex mt-1">
                            <input
                              type="text"
                              value={getPublicUrl()}
                              readOnly
                              className="flex-1 px-3 py-2 text-sm border border-neutral-300 rounded-l-md bg-slate-gray-50"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-l-none"
                              onClick={handleCopyUrl}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <Button variant="outline" size="sm" className="w-full">
                          <Share2 className="mr-2 h-4 w-4" />
                          Share Link
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="submissions">
              <Card className="starboard-card">
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-slate-gray-300 mx-auto mb-4" />
                    <p className="text-slate-gray-600">Submissions component would go here</p>
                    <Link href={`/applications/${applicationId}/submissions`}>
                      <Button className="mt-4 starboard-button">View All Submissions</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="form">
              <Card className="starboard-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Form Fields ({application.formFields?.length || 0})</CardTitle>
                      <CardDescription>
                        The fields that applicants will see when applying
                      </CardDescription>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveTab('form-preview')}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Preview Form
                      </Button>
                      <Link href={`/applications/${applicationId}/edit`}>
                        <Button size="sm">
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Form
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-4">
                    {application.formFields?.length > 0 ? (
                      application.formFields.map((field, index) => (
                        <div key={field.id} className="border border-neutral-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-charcoal-800">{field.label}</h4>
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline">{field.type}</Badge>
                              {field.required && (
                                <Badge variant="destructive" className="text-xs">
                                  Required
                                </Badge>
                              )}
                              {!field.isVisible && (
                                <Badge variant="secondary" className="text-xs">
                                  Hidden
                                </Badge>
                              )}
                            </div>
                          </div>
                          {field.description && (
                            <p className="text-sm text-slate-gray-600">{field.description}</p>
                          )}
                          {field.options && field.options.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs text-slate-gray-500 mb-1">Options:</p>
                              <div className="flex flex-wrap gap-1">
                                {field.options.map((option, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {option.label}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <FileText className="h-12 w-12 text-slate-gray-300 mx-auto mb-4" />
                        <p className="text-slate-gray-600 mb-4">No form fields configured</p>
                        <Link href={`/applications/${applicationId}/edit`}>
                          <Button className="starboard-button">
                            <Edit className="mr-2 h-4 w-4" />
                            Add Form Fields
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="form-preview">
              <Card className="starboard-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Form Preview</CardTitle>
                      <CardDescription>
                        This is how your form will appear to applicants
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setActiveTab('form')}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Form
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {application.formFields?.length > 0 ? (
                    <div className="max-w-2xl mx-auto">
                      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center">
                          <Eye className="h-5 w-5 text-blue-600 mr-2" />
                          <div>
                            <h4 className="font-medium text-blue-900">Preview Mode</h4>
                            <p className="text-sm text-blue-700">
                              This form is read-only. Applicants will see this layout when applying.
                            </p>
                          </div>
                        </div>
                      </div>

                      <DynamicFormRenderer
                        fields={application.formFields.filter(field => field.isVisible !== false)}
                        initialValues={{}}
                        showRequiredIndicator={true}
                        // Don't provide onSubmit to keep it read-only
                      />
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 text-slate-gray-300 mx-auto mb-4" />
                      <p className="text-slate-gray-600 mb-4">No form fields to preview</p>
                      <Link href={`/applications/${applicationId}/edit`}>
                        <Button className="starboard-button">
                          <Edit className="mr-2 h-4 w-4" />
                          Add Form Fields
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics">
              <Card className="starboard-card">
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <BarChart3 className="h-12 w-12 text-slate-gray-300 mx-auto mb-4" />
                    <p className="text-slate-gray-600">Analytics component would go here</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  )
}
