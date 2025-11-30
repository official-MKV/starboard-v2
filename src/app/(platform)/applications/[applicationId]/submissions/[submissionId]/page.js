'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  User,
  Calendar,
  Mail,
  Phone,
  Building2,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { format } from 'date-fns'

// Helper function to get status info
const getStatusInfo = (status) => {
  switch (status) {
    case 'DRAFT':
      return { label: 'Draft', color: 'bg-gray-100 text-gray-800', icon: FileText }
    case 'SUBMITTED':
      return { label: 'Submitted', color: 'bg-blue-100 text-blue-800', icon: CheckCircle }
    case 'UNDER_REVIEW':
      return { label: 'Under Review', color: 'bg-yellow-100 text-yellow-800', icon: Clock }
    case 'ACCEPTED':
      return { label: 'Accepted', color: 'bg-green-100 text-green-800', icon: CheckCircle }
    case 'REJECTED':
      return { label: 'Rejected', color: 'bg-red-100 text-red-800', icon: XCircle }
    case 'WAITLISTED':
      return { label: 'Waitlisted', color: 'bg-orange-100 text-orange-800', icon: Clock }
    default:
      return { label: status, color: 'bg-gray-100 text-gray-800', icon: FileText }
  }
}

// Helper function to render field value
const renderFieldValue = (field, value) => {
  if (!value && value !== 0 && value !== false) return 'N/A'

  switch (field.type) {
    case 'FILE_UPLOAD':
      if (typeof value === 'object' && value.fileUrl) {
        return (
          <a
            href={value.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline flex items-center gap-1"
          >
            {value.fileName || 'View File'}
            <ExternalLink className="w-3 h-3" />
          </a>
        )
      }
      return 'N/A'

    case 'MULTI_FILE':
      if (Array.isArray(value) && value.length > 0) {
        return (
          <div className="space-y-1">
            {value.map((file, index) => (
              <a
                key={index}
                href={file.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline flex items-center gap-1"
              >
                {file.fileName || `File ${index + 1}`}
                <ExternalLink className="w-3 h-3" />
              </a>
            ))}
          </div>
        )
      }
      return 'N/A'

    case 'URL':
      return (
        <a
          href={value.startsWith('http') ? value : `https://${value}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline flex items-center gap-1"
        >
          {value}
          <ExternalLink className="w-3 h-3" />
        </a>
      )

    case 'EMAIL':
      return (
        <a href={`mailto:${value}`} className="text-blue-600 hover:underline">
          {value}
        </a>
      )

    case 'PHONE':
      return (
        <a href={`tel:${value}`} className="text-blue-600 hover:underline">
          {value}
        </a>
      )

    case 'CHECKBOX':
      if (Array.isArray(value)) {
        return value.join(', ')
      }
      return value

    case 'BOOLEAN':
      return value ? 'Yes' : 'No'

    case 'DATE':
      try {
        return format(new Date(value), 'MMM d, yyyy')
      } catch {
        return value
      }

    case 'DATETIME':
      try {
        return format(new Date(value), 'MMM d, yyyy h:mm a')
      } catch {
        return value
      }

    case 'TEXTAREA':
      return <div className="whitespace-pre-wrap">{value}</div>

    default:
      if (typeof value === 'object') {
        return JSON.stringify(value)
      }
      return value.toString()
  }
}

export default function SubmissionDetailPage({ params }) {
  const router = useRouter()
  const { data: session } = useSession()

  const { applicationId, submissionId } = params

  // Fetch submission details
  const { data: submissionData, isLoading } = useQuery({
    queryKey: ['application-submission', applicationId, submissionId],
    queryFn: async () => {
      const response = await fetch(`/api/applications/${applicationId}/submissions/${submissionId}`)
      if (!response.ok) throw new Error('Failed to fetch submission')
      return response.json()
    },
  })

  const submission = submissionData?.data?.submission

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!submission) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Submission Not Found</h3>
          <p className="text-sm text-gray-600 mb-4">The submission you're looking for doesn't exist.</p>
          <Button onClick={() => router.push(`/applications/${applicationId}`)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Application
          </Button>
        </div>
      </div>
    )
  }

  const statusInfo = getStatusInfo(submission.status)
  const StatusIcon = statusInfo.icon

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/applications/${applicationId}`)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Application
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {submission.application?.title || 'Application Submission'}
              </h1>
              <p className="text-sm text-gray-600">
                Confirmation: {submission.confirmationNumber || submission.id}
              </p>
            </div>
          </div>

          <Badge className={statusInfo.color}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {statusInfo.label}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Applicant Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Applicant Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {submission.applicantEmail && (
                <div>
                  <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                    <Mail className="w-4 h-4" />
                    Email
                  </label>
                  <p className="text-gray-900">
                    <a href={`mailto:${submission.applicantEmail}`} className="text-blue-600 hover:underline">
                      {submission.applicantEmail}
                    </a>
                  </p>
                </div>
              )}

              {(submission.applicantFirstName || submission.applicantLastName) && (
                <div>
                  <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                    <User className="w-4 h-4" />
                    Name
                  </label>
                  <p className="text-gray-900">
                    {submission.applicantFirstName} {submission.applicantLastName}
                  </p>
                </div>
              )}

              {submission.applicantPhone && (
                <div>
                  <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                    <Phone className="w-4 h-4" />
                    Phone
                  </label>
                  <p className="text-gray-900">
                    <a href={`tel:${submission.applicantPhone}`} className="text-blue-600 hover:underline">
                      {submission.applicantPhone}
                    </a>
                  </p>
                </div>
              )}

              {submission.companyName && (
                <div>
                  <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                    <Building2 className="w-4 h-4" />
                    Company
                  </label>
                  <p className="text-gray-900">{submission.companyName}</p>
                </div>
              )}

              {submission.submittedAt && (
                <div>
                  <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Submitted
                  </label>
                  <p className="text-gray-900">{format(new Date(submission.submittedAt), 'MMM d, yyyy h:mm a')}</p>
                </div>
              )}

              {submission.reviewedAt && (
                <div>
                  <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Reviewed
                  </label>
                  <p className="text-gray-900">{format(new Date(submission.reviewedAt), 'MMM d, yyyy h:mm a')}</p>
                </div>
              )}
            </div>

            {submission.reviewNotes && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <label className="text-sm font-medium text-blue-900 flex items-center gap-1 mb-2">
                  <AlertCircle className="w-4 h-4" />
                  Review Notes
                </label>
                <p className="text-blue-800 whitespace-pre-wrap">{submission.reviewNotes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Form Responses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Application Responses
            </CardTitle>
          </CardHeader>
          <CardContent>
            {submission.application?.formFields && submission.application.formFields.length > 0 ? (
              <div className="space-y-6">
                {submission.application.formFields
                  .filter(field => field.type !== 'SECTION_HEADER')
                  .sort((a, b) => (a.order || 0) - (b.order || 0))
                  .map((field) => {
                    const value = submission.responses?.[field.id]
                    return (
                      <div key={field.id} className="border-b border-gray-200 pb-4 last:border-0">
                        <label className="text-sm font-medium text-gray-700 block mb-2">
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        {field.description && (
                          <p className="text-sm text-gray-500 mb-2">{field.description}</p>
                        )}
                        <div className="text-gray-900">
                          {renderFieldValue(field, value)}
                        </div>
                      </div>
                    )
                  })}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No form fields available</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
