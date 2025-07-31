import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WorkspaceContext } from '@/lib/workspace-context'
import { InvitationService } from '@/lib/services/invitation-service'
import { logger } from '@/lib/logger'

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
      ['users.view', 'users.manage', 'users.invite']
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: { message: 'Insufficient permissions to view invitations' } },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const roleId = searchParams.get('roleId')
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page')) || 1
    const limit = parseInt(searchParams.get('limit')) || 20
    const offset = (page - 1) * limit

    const [rawInvitations, totalCount] = await Promise.all([
      InvitationService.findByWorkspace(workspaceContext.workspaceId, {
        status,
        roleId,
        search,
        limit,
        offset,
      }),
      InvitationService.countByWorkspace(workspaceContext.workspaceId, {
        status,
        roleId,
        search,
      }),
    ])

    const invitations = rawInvitations.map(invitation => ({
      ...invitation,
      status: computeInvitationStatus(invitation),
    }))

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
      startIndex: totalCount > 0 ? offset + 1 : 0,
      endIndex: Math.min(offset + limit, totalCount),
    }

    return NextResponse.json({
      success: true,
      data: {
        invitations,
        pagination,
      },
    })
  } catch (error) {
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
        { 
          error: { 
            message: `Invalid email format: ${invalidEmails.join(', ')}`,
            code: 'INVALID_EMAIL_FORMAT',
            invalidEmails 
          } 
        },
        { status: 400 }
      )
    }

    const cleanEmails = [...new Set(emailList.map(email => email.trim().toLowerCase()))]

    const validation = await InvitationService.validateBulkInvitation(
      workspaceContext.workspaceId, 
      cleanEmails, 
      roleId
    )

    if (validation.invalid.length > 0 && validation.valid.length === 0) {
      return NextResponse.json({
        success: false,
        error: { 
          message: 'No valid emails to invite',
          code: 'ALL_INVALID'
        },
        data: {
          failed: validation.invalid,
          summary: {
            total: cleanEmails.length,
            successful: 0,
            failed: validation.invalid.length
          }
        }
      }, { status: 400 })
    }

    const results = { successful: [], failed: validation.invalid }

    for (const email of validation.valid) {
      try {
        const invitation = await InvitationService.create(
          workspaceContext.workspaceId,
          {
            email,
            roleId, 
            personalMessage,
            variableData,
          },
          session.user.id
        )

        results.successful.push({
          ...invitation,
          status: computeInvitationStatus(invitation)
        })
      } catch (error) {
        results.failed.push({
          email,
          error: 'CREATION_FAILED',
          message: error.message
        })
      }
    }

    const response = {
      success: results.successful.length > 0,
      data: {
        successful: results.successful,
        failed: results.failed,
        summary: {
          total: cleanEmails.length,
          successful: results.successful.length,
          failed: results.failed.length
        }
      }
    }

    if (results.successful.length === 0) {
      response.message = 'No invitations were sent'
    } else if (results.failed.length === 0) {
      response.message = `All ${results.successful.length} invitations sent successfully`
    } else {
      response.message = `${results.successful.length} of ${cleanEmails.length} invitations sent successfully`
    }

    logger.info('Bulk invitations processed', {
      workspaceId: workspaceContext.workspaceId,
      inviterId: session.user.id,
      roleId,
      total: cleanEmails.length,
      successful: results.successful.length,
      failed: results.failed.length,
      failureReasons: results.failed.map(f => f.error)
    })

    return NextResponse.json(response, { 
      status: results.successful.length > 0 ? 200 : 400 
    })

  } catch (error) {
    logger.error('Invitation API error', { 
      error: error.message,
      stack: error.stack 
    })
    
    return NextResponse.json(
      { 
        error: { 
          message: 'An unexpected error occurred while processing invitations',
          code: 'INTERNAL_ERROR'
        } 
      },
      { status: 500 }
    )
  }
}