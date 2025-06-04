import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { applicationService } from '@/lib/services/application'
import { validateRequest, apiResponse, apiError, handleApiError } from '@/lib/api-utils'
import { logger, createRequestTimer } from '@/lib/logger'
import { generateId } from '@/lib/utils'
import { z } from 'zod'

const submitApplicationSchema = z.object({
  applicantEmail: z.string().email('Invalid email address').optional(),
  applicantFirstName: z.string().min(1, 'First name is required').optional(),
  applicantLastName: z.string().min(1, 'Last name is required').optional(),
  applicantPhone: z.string().optional(),
  companyName: z.string().optional(),
  responses: z.record(z.any()).default({}),
  attachments: z.array(z.string()).optional(),
})

export async function POST(request, { params }) {
  const timer = createRequestTimer()
  const { applicationId } = params

  try {
    logger.apiRequest('POST', `/api/applications/${applicationId}/submit`)

    const validation = await validateRequest(request, submitApplicationSchema)
    console.log(validation)

    if (!validation.success) {
      timer.log('POST', `/api/applications/${applicationId}/submit`, 400)
      return apiError('Validation failed', 400, 'VALIDATION_ERROR')
    }

    const data = validation.data

    const application = await applicationService.findById(applicationId)

    if (!application) {
      timer.log('POST', `/api/applications/${applicationId}/submit`, 404)
      return apiError('Application not found', 404)
    }

    if (!application.isActive) {
      timer.log('POST', `/api/applications/${applicationId}/submit`, 400)
      return apiError('Application is not currently accepting submissions', 400)
    }

    // Check if application is within submission period
    const now = new Date()
    if (application.openDate && application.openDate > now) {
      timer.log('POST', `/api/applications/${applicationId}/submit`, 400)
      return apiError('Application submissions have not opened yet', 400)
    }

    if (application.closeDate && application.closeDate < now) {
      timer.log('POST', `/api/applications/${applicationId}/submit`, 400)
      return apiError('Application submissions have closed', 400)
    }

    if (application.maxSubmissions) {
      const currentCount = await applicationService.getSubmissionCount(applicationId)
      if (currentCount >= application.maxSubmissions) {
        timer.log('POST', `/api/applications/${applicationId}/submit`, 400)
        return apiError('Maximum number of submissions reached', 400)
      }
    }

    if (!application.allowMultipleSubmissions) {
      const existingSubmission = await applicationService.findSubmissionByEmail(
        applicationId,
        data.applicantEmail
      )

      if (existingSubmission) {
        timer.log('POST', `/api/applications/${applicationId}/submit`, 400)
        return apiError('You have already submitted an application', 400)
      }
    }

    // Validate form responses against application fields
    const validationResult = await applicationService.validateSubmission(
      applicationId,
      data.responses
    )

    if (!validationResult.isValid) {
      timer.log('POST', `/api/applications/${applicationId}/submit`, 400)
      return apiError('Form validation failed', 400, 'FORM_VALIDATION_ERROR', {
        fieldErrors: validationResult.errors,
      })
    }

    // Check if user needs authentication
    let userId = null
    const session = await auth()

    if (application.requireAuthentication) {
      if (!session?.user?.id) {
        timer.log('POST', `/api/applications/${applicationId}/submit`, 401)
        return apiError('Authentication required for this application', 401)
      }
      userId = session.user.id
    } else if (session?.user?.id) {
      // Link to user account if they're logged in (optional)
      if (session.user.email === data.applicantEmail) {
        userId = session.user.id
      }
    }

    // Create the submission
    const submissionData = {
      applicationId,
      applicantEmail: data.applicantEmail.toLowerCase().trim(),
      applicantFirstName: data.applicantFirstName.trim(),
      applicantLastName: data.applicantLastName.trim(),
      applicantPhone: data.applicantPhone?.trim() || null,
      companyName: data.companyName?.trim() || null,
      userId,
      responses: data.responses,
      attachments: data.attachments || [],
      status: 'SUBMITTED',
      submittedAt: new Date(),
      progress: 100,
    }

    const submission = await applicationService.createSubmission(submissionData)

    // Update submission count
    await applicationService.incrementSubmissionCount(applicationId)

    logger.authEvent('application_submitted', userId || 'anonymous', {
      applicationId,
      submissionId: submission.id,
      applicantEmail: data.applicantEmail,
    })

    // TODO: Send confirmation email to applicant
    // TODO: Send notification to application admin

    timer.log('POST', `/api/applications/${applicationId}/submit`, 201)

    return apiResponse(
      {
        submission: {
          id: submission.id,
          status: submission.status,
          submittedAt: submission.submittedAt,
          confirmationNumber: submission.id.slice(-8).toUpperCase(),
        },
        message: 'Application submitted successfully',
      },
      201
    )
  } catch (error) {
    logger.apiError('POST', `/api/applications/${applicationId}/submit`, error)
    timer.log('POST', `/api/applications/${applicationId}/submit`, 500)
    return handleApiError(error)
  }
}

// Get submission status for a specific applicant
export async function GET(request, { params }) {
  const timer = createRequestTimer()
  const { applicationId } = params

  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      timer.log('GET', `/api/applications/${applicationId}/submit`, 400)
      return apiError('Email parameter is required', 400)
    }

    logger.apiRequest('GET', `/api/applications/${applicationId}/submit`)

    const submission = await applicationService.findSubmissionByEmail(
      applicationId,
      email.toLowerCase().trim()
    )

    if (!submission) {
      timer.log('GET', `/api/applications/${applicationId}/submit`, 404)
      return apiResponse({ hasSubmission: false })
    }

    timer.log('GET', `/api/applications/${applicationId}/submit`, 200)

    return apiResponse({
      hasSubmission: true,
      submission: {
        id: submission.id,
        status: submission.status,
        submittedAt: submission.submittedAt,
        confirmationNumber: submission.id.slice(-8).toUpperCase(),
      },
    })
  } catch (error) {
    logger.apiError('GET', `/api/applications/${applicationId}/submit`, error)
    timer.log('GET', `/api/applications/${applicationId}/submit`, 500)
    return handleApiError(error)
  }
}
