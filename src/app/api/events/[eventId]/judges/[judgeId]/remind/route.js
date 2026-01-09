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

    const hasPermission = await WorkspaceContext.hasAnyPermission(
      session.user.id,
      workspaceContext.workspaceId,
      ['events.view', 'events.manage']
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: { message: 'Insufficient permissions to view event judges' } },
        { status: 403 }
      )
    }

    const { eventId } = await params

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

    // Get all judges for this event
    const judges = await prisma.eventJudge.findMany({
      where: { 
        eventId,
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
            email: true,
            avatar: true
          }
        },
        _count: {
          select: {
            scores: true
          }
        }
      },
      orderBy: { invitedAt: 'desc' }
    })

    logger.info('Event judges fetched', {
      eventId,
      workspaceId: workspaceContext.workspaceId,
      userId: session.user.id,
      judgeCount: judges.length
    })

    return NextResponse.json({
      success: true,
      data: { judges }
    })

  } catch (error) {
    const { eventId } = await params
    logger.error('Error fetching event judges', {
      eventId: eventId,
      userId: session?.user?.id,
      error: error.message
    })
    return NextResponse.json(
      { error: { message: 'Failed to fetch judges' } },
      { status: 500 }
    )
  }
}