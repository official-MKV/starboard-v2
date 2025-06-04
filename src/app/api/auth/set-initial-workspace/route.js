// app/api/auth/set-initial-workspace/route.js
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WorkspaceContext } from '@/lib/workspace-context'
import { logger } from '@/lib/logger'

export async function POST(request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    // Check if user already has workspace context
    const existingWorkspaceId = WorkspaceContext.getCurrentWorkspaceId()
    if (existingWorkspaceId) {
      // Verify the existing workspace is still valid
      const access = await WorkspaceContext.checkWorkspaceAccess(
        session.user.id,
        existingWorkspaceId
      )
      if (access) {
        return NextResponse.json({
          success: true,
          data: {
            workspaceId: existingWorkspaceId,
            workspace: access.workspace,
            role: access.role,
            permissions: access.permissions,
          },
          message: 'Workspace context already set',
        })
      }
    }

    // Get user's workspaces
    const userWorkspaces = await WorkspaceContext.getUserWorkspaces(session.user.id)

    if (userWorkspaces.length === 0) {
      return NextResponse.json(
        {
          error: { message: 'No workspaces available' },
          data: { needsWorkspace: true },
        },
        { status: 404 }
      )
    }

    // Set the first workspace as default
    const defaultWorkspace = userWorkspaces[0]

    // Create response
    const response = NextResponse.json({
      success: true,
      data: {
        workspaceId: defaultWorkspace.id,
        workspace: {
          id: defaultWorkspace.id,
          name: defaultWorkspace.name,
          slug: defaultWorkspace.slug,
        },
        role: defaultWorkspace.role,
        permissions: defaultWorkspace.role.permissions,
        availableWorkspaces: userWorkspaces,
        isDefault: true,
      },
      message: 'Initial workspace context set',
    })

    // Set workspace cookie in response
    response.cookies.set('starboard-workspace', defaultWorkspace.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    })

    logger.info('Initial workspace context set after login', {
      userId: session.user.id,
      workspaceId: defaultWorkspace.id,
      workspaceName: defaultWorkspace.name,
    })

    return response
  } catch (error) {
    logger.error('Error setting initial workspace context', {
      error: error.message,
    })

    return NextResponse.json(
      { error: { message: error.message || 'Failed to set initial workspace context' } },
      { status: 500 }
    )
  }
}
