import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { apiResponse, apiError } from '@/lib/api-utils'
import { prisma } from '@/lib/database'

/**
 * GET /api/applications/[applicationId]/submissions/ids
 * Returns just the submission IDs for navigation purposes
 * Much faster than fetching full submissions with evaluation data
 */
export async function GET(request, { params }) {
  const { applicationId } = await params

  try {
    // Check authentication
    const session = await auth()
    if (!session?.user?.id) {
      return apiError('Unauthorized', 401)
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const currentStep = searchParams.get('currentStep')
    const status = searchParams.get('status')

    // Build where clause
    const whereClause = {
      applicationId,
      ...(currentStep ? { currentStep: parseInt(currentStep) } : {}),
      ...(status ? { status } : {}),
    }

    // Get just the IDs, ordered by submission date
    const submissions = await prisma.applicationSubmission.findMany({
      where: whereClause,
      select: {
        id: true,
      },
      orderBy: { submittedAt: 'desc' },
    })

    const ids = submissions.map(s => s.id)

    return apiResponse({ ids, total: ids.length })
  } catch (error) {
    console.error('Error fetching submission IDs:', error)
    return apiError('Failed to fetch submission IDs', 500)
  }
}
