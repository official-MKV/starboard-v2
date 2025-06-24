// app/api/mentorship/assignments/[assignmentId]/route.js
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WorkspaceContext } from '@/lib/workspace-context'
import { MentorshipService } from '@/lib/services/MentorshipService'
import { logger } from '@/lib/logger'

/**
 * GET /api/mentorship/assignments/[assignmentId]
 * Get a specific mentorship assignment
 */
export async function GET(request, { params }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    const { assignmentId } = params

    // Get workspace context
    const workspaceContext = await WorkspaceContext.getWorkspaceContext(request, session.user.id)
    if (!workspaceContext) {
      return NextResponse.json(
        { error: { message: 'Workspace context required' } },
        { status: 400 }
      )
    }

    // Check permissions
    const canViewAll = await WorkspaceContext.hasPermission(
      session.user.id,
      workspaceContext.workspaceId,
      'mentorship.assignments.view'
    )

    const canViewOwn = await WorkspaceContext.hasPermission(
      session.user.id,
      workspaceContext.workspaceId,
      'mentorship.own.view'
    )

    if (!canViewAll && !canViewOwn) {
      return NextResponse.json(
        { error: { message: 'Insufficient permissions to view mentorship assignments' } },
        { status: 403 }
      )
    }

    const assignment = await MentorshipService.getAssignment(
      assignmentId,
      workspaceContext.workspaceId
    )

    // If user can only view own, check ownership
    if (!canViewAll) {
      if (assignment.mentorId !== session.user.id && assignment.menteeId !== session.user.id) {
        return NextResponse.json(
          { error: { message: 'Mentorship assignment not found' } },
          { status: 404 }
        )
      }
    }

    logger.info('Mentorship assignment fetched', {
      assignmentId: assignment.id,
      workspaceId: workspaceContext.workspaceId,
      userId: session.user.id,
    })

    return NextResponse.json({
      success: true,
      data: { assignment },
    })
  } catch (error) {
    if (error.message === 'Mentorship assignment not found') {
      return NextResponse.json(
        { error: { message: 'Mentorship assignment not found' } },
        { status: 404 }
      )
    }

    logger.error('Error fetching mentorship assignment', {
      error: error.message,
      assignmentId: params.assignmentId,
    })
    return NextResponse.json(
      { error: { message: 'Failed to fetch mentorship assignment' } },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/mentorship/assignments/[assignmentId]
 * Update a mentorship assignment
 */
export async function PUT(request, { params }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    const { assignmentId } = params

    // Get workspace context
    const workspaceContext = await WorkspaceContext.getWorkspaceContext(request, session.user.id)
    if (!workspaceContext) {
      return NextResponse.json(
        { error: { message: 'Workspace context required' } },
        { status: 400 }
      )
    }

    // Check permissions
    const canEditAll = await WorkspaceContext.hasPermission(
      session.user.id,
      workspaceContext.workspaceId,
      'mentorship.assignments.edit'
    )

    const canManageOwn = await WorkspaceContext.hasPermission(
      session.user.id,
      workspaceContext.workspaceId,
      'mentorship.own.manage'
    )

    if (!canEditAll && !canManageOwn) {
      return NextResponse.json(
        { error: { message: 'Insufficient permissions to edit mentorship assignments' } },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { status, notes, reason } = body

    // Validate status if provided
    const validStatuses = ['ACTIVE', 'PAUSED', 'TERMINATED']
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: { message: 'Invalid status. Must be one of: ' + validStatuses.join(', ') } },
        { status: 400 }
      )
    }

    const updates = {
      ...(status !== undefined && { status }),
      ...(notes !== undefined && { notes: notes?.trim() }),
      ...(reason !== undefined && { reason }),
    }

    const assignment = await MentorshipService.updateAssignment(
      assignmentId,
      workspaceContext.workspaceId,
      updates,
      session.user.id
    )

    logger.info('Mentorship assignment updated', {
      assignmentId: assignment.id,
      workspaceId: workspaceContext.workspaceId,
      updatedBy: session.user.id,
      updatedFields: Object.keys(updates),
    })

    return NextResponse.json({
      success: true,
      data: { assignment },
      message: 'Mentorship assignment updated successfully',
    })
  } catch (error) {
    if (error.message === 'Mentorship assignment not found') {
      return NextResponse.json(
        { error: { message: 'Mentorship assignment not found' } },
        { status: 404 }
      )
    }

    logger.error('Error updating mentorship assignment', {
      error: error.message,
      assignmentId: params.assignmentId,
    })
    return NextResponse.json(
      { error: { message: 'Failed to update mentorship assignment' } },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/mentorship/assignments/[assignmentId]
 * Terminate a mentorship assignment
 */
export async function DELETE(request, { params }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    const { assignmentId } = params

    // Get workspace context
    const workspaceContext = await WorkspaceContext.getWorkspaceContext(request, session.user.id)
    if (!workspaceContext) {
      return NextResponse.json(
        { error: { message: 'Workspace context required' } },
        { status: 400 }
      )
    }

    // Check permissions
    const hasPermission = await WorkspaceContext.hasPermission(
      session.user.id,
      workspaceContext.workspaceId,
      'mentorship.assignments.delete'
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: { message: 'Insufficient permissions to terminate mentorship assignments' } },
        { status: 403 }
      )
    }

    // Parse request body for reason
    const body = await request.json().catch(() => ({}))
    const { reason } = body

    await MentorshipService.terminateAssignment(
      assignmentId,
      workspaceContext.workspaceId,
      session.user.id,
      reason
    )

    logger.info('Mentorship assignment terminated', {
      assignmentId,
      workspaceId: workspaceContext.workspaceId,
      terminatedBy: session.user.id,
      reason,
    })

    return NextResponse.json({
      success: true,
      message: 'Mentorship assignment terminated successfully',
    })
  } catch (error) {
    if (error.message === 'Mentorship assignment not found') {
      return NextResponse.json(
        { error: { message: 'Mentorship assignment not found' } },
        { status: 404 }
      )
    }

    logger.error('Error terminating mentorship assignment', {
      error: error.message,
      assignmentId: params.assignmentId,
    })
    return NextResponse.json(
      { error: { message: 'Failed to terminate mentorship assignment' } },
      { status: 500 }
    )
  }
}
