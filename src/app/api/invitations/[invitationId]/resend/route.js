// app/api/invitations/[invitationId]/resend/route.js
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WorkspaceContext } from '@/lib/workspace-context'
import { InvitationService } from '@/lib/services/invitation-service'
import { logger } from '@/lib/logger'

/**
 * POST /api/invitations/[invitationId]/resend
 * Resend an invitation
 */
export async function POST(request, { params }) {
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
        { error: { message: 'Insufficient permissions to resend invitations' } },
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

    // Check if invitation can be resent
    if (invitation.status !== 'PENDING') {
      return NextResponse.json(
        { error: { message: 'Only pending invitations can be resent' } },
        { status: 400 }
      )
    }

    // Parse request body for optional new expiry
    const body = await request.json().catch(() => ({}))
    const { expiresInDays } = body

    let newExpiresAt = null
    if (expiresInDays && expiresInDays > 0) {
      newExpiresAt = new Date()
      newExpiresAt.setDate(newExpiresAt.getDate() + expiresInDays)
    }

    // Resend the invitation
    const updatedInvitation = await InvitationService.resend(invitationId, {
      resenderId: session.user.id,
      newExpiresAt,
    })

    logger.info('Invitation resent', {
      invitationId,
      email: invitation.email,
      workspaceId: workspaceContext.workspaceId,
      resentBy: session.user.id,
      newExpiresAt,
    })

    return NextResponse.json({
      success: true,
      data: { invitation: updatedInvitation },
      message: 'Invitation resent successfully',
    })
  } catch (error) {
    logger.error('Error resending invitation', {
      invitationId: params.invitationId,
      error: error.message,
    })
    return NextResponse.json(
      { error: { message: error.message || 'Failed to resend invitation' } },
      { status: 500 }
    )
  }
}
