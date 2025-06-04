export async function GET(request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    const userId = session.user.id

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

    const baseWhereClause = {
      workspaceId: workspaceContext.workspaceId,
      ...(canViewAllActivities ? {} : { userId }),
    }

    // Get activity statistics
    const [totalActivities, todayActivities, weekActivities, errorCount, typeBreakdown] =
      await Promise.all([
        // Total activities
        prisma.activity.count({ where: baseWhereClause }),

        // Today's activities
        prisma.activity.count({
          where: {
            ...baseWhereClause,
            timestamp: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
        }),

        // This week's activities
        prisma.activity.count({
          where: {
            ...baseWhereClause,
            timestamp: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        }),

        // Error count (last 24 hours)
        prisma.activity.count({
          where: {
            ...baseWhereClause,
            level: 'ERROR',
            timestamp: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
        }),

        // Activity type breakdown
        prisma.activity.groupBy({
          by: ['type'],
          where: {
            ...baseWhereClause,
            timestamp: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last week
            },
          },
          _count: {
            type: true,
          },
          orderBy: {
            _count: {
              type: 'desc',
            },
          },
          take: 10,
        }),
      ])

    logger.info('Activity statistics fetched', {
      workspaceId: workspaceContext.workspaceId,
      userId: userId,
      totalActivities: totalActivities,
      canViewAll: canViewAllActivities,
    })

    return NextResponse.json({
      success: true,
      data: {
        total: totalActivities,
        count: totalActivities, // For compatibility with your stats format
        today: todayActivities,
        week: weekActivities,
        errors: errorCount,
        typeBreakdown: typeBreakdown.map(item => ({
          type: item.type,
          count: item._count.type,
        })),
        change: weekActivities > 0 ? `+${weekActivities} this week` : 'No activity this week',
        changeType: weekActivities > 0 ? 'positive' : 'neutral',
      },
    })
  } catch (error) {
    logger.apiError(
      'GET',
      '/api/activities/statistics',
      error,
      session?.user?.id,
      workspaceContext?.workspaceId
    )
    return NextResponse.json(
      { error: { message: 'Failed to fetch activity statistics' } },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
