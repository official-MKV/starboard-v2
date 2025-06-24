import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WorkspaceContext } from '@/lib/workspace-context'
import { MentorshipService } from '@/lib/services/MentorshipService'
import { logger } from '@/lib/logger'

/**
 * POST /api/mentorship/meetings
 * Create a new mentorship meeting
 */
export async function POST(request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

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
      ['mentorship.meetings.create', 'mentorship.own.manage']
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: { message: 'Insufficient permissions to create meetings' } },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { assignmentId, title, startTime, endTime, description, location, virtualLink, agenda } =
      body

    // Validate required fields
    if (!assignmentId || !title || !startTime) {
      return NextResponse.json(
        { error: { message: 'Assignment ID, title, and start time are required' } },
        { status: 400 }
      )
    }

    const meetingData = {
      assignmentId,
      title,
      startTime: new Date(startTime),
      endTime: endTime ? new Date(endTime) : null,
      description,
      location,
      virtualLink,
      agenda,
    }

    const meeting = await MentorshipService.createMeeting(
      workspaceContext.workspaceId,
      meetingData,
      session.user.id
    )

    logger.info('Mentorship meeting created', {
      meetingId: meeting.id,
      assignmentId,
      workspaceId: workspaceContext.workspaceId,
      createdBy: session.user.id,
    })

    return NextResponse.json(
      {
        success: true,
        data: { meeting },
        message: 'Meeting scheduled successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    logger.error('Error creating mentorship meeting', { error: error.message })
    return NextResponse.json(
      { error: { message: error.message || 'Failed to create meeting' } },
      { status: 500 }
    )
  }
}
