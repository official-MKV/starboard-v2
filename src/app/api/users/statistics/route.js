// app/api/users/statistics/route.js
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WorkspaceContext } from '@/lib/workspace-context'
import { prisma, handleDatabaseError } from '@/lib/database'
import { logger } from '@/lib/logger'

/**
 * GET /api/users/statistics
 * Get user statistics for current workspace
 */
export async function GET(request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    // Get workspace context from cookies
    const workspaceContext = await WorkspaceContext.getWorkspaceContext(request, session.user.id)
    if (!workspaceContext) {
      return NextResponse.json(
        { error: { message: 'Workspace context required' } },
        { status: 400 }
      )
    }

    // Check permissions
    const hasPermission = await WorkspaceContext.hasAnyPermission(
      session.user.id,
      workspaceContext.workspaceId,
      ['users.view', 'users.manage', 'analytics.view']
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: { message: 'Insufficient permissions to view user statistics' } },
        { status: 403 }
      )
    }

    const workspaceId = workspaceContext.workspaceId

    // Get comprehensive user statistics
    const [
      totalUsers,
      activeUsers,
      inactiveUsers,
      verifiedUsers,
      unverifiedUsers,
      recentJoins,
      usersByRole,
      loginActivity,
    ] = await Promise.all([
      // Total users
      prisma.workspaceMember.count({
        where: { workspaceId },
      }),

      // Active users
      prisma.workspaceMember.count({
        where: { workspaceId, isActive: true },
      }),

      // Inactive users
      prisma.workspaceMember.count({
        where: { workspaceId, isActive: false },
      }),

      // Verified users
      prisma.workspaceMember.count({
        where: {
          workspaceId,
          user: { isEmailVerified: true },
        },
      }),

      // Unverified users
      prisma.workspaceMember.count({
        where: {
          workspaceId,
          user: { isEmailVerified: false },
        },
      }),

      // Recent joins (last 30 days)
      prisma.workspaceMember.count({
        where: {
          workspaceId,
          joinedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),

      // Users by role
      prisma.role.findMany({
        where: { workspaceId },
        select: {
          id: true,
          name: true,
          color: true,
          _count: {
            select: { members: true },
          },
        },
      }),

      // Login activity (users who logged in last 7 days)
      prisma.workspaceMember.count({
        where: {
          workspaceId,
          user: {
            lastLoginAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        },
      }),
    ])

    // Calculate growth (compare with previous 30 days)
    const previousPeriodStart = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
    const previousPeriodEnd = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const previousPeriodJoins = await prisma.workspaceMember.count({
      where: {
        workspaceId,
        joinedAt: {
          gte: previousPeriodStart,
          lt: previousPeriodEnd,
        },
      },
    })

    const growthRate =
      previousPeriodJoins > 0
        ? (((recentJoins - previousPeriodJoins) / previousPeriodJoins) * 100).toFixed(1)
        : recentJoins > 0
          ? 100
          : 0

    const statistics = {
      totalUsers,
      activeUsers,
      inactiveUsers,
      verifiedUsers,
      unverifiedUsers,
      recentJoins,
      loginActivity,
      growthRate: parseFloat(growthRate),
      verificationRate: totalUsers > 0 ? ((verifiedUsers / totalUsers) * 100).toFixed(1) : 0,
      activityRate: totalUsers > 0 ? ((loginActivity / totalUsers) * 100).toFixed(1) : 0,
      usersByRole: usersByRole.map(role => ({
        roleId: role.id,
        roleName: role.name,
        roleColor: role.color,
        userCount: role._count.members,
        percentage: totalUsers > 0 ? ((role._count.members / totalUsers) * 100).toFixed(1) : 0,
      })),
    }

    logger.info('User statistics fetched', {
      workspaceId,
      userId: session.user.id,
      totalUsers: statistics.totalUsers,
      activeUsers: statistics.activeUsers,
    })

    return NextResponse.json({
      success: true,
      data: { statistics },
    })
  } catch (error) {
    logger.error('Error fetching user statistics', { error: error.message })
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch user statistics' } },
      { status: 500 }
    )
  }
}
