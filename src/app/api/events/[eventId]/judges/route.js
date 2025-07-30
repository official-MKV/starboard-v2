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
    logger.error('Error fetching event judges', {
      eventId: (await params).eventId,
      userId: session?.user?.id,
      error: error.message
    })
    return NextResponse.json(
      { error: { message: 'Failed to fetch judges' } },
      { status: 500 }
    )
  }
}

// Simplified POST - just assign existing workspace users as judges
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
        { error: { message: 'Insufficient permissions to manage event judges' } },
        { status: 403 }
      )
    }

    const { eventId } = await params
    const body = await request.json()
    const { userIds = [] } = body // Array of user IDs to assign as judges

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: { message: 'At least one user ID is required' } },
        { status: 400 }
      )
    }

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

    // Verify all users belong to workspace and have judge permissions
    const eligibleUsers = await prisma.workspaceMember.findMany({
      where: {
        workspaceId: workspaceContext.workspaceId,
        userId: { in: userIds },
        isActive: true
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
        role: {
          select: {
            permissions: true
          }
        }
      }
    })

    // Check if users have judge permissions
    const validJudges = eligibleUsers.filter(member => {
      const permissions = member.role.permissions || []
      return permissions.includes('demo-day.judge') || 
             permissions.includes('events.manage')
    })

    if (validJudges.length === 0) {
      return NextResponse.json(
        { error: { message: 'No users have judge permissions' } },
        { status: 400 }
      )
    }

    // Create judge assignments (skip existing ones)
    const existingJudges = await prisma.eventJudge.findMany({
      where: { eventId },
      select: { userId: true }
    })
    const existingJudgeIds = existingJudges.map(j => j.userId)

    const newJudges = validJudges.filter(user => 
      !existingJudgeIds.includes(user.userId)
    )

    if (newJudges.length === 0) {
      return NextResponse.json(
        { error: { message: 'All selected users are already judges for this event' } },
        { status: 400 }
      )
    }

    // Create judge records
    const createdJudges = await prisma.$transaction(
      newJudges.map(member =>
        prisma.eventJudge.create({
          data: {
            eventId,
            userId: member.userId,
            isExternal: false,
            status: 'ACCEPTED' // Since they're internal, assume accepted
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
            }
          }
        })
      )
    )

    logger.info('Judges assigned to event', {
      eventId,
      workspaceId: workspaceContext.workspaceId,
      userId: session.user.id,
      assignedJudges: createdJudges.map(j => ({
        id: j.id,
        name: `${j.user.firstName} ${j.user.lastName}`,
        email: j.user.email
      }))
    })

    return NextResponse.json({
      success: true,
      data: { 
        judges: createdJudges,
        assignedCount: createdJudges.length,
        skippedCount: userIds.length - newJudges.length
      },
      message: `Successfully assigned ${createdJudges.length} judge(s)`
    })

  } catch (error) {
    logger.error('Error assigning judges to event', {
      eventId: (await params).eventId,
      userId: session?.user?.id,
      error: error.message
    })

    return NextResponse.json(
      { error: { message: 'Failed to assign judges' } },
      { status: 500 }
    )
  }
}
