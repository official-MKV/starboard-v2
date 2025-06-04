import { auth } from '@/lib/auth'
import { WorkspaceContext } from '@/lib/workspace-context'
import { PrismaClient } from '@prisma/client'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
export async function GET(request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    const userId = session.user.id
    const { searchParams } = new URL(request.url)

    // Get workspace context
    const workspaceContext = await WorkspaceContext.getWorkspaceContext(request, userId)
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

    // Pagination parameters
    const page = parseInt(searchParams.get('page')) || 1
    const limit = Math.min(parseInt(searchParams.get('limit')) || 20, 100) // Max 100
    const skip = (page - 1) * limit

    // Filter parameters
    const type = searchParams.get('type') // application, workspace, auth, etc.
    const level = searchParams.get('level') // ERROR, WARN, INFO, DEBUG
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Build where clause - always scoped to workspace
    let whereClause = {
      workspaceId: workspaceContext.workspaceId,
      ...(canViewAllActivities ? {} : { userId }),
    }

    // Add filters
    if (type) {
      whereClause.type = { contains: type }
    }

    if (level) {
      whereClause.level = level
    }

    if (startDate || endDate) {
      whereClause.timestamp = {}
      if (startDate) {
        whereClause.timestamp.gte = new Date(startDate)
      }
      if (endDate) {
        whereClause.timestamp.lte = new Date(endDate)
      }
    }

    // Get activities and total count
    const [activities, totalCount] = await Promise.all([
      prisma.activity.findMany({
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
              companyName: true,
              status: true,
            },
          },
          // calendarEvent: {
          //   select: {
          //     id: true,
          //     title: true,
          //     startDate: true
          //   }
          // },
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
        skip,
        take: limit,
      }),
      prisma.activity.count({
        where: whereClause,
      }),
    ])

    const totalPages = Math.ceil(totalCount / limit)

    logger.info('Activities fetched', {
      workspaceId: workspaceContext.workspaceId,
      userId: userId,
      page: page,
      activityCount: activities.length,
      totalCount: totalCount,
    })

    return NextResponse.json({
      success: true,
      data: {
        activities,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasMore: page < totalPages,
        },
        canViewAll: canViewAllActivities,
        workspace: workspaceContext.workspace,
        filters: {
          type,
          level,
          startDate,
          endDate,
        },
      },
    })
  } catch (error) {
    logger.apiError(
      'GET',
      '/api/activities',
      error,
      session?.user?.id,
      workspaceContext?.workspaceId
    )
    return NextResponse.json({ error: { message: 'Failed to fetch activities' } }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
