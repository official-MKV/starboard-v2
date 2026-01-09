// app/api/workspaces/route.js
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WorkspaceContext } from '@/lib/workspace-context'
import { WorkspaceService } from '@/lib/services/workspace-service'
import logger from '@/lib/logger'
import { prisma } from '@/lib/database'

/**
 * GET /api/workspaces
 * Get all workspaces accessible to the current user
 */
export async function GET(request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    // Get user's accessible workspaces using the service
    const workspaces = await WorkspaceService.findByUserId(session.user.id)

    // Get current workspace from cookies
    const currentWorkspaceId = await WorkspaceContext.getCurrentWorkspaceId()

    logger.info('User workspaces fetched', {
      userId: session.user.id,
      workspaceCount: workspaces.length,
      currentWorkspaceId,
    })

    return NextResponse.json({
      success: true,
      data: {
        workspaces,
        currentWorkspaceId,
        hasWorkspaces: workspaces.length > 0,
      },
    })
  } catch (error) {
    logger.error('Error fetching user workspaces', { error: error.message })
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch workspaces' } },
      { status: 500 }
    )
  }
}

/**
 * POST /api/workspaces
 * Create a new workspace
 */
export async function POST(request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, website, logo } = body

    // Use the service to create the workspace
    const result = await WorkspaceService.create(
      { name, description, website, logo },
      session.user.id
    )

    return NextResponse.json({
      success: true,
      data: {
        workspace: result.workspace,
        roles: result.roles,
      },
    })
  } catch (error) {
    logger.error('Error creating workspace', {
      error: error.message,
      stack: error.stack,
    })

    return NextResponse.json(
      { error: { message: error.message || 'Failed to create workspace' } },
      { status: 500 }
    )
  }
}
