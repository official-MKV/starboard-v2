import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WorkspaceContext } from '@/lib/workspace-context'
import { MentorshipService } from '@/lib/services/MentorshipService'
import { logger } from '@/lib/logger'

/**
 * PUT /api/mentorship/meetings/[meetingId]/complete
 * Mark a meeting as completed and update tracking
 */
export async function PUT(request, { params }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    const { meetingId } = params

    // Get workspace context
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
      ['mentorship.meetings.manage', 'mentorship.own.manage']
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: { message: 'Insufficient permissions to complete meetings' } },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { notes, wasProductive, rating, actionItems } = body

    const completionData = {
      notes,
      wasProductive: Boolean(wasProductive),
      rating: rating ? parseInt(rating) : null,
      actionItems: actionItems || [],
    }

    const meeting = await MentorshipService.completeMeeting(
      meetingId,
      workspaceContext.workspaceId,
      completionData,
      session.user.id
    )

    logger.info('Mentorship meeting completed', {
      meetingId: meeting.id,
      workspaceId: workspaceContext.workspaceId,
      completedBy: session.user.id,
      wasProductive,
      rating,
    })

    return NextResponse.json({
      success: true,
      data: { meeting },
      message: 'Meeting marked as completed',
    })
  } catch (error) {
    if (error.message === 'Meeting not found') {
      return NextResponse.json({ error: { message: 'Meeting not found' } }, { status: 404 })
    }

    logger.error('Error completing meeting', {
      error: error.message,
      meetingId: params.meetingId,
    })
    return NextResponse.json({ error: { message: 'Failed to complete meeting' } }, { status: 500 })
  }
}
