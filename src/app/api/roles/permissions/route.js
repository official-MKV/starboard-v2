// app/api/roles/permissions/route.js
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WorkspaceContext } from '@/lib/workspace-context'
import { RoleService } from '@/lib/services/role-service'
import { logger } from '@/lib/logger'

 
 
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
      ['roles.view', 'roles.manage']
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: { message: 'Insufficient permissions to view permissions' } },
        { status: 403 }
      )
    }

    // Get available permissions
    const permissions = RoleService.getAvailablePermissions()

    logger.info('Permissions fetched', {
      workspaceId: workspaceContext.workspaceId,
      userId: session.user.id,
      categoriesCount: permissions.length,
    })

    return NextResponse.json({
      success: true,
      data: { permissions },
    })
  } catch (error) {
    logger.error('Error fetching permissions', { error: error.message })
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch permissions' } },
      { status: 500 }
    )
  }
}
