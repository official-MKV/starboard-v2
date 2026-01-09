// app/api/invitations/[invitationId]/cancel/route.js
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WorkspaceContext } from '@/lib/workspace-context'
import { InvitationService } from '@/lib/services/invitation-service'
import { logger } from '@/lib/logger'

/**
 * POST /api/invitations/[invitationId]/cancel
 * Cancel an invitation
 */
export async function POST(request, { params }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    const { invitationId } = await params

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

    // Check if invitation can be cancelled
    if (invitation.status !== 'PENDING') {
      return NextResponse.json(
        { error: { message: 'Only pending invitations can be cancelled' } },
        { status: 400 }
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
      invitationId: (await params).invitationId,
      error: error.message,
    })
    return NextResponse.json(
      { error: { message: error.message || 'Failed to cancel invitation' } },
      { status: 500 }
    )
  }
}
