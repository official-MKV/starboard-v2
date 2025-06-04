// app/api/roles/route.js
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WorkspaceContext } from '@/lib/workspace-context'
import { RoleService } from '@/lib/services/role-service'
import { logger } from '@/lib/logger'

/**
 * GET /api/roles
 * Get all roles for current workspace
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
      ['roles.view', 'roles.manage']
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: { message: 'Insufficient permissions to view roles' } },
        { status: 403 }
      )
    }

    // Get roles for workspace
    const roles = await RoleService.findByWorkspace(workspaceContext.workspaceId)

    logger.info('Roles fetched', {
      workspaceId: workspaceContext.workspaceId,
      userId: session.user.id,
      roleCount: roles.length,
    })

    return NextResponse.json({
      success: true,
      data: { roles },
    })
  } catch (error) {
    logger.error('Error fetching roles', { error: error.message })
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch roles' } },
      { status: 500 }
    )
  }
}

/**
 * POST /api/roles
 * Create a new role
 */
export async function POST(request) {
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
    const hasPermission = await WorkspaceContext.hasPermission(
      session.user.id,
      workspaceContext.workspaceId,
      'roles.manage'
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: { message: 'Insufficient permissions to create roles' } },
        { status: 403 }
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
      createEmailTemplate,
      emailTemplate,
    } = body

    // Validate required fields
    if (!name?.trim()) {
      return NextResponse.json({ error: { message: 'Role name is required' } }, { status: 400 })
    }

    if (!permissions || !Array.isArray(permissions) || permissions.length === 0) {
      return NextResponse.json(
        { error: { message: 'At least one permission is required' } },
        { status: 400 }
      )
    }

    // Create role data
    const roleData = {
      name: name.trim(),
      description: description?.trim() || null,
      color: color || '#3b82f6',
      permissions,
      requiresOnboarding: Boolean(requiresOnboarding),
      onboardingForm: requiresOnboarding ? onboardingForm : null,
      createEmailTemplate: Boolean(createEmailTemplate),
      emailTemplate: createEmailTemplate ? emailTemplate : null,
    }

    // Create the role
    const role = await RoleService.create(workspaceContext.workspaceId, roleData, session.user.id)

    logger.info('Role created', {
      roleId: role.id,
      roleName: role.name,
      workspaceId: workspaceContext.workspaceId,
      userId: session.user.id,
      hasEmailTemplate: !!role.emailTemplate,
    })

    return NextResponse.json({
      success: true,
      data: { role },
      message: 'Role created successfully',
    })
  } catch (error) {
    logger.error('Error creating role', { error: error.message })
    return NextResponse.json(
      { error: { message: error.message || 'Failed to create role' } },
      { status: 500 }
    )
  }
}
