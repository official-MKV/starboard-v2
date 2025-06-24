// app/api/mentorship/assignments/route.js
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WorkspaceContext } from '@/lib/workspace-context'
import { MentorshipService } from '@/lib/services/MentorshipService'
import { logger } from '@/lib/logger'

/**
 * GET /api/mentorship/assignments
 * Get mentorship assignments for workspace
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

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const mentorId = searchParams.get('mentorId')
    const menteeId = searchParams.get('menteeId')
    const status = searchParams.get('status')
    const own = searchParams.get('own')
    const search = searchParams.get('search')

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

    const filters = {
      ...(mentorId && { mentorId }),
      ...(menteeId && { menteeId }),
      ...(status && { status }),
      ...(search && { search }),
    }

    // If user can only view own assignments, or specifically requesting own
    if (!canViewAll || own === 'true') {
      filters.userId = session.user.id
    }

    const assignments = await MentorshipService.getAssignments(
      workspaceContext.workspaceId,
      filters
    )

    logger.info('Mentorship assignments fetched', {
      workspaceId: workspaceContext.workspaceId,
      userId: session.user.id,
      assignmentCount: assignments.length,
      filters,
      ownOnly: !canViewAll || own === 'true',
    })

    return NextResponse.json({
      success: true,
      data: { assignments },
    })
  } catch (error) {
    logger.error('Error fetching mentorship assignments', { error: error.message })
    return NextResponse.json(
      { error: { message: 'Failed to fetch mentorship assignments' } },
      { status: 500 }
    )
  }
}

/**
 * POST /api/mentorship/assignments
 * Create a new mentorship assignment
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
    const hasPermission = await WorkspaceContext.hasPermission(
      session.user.id,
      workspaceContext.workspaceId,
      'mentorship.assignments.create'
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: { message: 'Insufficient permissions to create mentorship assignments' } },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { mentorId, menteeId, notes } = body

    // Validate required fields
    if (!mentorId?.trim()) {
      return NextResponse.json({ error: { message: 'Mentor ID is required' } }, { status: 400 })
    }

    if (!menteeId?.trim()) {
      return NextResponse.json({ error: { message: 'Mentee ID is required' } }, { status: 400 })
    }

    // Validate that mentor and mentee are different users
    if (mentorId === menteeId) {
      return NextResponse.json(
        { error: { message: 'Mentor and mentee must be different users' } },
        { status: 400 }
      )
    }

    const assignmentData = {
      mentorId,
      menteeId,
      notes: notes?.trim(),
    }

    const assignment = await MentorshipService.createAssignment(
      workspaceContext.workspaceId,
      assignmentData,
      session.user.id
    )

    logger.info('Mentorship assignment created', {
      assignmentId: assignment.id,
      mentorId: assignment.mentorId,
      menteeId: assignment.menteeId,
      workspaceId: workspaceContext.workspaceId,
      createdBy: session.user.id,
    })

    return NextResponse.json(
      {
        success: true,
        data: { assignment },
        message: 'Mentorship assignment created successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    if (error.message === 'Active assignment already exists between these users') {
      return NextResponse.json(
        { error: { message: 'Active assignment already exists between these users' } },
        { status: 400 }
      )
    }

    if (error.message === 'Mentee already has an active mentor') {
      return NextResponse.json(
        { error: { message: 'Mentee already has an active mentor' } },
        { status: 400 }
      )
    }

    logger.error('Error creating mentorship assignment', { error: error.message })
    return NextResponse.json(
      { error: { message: error.message || 'Failed to create mentorship assignment' } },
      { status: 500 }
    )
  }
}
