// app/api/invitations/[invitationId]/resend/route.js
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WorkspaceContext } from '@/lib/workspace-context'
import { InvitationService } from '@/lib/services/invitation-service'
import { prisma } from '@/lib/database'
import { logger } from '@/lib/logger'

/**
 * POST /api/invitations/[invitationId]/resend
 * Resend an invitation with optional expiry extension
 */
export async function POST(request, { params }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    const { invitationId } = params
    const body = await request.json().catch(() => ({}))
    const { extendExpiry = false } = body

    // Use the service resend method
    const updatedInvitation = await InvitationService.resend(invitationId, {
      extendExpiry,
      resentBy: session.user.id,
    })

    return NextResponse.json({
      success: true,
      data: { invitation: updatedInvitation },
      message: 'Invitation resent successfully',
    })
  } catch (error) {
    return NextResponse.json({ error: { message: error.message } }, { status: 500 })
  }
}
