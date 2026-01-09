// app/api/workspace/current/route.js
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WorkspaceContext } from '@/lib/workspace-context'
import { logger } from '@/lib/logger'

/**
 * GET /api/workspace/current
 * Get the current workspace context for the authenticated user
 */
export async function GET(request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    // Get current workspace context
    const workspaceContext = await WorkspaceContext.getWorkspaceContext(request, session.user.id)

    if (!workspaceContext) {
      // User has no workspace context - they might need to select one
      const userWorkspaces = await WorkspaceContext.getUserWorkspaces(session.user.id)

      if (userWorkspaces.length === 0) {
        return NextResponse.json({ error: { message: 'No workspaces available' } }, { status: 404 })
      }

      // Set the first workspace as default
      const defaultWorkspace = userWorkspaces[0]
      const newContext = await WorkspaceContext.switchWorkspace(
        session.user.id,
        defaultWorkspace.id
      )

      logger.info('Set default workspace for user', {
        userId: session.user.id,
        workspaceId: defaultWorkspace.id,
        workspaceName: defaultWorkspace.name,
      })

      return NextResponse.json({
        success: true,
        data: {
          workspace: newContext,
          isDefault: true,
          availableWorkspaces: userWorkspaces,
        },
      })
    }

    logger.info('Current workspace context retrieved', {
      userId: session.user.id,
      workspaceId: workspaceContext.workspaceId,
      workspaceName: workspaceContext.workspace.name,
    })

    return NextResponse.json({
      success: true,
      data: {
        workspace: workspaceContext,
        isDefault: false,
      },
    })
  } catch (error) {
    logger.error('Error getting current workspace', { error: error.message })
    return NextResponse.json(
      { error: { message: error.message || 'Failed to get current workspace' } },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/workspace/current
 * Clear the current workspace context (logout from workspace)
 */
export async function DELETE(request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    // Clear workspace context
    await WorkspaceContext.clearCurrentWorkspace()

    logger.info('Workspace context cleared', {
      userId: session.user.id,
    })

    return NextResponse.json({
      success: true,
      message: 'Workspace context cleared',
    })
  } catch (error) {
    logger.error('Error clearing workspace context', { error: error.message })
    return NextResponse.json(
      { error: { message: error.message || 'Failed to clear workspace context' } },
      { status: 500 }
    )
  }
}
