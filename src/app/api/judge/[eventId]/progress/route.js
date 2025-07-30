 
// Get judging progress for authenticated judge
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WorkspaceContext } from '@/lib/workspace-context'
import { prisma } from '@/lib/database'
import { logger } from '@/lib/logger'

export async function GET(request, { params }) {
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

    const { eventId } = params
    const { searchParams } = new URL(request.url)
    const judgeId = searchParams.get('judge')

    if (!judgeId) {
      return NextResponse.json({ error: { message: 'Judge ID required' } }, { status: 400 })
    }

    // Verify judge access and ensure authenticated user is the judge
    const judge = await prisma.eventJudge.findFirst({
      where: {
        id: judgeId,
        eventId: eventId,
        userId: session.user.id, // Critical: ensure user is the judge
        event: {
          workspaceId: workspaceContext.workspaceId
        }
      },
      include: {
        event: {
          select: {
            workspaceId: true,
            title: true
          }
        }
      }
    })

    if (!judge) {
      return NextResponse.json({ error: { message: 'Access denied - Invalid judge credentials' } }, { status: 403 })
    }

    // Check judge permissions
    const hasPermission = await WorkspaceContext.hasAnyPermission(
      session.user.id,
      workspaceContext.workspaceId,
      ['events.judge', 'events.manage']
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: { message: 'Insufficient permissions to view judge progress' } },
        { status: 403 }
      )
    }

    // Get progress (workspace-scoped)
    const totalSubmissions = await prisma.demoDaySubmission.count({
      where: { 
        eventId,
        event: {
          workspaceId: workspaceContext.workspaceId
        }
      }
    })

    const completedScores = await prisma.demoDayScore.count({
      where: { 
        judgeId,
        submission: {
          event: {
            workspaceId: workspaceContext.workspaceId
          }
        }
      }
    })

    logger.info('Judge progress fetched', {
      eventId,
      judgeId,
      workspaceId: workspaceContext.workspaceId,
      userId: session.user.id,
      progress: {
        completed: completedScores,
        total: totalSubmissions
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        total: totalSubmissions,
        completed: completedScores,
        remaining: totalSubmissions - completedScores,
        progress: totalSubmissions > 0 ? (completedScores / totalSubmissions) * 100 : 0
      }
    })

  } catch (error) {
    logger.error('Progress fetch error', {
      eventId: params.eventId,
      userId: session?.user?.id,
      error: error.message
    })
    return NextResponse.json(
      { error: { message: 'Failed to fetch progress' } },
      { status: 500 }
    )
  }
}