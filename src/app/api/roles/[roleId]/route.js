// app/api/roles/[roleId]/route.js
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WorkspaceContext } from '@/lib/workspace-context'
import { RoleService } from '@/lib/services/role-service'
import { logger } from '@/lib/logger'

/**
 * GET /api/roles/[roleId]
 * Get specific role details
 */
export async function GET(request, { params }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    const { roleId } = params

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
        { error: { message: 'Insufficient permissions to view roles' } },
        { status: 403 }
      )
    }

    // Get role details
    const role = await RoleService.findById(roleId)
    if (!role) {
      return NextResponse.json({ error: { message: 'Role not found' } }, { status: 404 })
    }

    // Verify role belongs to current workspace
    if (role.workspaceId !== workspaceContext.workspaceId) {
      return NextResponse.json(
        { error: { message: 'Role not found in current workspace' } },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { role },
    })
  } catch (error) {
    logger.error('Error fetching role', { roleId: params.roleId, error: error.message })
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch role' } },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/roles/[roleId]
 * Update a role
 */
export async function PUT(request, { params }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    const { roleId } = params

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
        { error: { message: 'Insufficient permissions to update roles' } },
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
    const {
      name,
      description,
      color,
      permissions,
      requiresOnboarding,
      onboardingForm,
      emailTemplate,
      canMentor,
      canBeMentee,
    } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: { message: 'Role name is required' } }, { status: 400 })
    }

    if (permissions && (!Array.isArray(permissions) || permissions.length === 0)) {
      return NextResponse.json(
        { error: { message: 'At least one permission is required' } },
        { status: 400 }
      )
    }

    const updates = {
      name: name.trim(),
      description: description?.trim() || null,
      color: color || existingRole.color,
      permissions: permissions || existingRole.permissions,
      requiresOnboarding:
        requiresOnboarding !== undefined
          ? Boolean(requiresOnboarding)
          : existingRole.requiresOnboarding,
      onboardingForm: requiresOnboarding ? onboardingForm : null,
      emailTemplate: emailTemplate || null,

      canMentor: canMentor !== undefined ? Boolean(canMentor) : existingRole.canMentor || false,
      canBeMentee:
        canBeMentee !== undefined ? Boolean(canBeMentee) : existingRole.canBeMentee || false,
    }

    // Update the role
    const updatedRole = await RoleService.update(roleId, updates)

    logger.info('Role updated', {
      roleId,
      roleName: updatedRole.name,
      workspaceId: workspaceContext.workspaceId,
      userId: session.user.id,
      updatedFields: Object.keys(updates),
      mentorshipCapabilities: {
        canMentor: updates.canMentor,
        canBeMentee: updates.canBeMentee,
      },
    })

    return NextResponse.json({
      success: true,
      data: { role: updatedRole },
      message: 'Role updated successfully',
    })
  } catch (error) {
    logger.error('Error updating role', { roleId: params.roleId, error: error.message })
    return NextResponse.json(
      { error: { message: error.message || 'Failed to update role' } },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/roles/[roleId]
 * Delete a role
 */
export async function DELETE(request, { params }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    const { roleId } = params
    console.log(roleId)

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
        { error: { message: 'Insufficient permissions to delete roles' } },
        { status: 403 }
      )
    }

    // Verify role exists and belongs to current workspace
    const role = await RoleService.findById(roleId)
    if (!role) {
      return NextResponse.json({ error: { message: 'Role not found' } }, { status: 404 })
    }

    if (role.workspaceId !== workspaceContext.workspaceId) {
      return NextResponse.json(
        { error: { message: 'Role not found in current workspace' } },
        { status: 404 }
      )
    }

    // Delete the role (this will also delete associated email templates)
    await RoleService.delete(roleId)

    logger.info('Role deleted', {
      roleId,
      roleName: role.name,
      workspaceId: workspaceContext.workspaceId,
      userId: session.user.id,
    })

    return NextResponse.json({
      success: true,
      message: 'Role deleted successfully',
    })
  } catch (error) {
    console.log(error)
    logger.error('Error deleting role', { roleId: params.roleId, error: error.message })
    return NextResponse.json(
      { error: { message: error.message || 'Failed to delete role' } },
      { status: 500 }
    )
  }
}
