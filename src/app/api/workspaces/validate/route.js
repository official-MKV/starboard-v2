// app/api/workspaces/validate/route.js
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WorkspaceContext } from '@/lib/workspace-context'
import logger from '@/lib/logger'

export async function POST(request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required', valid: false }, { status: 401 })
    }

    const body = await request.json()
    const { workspaceId } = body

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID is required', valid: false }, { status: 400 })
    }

    console.log('Validating workspace access:', {
      userId: session.user.id,
      workspaceId,
    })

    // Check workspace access using WorkspaceContext
    const access = await WorkspaceContext.checkWorkspaceAccess(session.user.id, workspaceId)

    if (!access) {
      logger.warn('Workspace access denied', {
        userId: session.user.id,
        workspaceId,
      })

      return NextResponse.json({
        valid: false,
        error: 'No access to workspace',
      })
    }

    logger.info('Workspace access validated', {
      userId: session.user.id,
      workspaceId,
      workspaceName: access.workspace.name,
    })

    return NextResponse.json({
      valid: true,
      workspace: access.workspace,
      role: access.role,
      permissions: access.permissions,
    })
  } catch (error) {
    logger.error('Workspace validation error', {
      error: error.message,
      stack: error.stack,
    })

    return NextResponse.json({ error: 'Internal server error', valid: false }, { status: 500 })
  }
}

// GET endpoint for current workspace validation
export async function GET(request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required', valid: false }, { status: 401 })
    }

    // Get workspace ID from cookie
    const workspaceId = request.cookies.get('starboard-workspace')?.value

    if (!workspaceId) {
      return NextResponse.json({
        valid: false,
        error: 'No workspace cookie found',
        needsSelection: true,
      })
    }

    console.log('Validating current workspace:', {
      userId: session.user.id,
      workspaceId,
    })

    // Check workspace access
    const access = await WorkspaceContext.checkWorkspaceAccess(session.user.id, workspaceId)

    if (!access) {
      return NextResponse.json({
        valid: false,
        error: 'No access to current workspace',
        needsSelection: true,
      })
    }

    return NextResponse.json({
      valid: true,
      workspace: access.workspace,
      role: access.role,
      permissions: access.permissions,
    })
  } catch (error) {
    logger.error('Current workspace validation error', {
      error: error.message,
      stack: error.stack,
    })

    return NextResponse.json({ error: 'Internal server error', valid: false }, { status: 500 })
  }
}
