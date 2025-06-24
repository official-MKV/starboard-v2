// app/api/mentorship/eligible-mentees/route.js
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WorkspaceContext } from '@/lib/workspace-context'
import { MentorshipService } from '@/lib/services/MentorshipService'
import { logger } from '@/lib/logger'

/**
 * GET /api/mentorship/eligible-mentees
 * Get users eligible to be mentees based on role capabilities
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
    // const hasPermission = await WorkspaceContext.hasAnyPermission(
    //   session.user.id,
    //   workspaceContext.workspaceId,
    //   ['mentorship.assignments.view', 'mentorship.assignments.create']
    // )

    // if (!hasPermission) {
    //   return NextResponse.json(
    //     { error: { message: 'Insufficient permissions to view mentees' } },
    //     { status: 403 }
    //   )
    // }

    // Get search parameter
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''

    const mentees = await MentorshipService.getEligibleMentees(workspaceContext.workspaceId, search)

    logger.info('Eligible mentees fetched', {
      workspaceId: workspaceContext.workspaceId,
      userId: session.user.id,
      menteeCount: mentees.length,
      search,
    })

    return NextResponse.json({
      success: true,
      data: { mentees },
    })
  } catch (error) {
    logger.error('Error fetching eligible mentees', { error: error.message })
    return NextResponse.json(
      { error: { message: 'Failed to fetch eligible mentees' } },
      { status: 500 }
    )
  }
}
