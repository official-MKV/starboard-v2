import { NextResponse } from 'next/server'
import { applicationService } from '@/lib/services/application'
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils'
import { logger, createRequestTimer } from '@/lib/logger'

export async function GET(request, { params }) {
  const timer = createRequestTimer()
  const { applicationId } = await params

  try {
    logger.apiRequest('GET', `/api/public/applications/${applicationId}`)

    const application = await applicationService.findById(applicationId)

    if (!application) {
      timer.log('GET', `/api/public/applications/${applicationId}`, 404)
      return apiError('Application not found', 404)
    }

    // Check if application is publicly accessible

    // Check if application is still accepting submissions
    const now = new Date()

    if (!application.isActive) {
      timer.log('GET', `/api/public/applications/${applicationId}`, 410)
      return apiError('Application is no longer accepting submissions', 410)
    }

    // Don't block access if not yet open or already closed - let the frontend handle it
    // This allows people to see the form but not submit

    // Filter out admin-only information and only show visible fields
    const publicApplication = {
      id: application.id,
      title: application.title,
      description: application.description,
      isActive: application.isActive,
      openDate: application.openDate,
      closeDate: application.closeDate,
      maxSubmissions: application.maxSubmissions,
      allowMultipleSubmissions: application.allowMultipleSubmissions,
      requireAuthentication: application.requireAuthentication,
      submissionCount: application.submissionCount,
      workspace: {
        id: application.workspace.id,
        name: application.workspace.name,
        description: application.workspace.description,
      },
      formFields: application.formFields
        .filter(field => field.isVisible !== false)
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map(field => ({
          id: field.id,
          type: field.type,
          label: field.label,
          description: field.description,
          placeholder: field.placeholder,
          required: field.required,
          order: field.order,
          section: field.section,
          options: field.options,
          minLength: field.minLength,
          maxLength: field.maxLength,
          minValue: field.minValue,
          maxValue: field.maxValue,
          allowedFileTypes: field.allowedFileTypes,
          maxFileSize: field.maxFileSize,
          maxFiles: field.maxFiles,
          isVisible: field.isVisible,
        })),
    }

    timer.log('GET', `/api/public/applications/${applicationId}`, 200)

    return apiResponse({ application: publicApplication })
  } catch (error) {
    logger.apiError('GET', `/api/public/applications/${applicationId}`, error)
    timer.log('GET', `/api/public/applications/${applicationId}`, 500)
    return handleApiError(error)
  }
}
