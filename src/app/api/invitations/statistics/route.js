// app/api/invitations/statistics/route.js
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WorkspaceContext } from '@/lib/workspace-context'
import { InvitationService } from '@/lib/services/invitation-service'
import { logger } from '@/lib/logger'

/**
 * GET /api/invitations/statistics
 * Get invitation statistics for current workspace
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
      ['users.view', 'users.manage', 'users.invite', 'analytics.view']
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: { message: 'Insufficient permissions to view invitation statistics' } },
        { status: 403 }
      )
    }

    // Get invitation statistics
    const statistics = await InvitationService.getStatistics(workspaceContext.workspaceId)

    logger.info('Invitation statistics fetched', {
      workspaceId: workspaceContext.workspaceId,
      userId: session.user.id,
      totalInvitations: statistics.totalInvitations,
      activeInvitations: statistics.activeInvitations,
    })

    return NextResponse.json({
      success: true,
      data: { statistics },
    })
  } catch (error) {
    logger.error('Error fetching invitation statistics', { error: error.message })
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch invitation statistics' } },
      { status: 500 }
    )
  }
}
