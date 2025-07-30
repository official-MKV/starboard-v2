// app/api/events/[eventId]/demo-day/rankings/route.js
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WorkspaceContext } from '@/lib/workspace-context'
import { prisma } from '@/lib/database'
import { logger } from '@/lib/logger'

export async function GET(request, { params }) {
  try {
    // FIXED: Await params before accessing properties
    const { eventId } = await params
    const { searchParams } = new URL(request.url)
    const isPublic = searchParams.get('public') === 'true'

    let session = null
    let workspaceContext = null

    // For public access, skip authentication but still validate event
    if (!isPublic) {
      session = await auth()
      if (!session?.user?.id) {
        return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
      }

      workspaceContext = await WorkspaceContext.getWorkspaceContext(request, session.user.id)
      if (!workspaceContext) {
        return NextResponse.json(
          { error: { message: 'Workspace context required' } },
          { status: 400 }
        )
      }

      const hasPermission = await WorkspaceContext.hasAnyPermission(
        session.user.id,
        workspaceContext.workspaceId,
        ['events.view', 'events.manage']
      )

      if (!hasPermission) {
        return NextResponse.json(
          { error: { message: 'Insufficient permissions to view rankings' } },
          { status: 403 }
        )
      }
    }

    // Get event with workspace validation for authenticated requests
    const whereClause = isPublic 
      ? { id: eventId }
      : { 
          id: eventId, 
          workspaceId: workspaceContext.workspaceId 
        }

    const event = await prisma.event.findFirst({
      where: whereClause,
      include: {
        demoDayConfig: true,
        workspace: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (!event) {
      return NextResponse.json({ error: { message: 'Event not found' } }, { status: 404 })
    }

    // For public access, check if results should be visible
    if (isPublic) {
      const config = event.demoDayConfig
      if (!config?.showResultsLive && (!config?.resultsPublicAt || new Date() < new Date(config.resultsPublicAt))) {
        return NextResponse.json({ error: { message: 'Results not yet public' } }, { status: 403 })
      }
    }

    // FIXED: Get rankings with correct schema fields
    const submissions = await prisma.demoDaySubmission.findMany({
      where: {
        eventId,
        // REMOVED: isSubmitted filter - doesn't exist in schema
        event: isPublic ? undefined : {
          workspaceId: workspaceContext.workspaceId
        }
      },
      include: {
        submitter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        },
        // FIXED: Remove isComplete filter and fix judge nesting
        scores: {
          include: {
            judge: {
              select: {
                id: true,
                user: {
                  select: {
                    firstName: true,
                    lastName: true
                  }
                }
              }
            }
          }
        },
        _count: {
          select: {
            scores: true // FIXED: Remove isComplete filter
          }
        }
      },
      orderBy: [
        { averageScore: 'desc' },
        { submittedAt: 'asc' }
      ]
    })

    // Calculate additional ranking stats
    const rankingsWithStats = submissions.map((submission, index) => {
      const totalJudges = submission.scores.length > 0 ? 
        [...new Set(submission.scores.map(score => score.judgeId))].length : 0
      
      return {
        ...submission,
        rank: submission.rank || (index + 1), // Use calculated rank or position
        totalJudges,
        isFullyScored: totalJudges > 0,
        // Calculate average if not already calculated
        calculatedAverage: submission.scores.length > 0 
          ? submission.scores.reduce((sum, score) => sum + score.totalScore, 0) / submission.scores.length 
          : 0
      }
    })

    const responseData = {
      rankings: rankingsWithStats,
      config: event.demoDayConfig,
      eventTitle: event.title,
      eventDate: event.startDate,
      totalSubmissions: submissions.length
    }

    // Filter data for public access
    if (isPublic) {
      responseData.rankings = responseData.rankings.map(submission => {
        const publicSubmission = {
          id: submission.id,
          projectTitle: submission.projectTitle,
          category: submission.category,
          stage: submission.stage,
          rank: submission.rank,
          averageScore: submission.averageScore || submission.calculatedAverage,
          submittedAt: submission.submittedAt,
          submitter: {
            firstName: submission.submitter.firstName,
            lastName: submission.submitter.lastName
          }
        }

        // Add judge information if configured to show
        if (event.demoDayConfig?.showJudgeNames) {
          publicSubmission.judgeCount = submission._count.scores
        }

        // Add detailed scores if configured
        if (event.demoDayConfig?.showDetailedScores) {
          publicSubmission.scores = submission.scores.map(score => ({
            judge: `${score.judge.user.firstName} ${score.judge.user.lastName}`,
            totalScore: score.totalScore,
            feedback: score.feedback,
          }))
        }

        return publicSubmission
      })
    }

    logger.info('Demo day rankings fetched', {
      eventId,
      workspaceId: event.workspace?.id,
      userId: session?.user?.id,
      isPublic,
      submissionCount: submissions.length
    })

    return NextResponse.json({
      success: true,
      data: responseData
    })

  } catch (error) {
    logger.error('Failed to fetch demo day rankings', { 
      eventId: (await params).eventId, // FIXED: Await params in error logging
      userId: session?.user?.id,
      error: error.message 
    })
    return NextResponse.json(
      { error: { message: 'Failed to fetch rankings' } },
      { status: 500 }
    )
  }
}

export async function POST(request, { params }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    const workspaceContext = await WorkspaceContext.getWorkspaceContext(request, session.user.id)
    if (!workspaceContext) {
      return NextResponse.json(
        { error: { message: 'Workspace context required' } },
        { status: 400 }
      )
    }

    const hasPermission = await WorkspaceContext.hasPermission(
      session.user.id,
      workspaceContext.workspaceId,
      'events.manage'
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: { message: 'Insufficient permissions to manage rankings' } },
        { status: 403 }
      )
    }

    // FIXED: Await params before accessing properties
    const { eventId } = await params
    const body = await request.json()
    const { action } = body

    // Verify event belongs to workspace
    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        workspaceId: workspaceContext.workspaceId
      }
    })

    if (!event) {
      return NextResponse.json({ error: { message: 'Event not found' } }, { status: 404 })
    }

    if (action === 'finalize') {
      // Calculate final rankings by updating averageScore and rank fields
      const submissions = await prisma.demoDaySubmission.findMany({
        where: { 
          eventId,
          event: {
            workspaceId: workspaceContext.workspaceId
          }
        },
        include: {
          scores: true
        }
      })

      // Calculate and update scores
      const updates = []
      for (const submission of submissions) {
        if (submission.scores.length > 0) {
          const avgScore = submission.scores.reduce((sum, score) => sum + score.totalScore, 0) / submission.scores.length
          updates.push({
            id: submission.id,
            averageScore: avgScore
          })
        }
      }

      // Update average scores
      await Promise.all(
        updates.map(update =>
          prisma.demoDaySubmission.update({
            where: { id: update.id },
            data: { averageScore: update.averageScore }
          })
        )
      )

      // Update ranks based on average scores
      const sortedSubmissions = updates.sort((a, b) => b.averageScore - a.averageScore)
      await Promise.all(
        sortedSubmissions.map((submission, index) =>
          prisma.demoDaySubmission.update({
            where: { id: submission.id },
            data: { rank: index + 1 }
          })
        )
      )

      logger.info('Demo day rankings finalized', {
        eventId,
        workspaceId: workspaceContext.workspaceId,
        userId: session.user.id,
        submissionCount: updates.length
      })
      
      return NextResponse.json({
        success: true,
        data: { 
          message: 'Rankings finalized successfully',
          updatedSubmissions: updates.length
        }
      })
    }

    if (action === 'publish') {
      const { isPublic } = body
      
      await prisma.demoDayConfig.update({
        where: { eventId },
        data: {
          showResultsLive: isPublic,
          resultsPublicAt: isPublic ? new Date() : null
        }
      })

      logger.info('Demo day results visibility updated', {
        eventId,
        workspaceId: workspaceContext.workspaceId,
        userId: session.user.id,
        isPublic
      })
      
      return NextResponse.json({
        success: true,
        data: { message: `Results ${isPublic ? 'published' : 'hidden'}` }
      })
    }

    return NextResponse.json(
      { error: { message: 'Invalid action. Use "finalize" or "publish"' } },
      { status: 400 }
    )

  } catch (error) {
    logger.error('Failed to update demo day rankings', { 
      eventId: (await params).eventId, // FIXED: Await params in error logging
      userId: session?.user?.id,
      error: error.message 
    })
    return NextResponse.json(
      { error: { message: error.message || 'Failed to update rankings' } },
      { status: 500 }
    )
  }
}