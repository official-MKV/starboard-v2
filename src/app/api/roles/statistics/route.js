// app/api/roles/statistics/route.js
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WorkspaceContext } from '@/lib/workspace-context'
import { RoleService } from '@/lib/services/role-service'
import { logger } from '@/lib/logger'

/**
 * GET /api/roles/statistics
 * Get role statistics for current workspace
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
      ['roles.view', 'roles.manage', 'analytics.view']
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: { message: 'Insufficient permissions to view role statistics' } },
        { status: 403 }
      )
    }

    // Get role statistics
    const statistics = await RoleService.getStatistics(workspaceContext.workspaceId)

    logger.info('Role statistics fetched', {
      workspaceId: workspaceContext.workspaceId,
      userId: session.user.id,
      totalRoles: statistics.totalRoles,
      totalMembers: statistics.totalMembers,
    })

    return NextResponse.json({
      success: true,
      data: { statistics },
    })
  } catch (error) {
    logger.error('Error fetching role statistics', { error: error.message })
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch role statistics' } },
      { status: 500 }
    )
  }
}
