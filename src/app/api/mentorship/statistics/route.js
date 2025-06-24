// app/api/mentorship/statistics/route.js
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WorkspaceContext } from '@/lib/workspace-context'
import { MentorshipService } from '@/lib/services/MentorshipService'
import { logger } from '@/lib/logger'

/**
 * GET /api/mentorship/statistics
 * Get mentorship statistics for workspace
 */
export async function GET(request) {
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
      ['mentorship.analytics.view', 'mentorship.assignments.view']
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: { message: 'Insufficient permissions to view mentorship statistics' } },
        { status: 403 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const programId = searchParams.get('programId')

    const [statistics, overdueAssignments] = await Promise.all([
      MentorshipService.getStatistics(workspaceContext.workspaceId, programId),
      MentorshipService.getOverdueMeetings(workspaceContext.workspaceId),
    ])

    logger.info('Mentorship statistics fetched', {
      workspaceId: workspaceContext.workspaceId,
      userId: session.user.id,
      programId,
      totalAssignments: statistics.totalAssignments,
    })

    return NextResponse.json({
      success: true,
      data: {
        statistics,
        overdueAssignments: overdueAssignments.map(assignment => ({
          id: assignment.id,
          mentor: assignment.mentor,
          mentee: assignment.mentee,
          program: assignment.program,
          nextMeetingDue: assignment.nextMeetingDue,
          lastMeetingAt: assignment.lastMeetingAt,
          totalMeetings: assignment.totalMeetings,
        })),
      },
    })
  } catch (error) {
    logger.error('Error fetching mentorship statistics', { error: error.message })
    return NextResponse.json(
      { error: { message: 'Failed to fetch mentorship statistics' } },
      { status: 500 }
    )
  }
}
