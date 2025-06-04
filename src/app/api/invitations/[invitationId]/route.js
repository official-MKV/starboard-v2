// app/api/invitations/[invitationId]/route.js
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WorkspaceContext } from '@/lib/workspace-context'
import { InvitationService } from '@/lib/services/invitation-service'
import { logger } from '@/lib/logger'

/**
 * GET /api/invitations/[invitationId]
 * Get specific invitation details
 */
export async function GET(request, { params }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    const { invitationId } = params

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
      ['users.view', 'users.manage', 'users.invite']
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: { message: 'Insufficient permissions to view invitations' } },
        { status: 403 }
      )
    }

    const invitation = await InvitationService.findById(invitationId)
    if (!invitation) {
      return NextResponse.json({ error: { message: 'Invitation not found' } }, { status: 404 })
    }

    // Verify invitation belongs to current workspace
    if (invitation.workspaceId !== workspaceContext.workspaceId) {
      return NextResponse.json(
        { error: { message: 'Invitation not found in current workspace' } },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { invitation },
    })
  } catch (error) {
    logger.error('Error fetching invitation', {
      invitationId: params.invitationId,
      error: error.message,
    })
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch invitation' } },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/invitations/[invitationId]
 * Cancel an invitation
 */
export async function DELETE(request, { params }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    const { invitationId } = params

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
      ['users.invite', 'users.manage']
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: { message: 'Insufficient permissions to cancel invitations' } },
        { status: 403 }
      )
    }

    const invitation = await InvitationService.findById(invitationId)
    if (!invitation) {
      return NextResponse.json({ error: { message: 'Invitation not found' } }, { status: 404 })
    }

    // Verify invitation belongs to current workspace
    if (invitation.workspaceId !== workspaceContext.workspaceId) {
      return NextResponse.json(
        { error: { message: 'Invitation not found in current workspace' } },
        { status: 404 }
      )
    }

    // Cancel the invitation
    const cancelledInvitation = await InvitationService.cancel(invitationId, session.user.id)

    logger.info('Invitation cancelled', {
      invitationId,
      email: invitation.email,
      workspaceId: workspaceContext.workspaceId,
      cancelledBy: session.user.id,
    })

    return NextResponse.json({
      success: true,
      data: { invitation: cancelledInvitation },
      message: 'Invitation cancelled successfully',
    })
  } catch (error) {
    logger.error('Error cancelling invitation', {
      invitationId: params.invitationId,
      error: error.message,
    })
    return NextResponse.json(
      { error: { message: error.message || 'Failed to cancel invitation' } },
      { status: 500 }
    )
  }
}
