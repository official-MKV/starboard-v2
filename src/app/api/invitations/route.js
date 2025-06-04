// app/api/invitations/route.js
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WorkspaceContext } from '@/lib/workspace-context'
import { InvitationService } from '@/lib/services/invitation-service'
import { logger } from '@/lib/logger'

/**
 * GET /api/invitations
 * Get all invitations for current workspace
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
      ['users.view', 'users.manage', 'users.invite']
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: { message: 'Insufficient permissions to view invitations' } },
        { status: 403 }
      )
    }

    // Get URL search params for filtering
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // PENDING, ACCEPTED, EXPIRED, CANCELLED
    const roleId = searchParams.get('roleId')
    const limit = parseInt(searchParams.get('limit')) || 50
    const offset = parseInt(searchParams.get('offset')) || 0

    // Get invitations for workspace
    const invitations = await InvitationService.findByWorkspace(workspaceContext.workspaceId, {
      status,
      roleId,
      limit,
      offset,
    })

    logger.info('Invitations fetched', {
      workspaceId: workspaceContext.workspaceId,
      userId: session.user.id,
      invitationCount: invitations.length,
      filters: { status, roleId },
    })

    return NextResponse.json({
      success: true,
      data: { invitations },
    })
  } catch (error) {
    logger.error('Error fetching invitations', { error: error.message })
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch invitations' } },
      { status: 500 }
    )
  }
}

/**
 * POST /api/invitations
 * Create new invitations
 */

export async function POST(request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    const workspaceContext = await WorkspaceContext.getWorkspaceContext(request, session.user.id)
    if (!workspaceContext) {
      return NextResponse.json(
        { error: { message: 'Workspace context required' } },
        { status: 400 }
      )
    }

    const hasPermission = await WorkspaceContext.hasAnyPermission(
      session.user.id,
      workspaceContext.workspaceId,
      ['users.invite', 'users.manage']
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: { message: 'Insufficient permissions to send invitations' } },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { email, emails, roleId, personalMessage, variableData = {}, expiresInDays = 7 } = body

    // Handle single or bulk invitations
    const emailList = emails || [email]

    if (!emailList || emailList.length === 0) {
      return NextResponse.json(
        { error: { message: 'At least one email address is required' } },
        { status: 400 }
      )
    }

    if (!roleId) {
      return NextResponse.json({ error: { message: 'Role is required' } }, { status: 400 })
    }

    // Validate email addresses
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const invalidEmails = emailList.filter(email => !emailRegex.test(email.trim()))

    if (invalidEmails.length > 0) {
      return NextResponse.json(
        { error: { message: `Invalid email addresses: ${invalidEmails.join(', ')}` } },
        { status: 400 }
      )
    }

    // Clean and deduplicate emails
    const cleanEmails = [...new Set(emailList.map(email => email.trim().toLowerCase()))]

    // Calculate expiry date
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)

    // Create invitations
    if (cleanEmails.length === 1) {
      // Single invitation
      const invitation = await InvitationService.create(
        workspaceContext.workspaceId,
        {
          email: cleanEmails[0],
          roleId,
          personalMessage,
          variableData,
        },
        session.user.id
      )

      return NextResponse.json({
        success: true,
        data: { invitation },
        message: 'Invitation sent successfully',
      })
    } else {
      // Bulk invitations - CORRECTED method name
      const results = await InvitationService.bulkCreate({
        workspaceId: workspaceContext.workspaceId,
        emails: cleanEmails,
        roleId,
        inviterId: session.user.id,
        message: personalMessage,
        expiresAt,
        sendEmail: true,
      })

      logger.info('Bulk invitations processed', {
        workspaceId: workspaceContext.workspaceId,
        inviterId: session.user.id,
        roleId,
        emailCount: cleanEmails.length,
        successCount: results.successful.length,
        errorCount: results.failed.length,
      })

      return NextResponse.json({
        success: true,
        data: {
          successful: results.successful,
          failed: results.failed,
          summary: {
            total: cleanEmails.length,
            successful: results.successful.length,
            failed: results.failed.length,
          },
        },
        message: `${results.successful.length} invitation(s) sent successfully`,
      })
    }
  } catch (error) {
    logger.error('Error creating invitations', { error: error.message })
    return NextResponse.json(
      { error: { message: error.message || 'Failed to create invitations' } },
      { status: 500 }
    )
  }
}
