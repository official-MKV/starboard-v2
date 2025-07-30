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

    // FIXED LOGIC: Get roles with judge permissions first
    const rolesWithJudgePermissions = await prisma.role.findMany({
      where: {
        workspaceId: workspaceContext.workspaceId,
        OR: [
          { permissions: { array_contains: 'demo-day.judge' } },
          { permissions: { array_contains: 'events.manage' } }
        ]
      },
      select: {
        id: true,
        name: true,
        color: true
      }
    })

    if (rolesWithJudgePermissions.length === 0) {
      return NextResponse.json({
        success: true,
        data: { 
          potentialJudges: [],
          message: 'No roles have judge permissions'
        }
      })
    }
    console.log(rolesWithJudgePermissions)

    const roleIds = rolesWithJudgePermissions.map(role => role.id)

    // Get existing judges to exclude them
    const existingJudges = await prisma.eventJudge.findMany({
      where: { eventId },
      select: { userId: true }
    })
    const existingJudgeIds = existingJudges.map(j => j.userId)

    // Now get users with those roles
    const potentialJudges = await prisma.workspaceMember.findMany({
      where: {
        workspaceId: workspaceContext.workspaceId,
        roleId: { in: roleIds },
        isActive: true,
        userId: { 
          notIn: [...existingJudgeIds] // Exclude existing judges and current user
        }
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
            jobTitle: true,
            isActive: true
          }
        },
        role: {
          select: {
            name: true,
            color: true
          }
        }
      },
      orderBy: [
        { user: { firstName: 'asc' } }
      ]
    })
    console.log(potentialJudges)

    logger.info('Potential judges fetched', {
      eventId,
      workspaceId: workspaceContext.workspaceId,
      userId: session.user.id,
      rolesWithPermissions: rolesWithJudgePermissions.length,
      eligibleUsers: potentialJudges.length
    })

    return NextResponse.json({
      success: true,
      data: { 
        potentialJudges,
        rolesWithPermissions: rolesWithJudgePermissions
      }
    })

  } catch (error) {
    logger.error('Error fetching potential judges', {
      eventId: (await params).eventId,
      userId: session?.user?.id,
      error: error.message
    })
    return NextResponse.json(
      { error: { message: 'Failed to fetch potential judges' } },
      { status: 500 }
    )
  }
}