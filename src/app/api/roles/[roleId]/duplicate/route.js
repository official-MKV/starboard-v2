// app/api/roles/[roleId]/duplicate/route.js
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WorkspaceContext } from '@/lib/workspace-context'
import { RoleService } from '@/lib/services/role-service'
import { logger } from '@/lib/logger'

/**
 * POST /api/roles/[roleId]/duplicate
 * Duplicate a role with a new name
 */
export async function POST(request, { params }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    const { roleId } = await params

    // Get workspace context from cookies
    const workspaceContext = await WorkspaceContext.getWorkspaceContext(request, session.user.id)
    if (!workspaceContext) {
      return NextResponse.json(
        { error: { message: 'Workspace context required' } },
        { status: 400 }
      )
    }

    // Check permissions
    const hasPermission = await WorkspaceContext.hasPermission(
      session.user.id,
      workspaceContext.workspaceId,
      'roles.manage'
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: { message: 'Insufficient permissions to duplicate roles' } },
        { status: 403 }
      )
    }

    // Verify role exists and belongs to current workspace
    const existingRole = await RoleService.findById(roleId)
    if (!existingRole) {
      return NextResponse.json({ error: { message: 'Role not found' } }, { status: 404 })
    }

    if (existingRole.workspaceId !== workspaceContext.workspaceId) {
      return NextResponse.json(
        { error: { message: 'Role not found in current workspace' } },
        { status: 404 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { name } = body

    // Validate required fields
    if (!name?.trim()) {
      return NextResponse.json({ error: { message: 'New role name is required' } }, { status: 400 })
    }

    // Duplicate the role
    const duplicatedRole = await RoleService.duplicate(roleId, name.trim(), session.user.id)

    logger.info('Role duplicated', {
      originalRoleId: roleId,
      duplicatedRoleId: duplicatedRole.id,
      originalRoleName: existingRole.name,
      newRoleName: duplicatedRole.name,
      workspaceId: workspaceContext.workspaceId,
      userId: session.user.id,
      hasEmailTemplate: !!duplicatedRole.emailTemplate,
    })

    return NextResponse.json({
      success: true,
      data: { role: duplicatedRole },
      message: 'Role duplicated successfully',
    })
  } catch (error) {
    logger.error('Error duplicating role', {
      roleId: (await params).roleId,
      error: error.message,
    })
    return NextResponse.json(
      { error: { message: error.message || 'Failed to duplicate role' } },
      { status: 500 }
    )
  }
}
