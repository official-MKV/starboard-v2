// app/api/mentorship/assignments/[assignmentId]/reassign/route.js
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WorkspaceContext } from '@/lib/workspace-context'
import { MentorshipService } from '@/lib/services/MentorshipService'
import { logger } from '@/lib/logger'

/**
 * POST /api/mentorship/assignments/[assignmentId]/reassign
 * Reassign mentor or mentee in assignment
 */
export async function POST(request, { params }) {
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
      'mentorship.assignments.edit'
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: { message: 'Insufficient permissions to reassign mentorship assignments' } },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { newMentorId, newMenteeId, reason } = body

    // Validate that at least one ID is provided
    if (!newMentorId && !newMenteeId) {
      return NextResponse.json(
        { error: { message: 'Either newMentorId or newMenteeId must be provided' } },
        { status: 400 }
      )
    }

    // Validate reason is provided
    if (!reason?.trim()) {
      return NextResponse.json(
        { error: { message: 'Reason is required for reassignment' } },
        { status: 400 }
      )
    }

    // Validate that mentor and mentee are different (if both provided)
    if (newMentorId && newMenteeId && newMentorId === newMenteeId) {
      return NextResponse.json(
        { error: { message: 'Mentor and mentee must be different users' } },
        { status: 400 }
      )
    }

    const reassignmentData = {
      newMentorId,
      newMenteeId,
      reason: reason.trim(),
    }

    const assignment = await MentorshipService.reassignMentorship(
      assignmentId,
      workspaceContext.workspaceId,
      reassignmentData,
      session.user.id
    )

    logger.info('Mentorship assignment reassigned', {
      assignmentId: assignment.id,
      workspaceId: workspaceContext.workspaceId,
      reassignedBy: session.user.id,
      newMentorId,
      newMenteeId,
      reason,
    })

    return NextResponse.json({
      success: true,
      data: { assignment },
      message: 'Mentorship assignment reassigned successfully',
    })
  } catch (error) {
    if (error.message === 'Mentorship assignment not found') {
      return NextResponse.json(
        { error: { message: 'Mentorship assignment not found' } },
        { status: 404 }
      )
    }

    logger.error('Error reassigning mentorship assignment', {
      error: error.message,
      assignmentId: params.assignmentId,
    })
    return NextResponse.json(
      { error: { message: 'Failed to reassign mentorship assignment' } },
      { status: 500 }
    )
  }
}
