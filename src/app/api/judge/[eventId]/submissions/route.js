// app/api/judge/[eventId]/submissions/route.js
// Judge API to access submissions (with proper auth and workspace context)
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

    const { eventId } = await params
    const { searchParams } = new URL(request.url)
    const judgeId = searchParams.get('judge')

    if (!judgeId) {
      return NextResponse.json({ error: { message: 'Judge ID required' } }, { status: 400 })
    }

    // Verify judge has access to this event within the workspace
    const judge = await prisma.eventJudge.findFirst({
      where: {
        id: judgeId,
        eventId: eventId,
        userId: session.user.id, // Ensure the authenticated user is the judge
        event: {
          workspaceId: workspaceContext.workspaceId
        }
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        event: {
          include: {
            demoDayConfig: true,
            workspace: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    })

    if (!judge) {
      return NextResponse.json({ error: { message: 'Access denied - Invalid judge credentials' } }, { status: 403 })
    }

    // Check if user has judge permissions or is event creator
    const hasPermission = await WorkspaceContext.hasAnyPermission(
      session.user.id,
      workspaceContext.workspaceId,
      ['events.judge', 'events.manage']
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: { message: 'Insufficient permissions to access judge interface' } },
        { status: 403 }
      )
    }

    // Get all submissions for this event (workspace-scoped)
    const submissions = await prisma.demoDaySubmission.findMany({
      where: { 
        eventId,
        event: {
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
        resources: {
          orderBy: { order: 'asc' }
        },
        scores: {
          where: { judgeId },
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
        }
      },
      orderBy: { submittedAt: 'asc' }
    })

    logger.info('Judge submissions fetched', {
      eventId,
      judgeId: judge.id,
      judgeName: `${judge.user.firstName} ${judge.user.lastName}`,
      workspaceId: workspaceContext.workspaceId,
      userId: session.user.id,
      submissionCount: submissions.length
    })

    return NextResponse.json({
      success: true,
      data: {
        event: judge.event,
        judge,
        submissions
      }
    })

  } catch (error) {
    const { eventId } = await params
    logger.error('Judge submissions fetch error', {
      eventId: eventId,
      userId: session?.user?.id,
      error: error.message
    })
    return NextResponse.json(
      { error: { message: 'Failed to fetch submissions' } },
      { status: 500 }
    )
  }
}
