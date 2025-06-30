import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/database'
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils'
import { logger, createRequestTimer } from '@/lib/logger'

export async function GET(request) {
  const timer = createRequestTimer()

  try {
    const session = await auth()

    if (!session?.user?.id) {
      timer.log('GET', '/api/applications/stats', 401)
      return apiError('Authentication required', 401)
    }

    logger.apiRequest('GET', '/api/applications/stats', session.user.id)

    // Get user's workspaces
    const userWorkspaces = session.user.workspaces || []

    if (userWorkspaces.length === 0) {
      timer.log('GET', '/api/applications/stats', 200, session.user.id)
      return apiResponse({
        totalApplications: 0,
        activeApplications: 0,
        totalSubmissions: 0,
        pendingReviews: 0,
        acceptanceRate: 0,
        thisWeekSubmissions: 0,
        avgReviewTime: 0,
      })
    }

    const workspaceIds = userWorkspaces.map(ws => ws.id)
    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Get basic application stats
    const [
      totalApplications,
      activeApplications,
      totalSubmissions,
      pendingSubmissions,
      thisWeekSubmissions,
      reviewedSubmissions,
    ] = await Promise.all([
      // Total applications
      prisma.application.count({
        where: {
          workspaceId: { in: workspaceIds },
        },
      }),

      // Active applications
      prisma.application.count({
        where: {
          workspaceId: { in: workspaceIds },
          isActive: true,
          OR: [{ closeDate: null }, { closeDate: { gte: now } }],
        },
      }),

      // Total submissions
      prisma.applicationSubmission.count({
        where: {
          application: {
            workspaceId: { in: workspaceIds },
          },
        },
      }),

      // Pending reviews (submitted but not reviewed)
      prisma.applicationSubmission.count({
        where: {
          application: {
            workspaceId: { in: workspaceIds },
          },
          status: 'SUBMITTED',
          reviewedAt: null,
        },
      }),

      // This week submissions
      prisma.applicationSubmission.count({
        where: {
          application: {
            workspaceId: { in: workspaceIds },
          },
          submittedAt: {
            gte: oneWeekAgo,
          },
        },
      }),

      // Reviewed submissions for acceptance rate calculation
      prisma.applicationSubmission.findMany({
        where: {
          application: {
            workspaceId: { in: workspaceIds },
          },
          status: { in: ['ACCEPTED', 'REJECTED'] },
          reviewedAt: { not: null },
        },
        select: {
          status: true,
          reviewedAt: true,
          submittedAt: true,
        },
      }),
    ])

    // Calculate acceptance rate
    const acceptedSubmissions = reviewedSubmissions.filter(s => s.status === 'ACCEPTED').length
    const acceptanceRate =
      reviewedSubmissions.length > 0
        ? Math.round((acceptedSubmissions / reviewedSubmissions.length) * 100 * 10) / 10
        : 0

    // Calculate average review time (in days)
    let avgReviewTime = 0
    if (reviewedSubmissions.length > 0) {
      const totalReviewTime = reviewedSubmissions.reduce((sum, submission) => {
        if (submission.submittedAt && submission.reviewedAt) {
          const reviewTime = new Date(submission.reviewedAt) - new Date(submission.submittedAt)
          return sum + reviewTime / (1000 * 60 * 60 * 24) // Convert to days
        }
        return sum
      }, 0)

      avgReviewTime = Math.round((totalReviewTime / reviewedSubmissions.length) * 10) / 10
    }

    const stats = {
      totalApplications,
      activeApplications,
      totalSubmissions,
      pendingReviews: pendingSubmissions,
      acceptanceRate,
      thisWeekSubmissions,
      avgReviewTime,
    }

    logger.info('Applications stats retrieved', {
      userId: session.user.id,
      workspaceCount: workspaceIds.length,
      stats,
    })

    timer.log('GET', '/api/applications/stats', 200, session.user.id)

    return apiResponse(stats)
  } catch (error) {
    logger.apiError('GET', '/api/applications/stats', error, session?.user?.id)
    timer.log('GET', '/api/applications/stats', 500, session?.user?.id)
    return handleApiError(error)
  }
}
