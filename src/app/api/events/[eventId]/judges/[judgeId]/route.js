import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WorkspaceContext } from '@/lib/workspace-context'
import { prisma } from '@/lib/database'
import { logger } from '@/lib/logger'

export async function DELETE(request, { params }) {
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
        { error: { message: 'Insufficient permissions to manage event judges' } },
        { status: 403 }
      )
    }

    const { eventId, judgeId } = await params

    // Verify event belongs to workspace and get judge info
    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        workspaceId: workspaceContext.workspaceId
      },
      include: {
        judges: {
          where: { id: judgeId },
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        }
      }
    })

    if (!event) {
      return NextResponse.json({ error: { message: 'Event not found' } }, { status: 404 })
    }

    const judge = event.judges[0]
    if (!judge) {
      return NextResponse.json({ error: { message: 'Judge not found' } }, { status: 404 })
    }

    // Remove judge and their scores in transaction
    await prisma.$transaction([
      prisma.demoDayScore.deleteMany({
        where: { 
          judgeId,
          submission: {
            event: {
              workspaceId: workspaceContext.workspaceId
            }
          }
        }
      }),
      prisma.eventJudge.delete({
        where: { id: judgeId }
      })
    ])

    logger.info('Judge removed from event', {
      eventId,
      judgeId,
      judgeName: `${judge.user.firstName} ${judge.user.lastName}`,
      workspaceId: workspaceContext.workspaceId,
      userId: session.user.id,
      removedBy: session.user.id
    })

    return NextResponse.json({
      success: true,
      message: 'Judge removed successfully'
    })

  } catch (error) {
    const { eventId, judgeId } = await params
    logger.error('Remove judge error', {
      eventId: eventId,
      judgeId: judgeId,
      userId: session?.user?.id,
      error: error.message
    })
    return NextResponse.json(
      { error: { message: 'Failed to remove judge' } },
      { status: 500 }
    )
  }
}