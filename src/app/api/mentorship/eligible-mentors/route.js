// app/api/mentorship/eligible-mentors/route.js
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WorkspaceContext } from '@/lib/workspace-context'
import { MentorshipService } from '@/lib/services/MentorshipService'
import { logger } from '@/lib/logger'

/**
 * GET /api/mentorship/eligible-mentors
 * Get users eligible to be mentors based on role capabilities
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

    // // Check permissions
    // const hasPermission = await WorkspaceContext.hasAnyPermission(
    //   session.user.id,
    //   workspaceContext.workspaceId,
    //   ['mentorship.assignments.view', 'mentorship.assignments.create']
    // )

    // if (!hasPermission) {
    //   return NextResponse.json(
    //     { error: { message: 'Insufficient permissions to view mentors' } },
    //     { status: 403 }
    //   )
    // }

    // Get search parameter
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''

    const mentors = await MentorshipService.getEligibleMentors(workspaceContext.workspaceId, search)

    logger.info('Eligible mentors fetched', {
      workspaceId: workspaceContext.workspaceId,
      userId: session.user.id,
      mentorCount: mentors.length,
      search,
    })

    return NextResponse.json({
      success: true,
      data: { mentors },
    })
  } catch (error) {
    logger.error('Error fetching eligible mentors', { error: error.message })
    return NextResponse.json(
      { error: { message: 'Failed to fetch eligible mentors' } },
      { status: 500 }
    )
  }
}
