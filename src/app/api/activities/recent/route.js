import { auth } from '@/lib/auth'
import { WorkspaceContext } from '@/lib/workspace-context'
import { PrismaClient } from '@prisma/client'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

const prisma = new PrismaClient()

export async function GET(request) {
  let session = null
  let workspaceContext = null

  try {
    session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    const userId = session.user.id
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit')) || 10

    // Get workspace context
    workspaceContext = await WorkspaceContext.getWorkspaceContext(request, userId)
    if (!workspaceContext) {
      return NextResponse.json(
        { error: { message: 'Workspace context required' } },
        { status: 400 }
      )
    }

    // Check permissions
    const canViewAllActivities = await WorkspaceContext.hasAnyPermission(
      userId,
      workspaceContext.workspaceId,
      ['activities.view_all', 'admin.all']
    )

    // Define excluded internal activity types
    const excludedTypes = ['info', 'api_error', 'system']

    // Build query
    const whereClause = {
      workspaceId: workspaceContext.workspaceId,
      type: { notIn: excludedTypes },
      ...(canViewAllActivities ? {} : { userId }),
    }

    const activities = await prisma.activity.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        application: {
          select: {
            id: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: limit,
    })

    logger.info('Recent activities fetched', {
      workspaceId: workspaceContext.workspaceId,
      userId: userId,
      activityCount: activities.length,
      canViewAll: canViewAllActivities,
    })

    return NextResponse.json({
      success: true,
      data: {
        activities,
        canViewAll: canViewAllActivities,
        workspace: workspaceContext.workspace,
      },
    })
  } catch (error) {
    logger.apiError(
      'GET',
      '/api/activities/recent',
      error,
      session?.user?.id,
      workspaceContext?.workspaceId
    )
    return NextResponse.json({ error: { message: 'Failed to fetch activities' } }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
