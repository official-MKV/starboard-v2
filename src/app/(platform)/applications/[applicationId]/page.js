'use client'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
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
} from 'lucide-react'
import { formatDate, formatRelativeTime } from '@/lib/utils'

// This would typically fetch data from your API
async function getApplication(applicationId) {
  // Mock data - replace with actual API call
  return {
    id: applicationId,
    title: 'Spring 2024 Accelerator Program',
    description:
      'Our flagship 12-week accelerator program for early-stage startups looking to scale their business and secure funding.',
    isActive: true,
    isPublic: true,
    submissionCount: 47,
    openDate: new Date('2024-01-15'),
    closeDate: new Date('2024-03-15'),
    maxSubmissions: null,
    allowMultipleSubmissions: false,
    requireAuthentication: false,
    reviewerInstructions:
      'Focus on scalability, market potential, and team strength. Look for clear revenue models and growth strategies.',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-10'),
    workspace: {
      id: 'ws_1',
      name: 'TechHub Accelerator',
      description: 'Leading startup accelerator',
    },
    creator: {
      id: 'user_1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@techhub.com',
    },
    formFields: [
      {
        id: 'field_1',
        type: 'TEXT',
        label: 'Company Name',
        required: true,
        order: 0,
      },
      {
        id: 'field_2',
        type: 'EMAIL',
        label: 'Contact Email',
        required: true,
        order: 1,
      },
      {
        id: 'field_3',
        type: 'TEXTAREA',
        label: 'Business Description',
        required: true,
        order: 2,
      },
    ],
    stats: {
      totalSubmissions: 47,
      pendingReviews: 23,
      accepted: 8,
      rejected: 16,
      averageScore: 7.2,
      submissionsByDate: [],
    },
  }
}

export default async function ApplicationDetailPage({ params }) {
  const session = await auth()

  if (!session) {
    redirect('/auth/login')
  }

  const { applicationId } = params
  const application = await getApplication(applicationId)

  if (!application) {
    redirect('/applications')
  }

  const user = session.user

  const getStatusBadge = () => {
    const now = new Date()

    if (!application.isActive) {
      return <Badge variant="secondary">Inactive</Badge>
    }

    if (application.closeDate && application.closeDate <= now) {
      return <Badge variant="destructive">Closed</Badge>
    }

    if (application.openDate && application.openDate > now) {
      return <Badge variant="warning">Scheduled</Badge>
    }

    return <Badge variant="success">Active</Badge>
  }

  const getPublicUrl = () => {
    return `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/apply/${applicationId}`
  }

  return (
    <div className="min-h-screen bg-snow-100">
      <div className="pl-64">
        <DashboardHeader
          title={application.title}
          description={`Created by ${application.creator.firstName} ${
            application.creator.lastName
          } • ${formatRelativeTime(application.createdAt)}`}
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
                      {application.submissionCount}
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
                      {application.stats.averageScore}
                    </p>
                    <p className="text-sm text-slate-gray-600">Avg. Score</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Tabs value="overview" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="submissions">Submissions</TabsTrigger>
              <TabsTrigger value="form">Form Fields</TabsTrigger>
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
                              ? formatDate(application.openDate)
                              : 'Immediately'}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-medium text-charcoal-800 mb-1">Closes</h4>
                          <p className="text-sm text-slate-gray-600">
                            {application.closeDate
                              ? formatDate(application.closeDate)
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

                        <Button variant="outline" className="w-full justify-start">
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
                              onClick={() => navigator.clipboard.writeText(getPublicUrl())}
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
                  <CardTitle>Form Fields ({application.formFields.length})</CardTitle>
                  <CardDescription>
                    The fields that applicants will see when applying
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {application.formFields.map((field, index) => (
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
                          </div>
                        </div>
                        {field.description && (
                          <p className="text-sm text-slate-gray-600">{field.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
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
