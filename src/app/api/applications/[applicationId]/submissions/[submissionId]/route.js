import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { applicationService } from '@/lib/services/application'
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils'
import { logger, createRequestTimer } from '@/lib/logger'

export async function GET(request, { params }) {
  const timer = createRequestTimer()
  const { applicationId, submissionId } = await params

  try {
    logger.apiRequest('GET', `/api/applications/${applicationId}/submissions/${submissionId}`)

    // Check authentication
    const session = await auth()
    if (!session?.user?.id) {
      timer.log('GET', `/api/applications/${applicationId}/submissions/${submissionId}`, 401)
      return apiError('Unauthorized', 401)
    }

    // Fetch the submission
    const submission = await applicationService.findSubmissionById(submissionId)

    if (!submission) {
      timer.log('GET', `/api/applications/${applicationId}/submissions/${submissionId}`, 404)
      return apiError('Submission not found', 404)
    }

    // Verify the submission belongs to the correct application
    if (submission.applicationId !== applicationId) {
      timer.log('GET', `/api/applications/${applicationId}/submissions/${submissionId}`, 404)
      return apiError('Submission not found', 404)
    }

    timer.log('GET', `/api/applications/${applicationId}/submissions/${submissionId}`, 200)

    return apiResponse({
      submission,
    })
  } catch (error) {
    logger.apiError('GET', `/api/applications/${applicationId}/submissions/${submissionId}`, error)
    timer.log('GET', `/api/applications/${applicationId}/submissions/${submissionId}`, 500)
    return handleApiError(error)
  }
}
