import { WorkspaceContext } from '@/lib/workspace-context'
import logger from '@/lib/logger'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

const WORKSPACE_COOKIE_NAME = 'starboard-workspace'
const WORKSPACE_COOKIE_MAX_AGE = 30 * 24 * 60 * 60

export async function POST(request) {
  const session = await auth()
  try {
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    const body = await request.json()
    const { workspaceId } = body

    if (!workspaceId) {
      return NextResponse.json({ error: { message: 'Workspace ID is required' } }, { status: 400 })
    }

    // Get current workspace for logging
    const currentWorkspaceId = request.cookies.get(WORKSPACE_COOKIE_NAME)?.value

    console.log('Workspace switch request:', {
      userId: session.user.id,
      toWorkspace: workspaceId,
    })

    // Validate workspace access and get context
    const workspaceContext = await WorkspaceContext.switchWorkspace(session.user.id, workspaceId)

    // Create response with workspace data
    const responseData = {
      success: true,
      message: 'Workspace switched successfully',
      data: {
        workspace: workspaceContext,
        currentWorkspaceId: workspaceId,
        previousWorkspaceId: currentWorkspaceId,
      },
    }

    const response = NextResponse.json(responseData)

    response.cookies.set({
      name: WORKSPACE_COOKIE_NAME,
      value: workspaceId,
      httpOnly: true, // Always true for security
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: WORKSPACE_COOKIE_MAX_AGE,
      path: '/',
    })

    console.log('Cookie being set:', {
      name: WORKSPACE_COOKIE_NAME,
      value: workspaceId,
      headers: response.headers.get('Set-Cookie'),
    })

    logger.info('Workspace switched successfully', {
      userId: session.user.id,
      workspaceId,
      workspaceName: workspaceContext.workspace.name,
      previousWorkspaceId: currentWorkspaceId,
      cookieSet: true,
    })

    return response
  } catch (error) {
    logger.error('Error switching workspace', {
      userId: session?.user?.id,
      error: error.message,
      stack: error.stack,
    })

    return response
  }
}

export async function GET(request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    const currentWorkspaceId = request.cookies.get(WORKSPACE_COOKIE_NAME)?.value
    const allCookies = request.cookies.getAll()

    return NextResponse.json({
      success: true,
      data: {
        currentWorkspaceId,
        allCookies: allCookies.map(c => ({ name: c.name, value: c.value })),
        cookieName: WORKSPACE_COOKIE_NAME,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: { message: error.message } }, { status: 500 })
  }
}
