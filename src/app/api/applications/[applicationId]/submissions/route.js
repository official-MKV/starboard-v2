import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { applicationService } from '@/lib/services/application'
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils'
import { logger, createRequestTimer } from '@/lib/logger'

export async function GET(request, { params }) {
  const timer = createRequestTimer()
  const { applicationId } = await params

  try {
    logger.apiRequest('GET', `/api/applications/${applicationId}/submissions`)

    // Check authentication
    const session = await auth()
    if (!session?.user?.id) {
      timer.log('GET', `/api/applications/${applicationId}/submissions`, 401)
      return apiError('Unauthorized', 401)
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    // Verify application exists and user has access
    const application = await applicationService.findById(applicationId)
    if (!application) {
      timer.log('GET', `/api/applications/${applicationId}/submissions`, 404)
      return apiError('Application not found', 404)
    }

    // Get submissions
    const submissions = await applicationService.findSubmissionsByApplication(applicationId, {
      status,
      page,
      limit,
    })

    // Get total count for pagination
    const totalCount = await applicationService.getSubmissionCount(applicationId, { status })

    timer.log('GET', `/api/applications/${applicationId}/submissions`, 200)

    return apiResponse({
      submissions,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    })
  } catch (error) {
    logger.apiError('GET', `/api/applications/${applicationId}/submissions`, error)
    timer.log('GET', `/api/applications/${applicationId}/submissions`, 500)
    return handleApiError(error)
  }
}
