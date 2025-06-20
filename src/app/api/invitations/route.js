// app/api/invitations/route.js
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WorkspaceContext } from '@/lib/workspace-context'
import { InvitationService } from '@/lib/services/invitation-service'
import { logger } from '@/lib/logger'

// Helper function to compute invitation status
const computeInvitationStatus = invitation => {
  if (invitation.isAccepted) {
    return 'ACCEPTED'
  } else if (new Date() > new Date(invitation.expiresAt)) {
    return 'EXPIRED'
  } else {
    return 'PENDING'
  }
}

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

    // Get URL search params for filtering and pagination
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // PENDING, ACCEPTED, EXPIRED, CANCELLED
    const roleId = searchParams.get('roleId')
    const page = parseInt(searchParams.get('page')) || 1
    const limit = parseInt(searchParams.get('limit')) || 20
    const offset = (page - 1) * limit

    // Validate pagination parameters
    if (page < 1) {
      return NextResponse.json(
        { error: { message: 'Page must be greater than 0' } },
        { status: 400 }
      )
    }

    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: { message: 'Limit must be between 1 and 100' } },
        { status: 400 }
      )
    }

    // Get invitations and total count for workspace
    const [rawInvitations, totalCount] = await Promise.all([
      InvitationService.findByWorkspace(workspaceContext.workspaceId, {
        status,
        roleId,
        limit,
        offset,
      }),
      InvitationService.countByWorkspace(workspaceContext.workspaceId, {
        status,
        roleId,
      }),
    ])

    // Compute status for each invitation and add it to the response
    const invitations = rawInvitations.map(invitation => ({
      ...invitation,
      status: computeInvitationStatus(invitation),
    }))

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit)
    const hasNextPage = page < totalPages
    const hasPreviousPage = page > 1

    const pagination = {
      currentPage: page,
      totalPages,
      totalItems: totalCount,
      itemsPerPage: limit,
      hasNextPage,
      hasPreviousPage,
      nextPage: hasNextPage ? page + 1 : null,
      previousPage: hasPreviousPage ? page - 1 : null,
      startIndex: offset + 1,
      endIndex: Math.min(offset + limit, totalCount),
    }

    logger.info('Invitations fetched', {
      workspaceId: workspaceContext.workspaceId,
      userId: session.user.id,
      invitationCount: invitations.length,
      filters: { status, roleId },
      pagination: { page, limit, totalCount, totalPages },
    })

    return NextResponse.json({
      success: true,
      data: {
        invitations,
        pagination,
      },
    })
  } catch (error) {
    logger.error('Error fetching invitations', { error: error.message })
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch invitations' } },
      { status: 500 }
    )
  }
}

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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const invalidEmails = emailList.filter(email => !emailRegex.test(email.trim()))

    if (invalidEmails.length > 0) {
      return NextResponse.json(
        { error: { message: `Invalid email addresses: ${invalidEmails.join(', ')}` } },
        { status: 400 }
      )
    }

    const cleanEmails = [...new Set(emailList.map(email => email.trim().toLowerCase()))]

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)

    if (cleanEmails.length === 1) {
      const rawInvitation = await InvitationService.create(
        workspaceContext.workspaceId,
        {
          email: cleanEmails[0],
          roleId,
          personalMessage,
          variableData,
        },
        session.user.id
      )

      // Add computed status to the response
      const invitation = {
        ...rawInvitation,
        status: computeInvitationStatus(rawInvitation),
      }

      return NextResponse.json({
        success: true,
        data: { invitation },
        message: 'Invitation sent successfully',
      })
    } else {
      const results = await InvitationService.bulkCreate({
        workspaceId: workspaceContext.workspaceId,
        emails: cleanEmails,
        roleId,
        inviterId: session.user.id,
        message: personalMessage,
        expiresAt,
        sendEmail: true,
      })

      // Add computed status to successful invitations
      const successful = results.successful.map(invitation => ({
        ...invitation,
        status: computeInvitationStatus(invitation),
      }))

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
          successful,
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
