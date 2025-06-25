// app/api/users/[userId]/mentorship/route.js
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WorkspaceContext } from '@/lib/workspace-context'
import { MentorshipService } from '@/lib/services/MentorshipService'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/database'

/**
 * GET /api/users/[userId]/mentorship
 * Get mentorship data for a specific user
 */
export async function GET(request, { params }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    const { userId } = params

    if (!userId) {
      return NextResponse.json({ error: { message: 'User ID is required' } }, { status: 400 })
    }

    // Get workspace context
    const workspaceContext = await WorkspaceContext.getWorkspaceContext(request, session.user.id)
    if (!workspaceContext) {
      return NextResponse.json(
        { error: { message: 'Workspace context required' } },
        { status: 400 }
      )
    }

    // Check permissions - user can view their own mentorship data or needs admin permissions
    const isOwnData = session.user.id === userId
    const canViewAllUsers = await WorkspaceContext.hasPermission(
      session.user.id,
      workspaceContext.workspaceId,
      'users.view'
    )

    if (!isOwnData && !canViewAllUsers) {
      return NextResponse.json(
        { error: { message: 'Insufficient permissions to view user mentorship data' } },
        { status: 403 }
      )
    }

    // Verify the user exists and is a member of this workspace
    const userExists = await prisma.workspaceMember.findFirst({
      where: {
        userId,
        workspaceId: workspaceContext.workspaceId,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    if (!userExists) {
      return NextResponse.json(
        { error: { message: 'User not found in this workspace' } },
        { status: 404 }
      )
    }

    // Get mentorship assignments where user is a mentee
    const asMenteeAssignments = await MentorshipService.getAssignments(
      workspaceContext.workspaceId,
      {
        menteeId: userId,
      }
    )

    // Get mentorship assignments where user is a mentor
    const asMentorAssignments = await MentorshipService.getAssignments(
      workspaceContext.workspaceId,
      {
        mentorId: userId,
      }
    )

    // For mentee, we expect only one active assignment (or null)
    const asMentee = asMenteeAssignments.find(assignment => assignment.status === 'ACTIVE') || null

    // For mentor, we return all assignments
    const asMentor = asMentorAssignments

    logger.info('User mentorship data fetched', {
      userId,
      workspaceId: workspaceContext.workspaceId,
      requestedBy: session.user.id,
      asMenteeCount: asMenteeAssignments.length,
      asMentorCount: asMentorAssignments.length,
      hasActiveMentorship: !!asMentee,
    })

    return NextResponse.json({
      success: true,
      data: {
        user: userExists.user,
        asMentee,
        asMentor,
        // Additional stats
        stats: {
          totalAsMentee: asMenteeAssignments.length,
          totalAsMentor: asMentorAssignments.length,
          activeAsMentee: asMenteeAssignments.filter(a => a.status === 'ACTIVE').length,
          activeAsMentor: asMentorAssignments.filter(a => a.status === 'ACTIVE').length,
        },
      },
    })
  } catch (error) {
    logger.error('Error fetching user mentorship data', {
      error: error.message,
      userId: params?.userId,
      requestedBy: session?.user?.id,
    })
    return NextResponse.json(
      { error: { message: 'Failed to fetch user mentorship data' } },
      { status: 500 }
    )
  }
}

/**
 * POST /api/users/[userId]/mentorship
 * Assign a mentor to a specific user (quick assignment)
 */
export async function POST(request, { params }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    const { userId } = params

    if (!userId) {
      return NextResponse.json({ error: { message: 'User ID is required' } }, { status: 400 })
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
    const { mentorId, notes } = body

    // Validate required fields
    if (!mentorId?.trim()) {
      return NextResponse.json({ error: { message: 'Mentor ID is required' } }, { status: 400 })
    }

    // Validate that mentor and mentee are different users
    if (mentorId === userId) {
      return NextResponse.json(
        { error: { message: 'User cannot be their own mentor' } },
        { status: 400 }
      )
    }

    const assignmentData = {
      mentorId,
      menteeId: userId,
      notes: notes?.trim(),
    }

    const assignment = await MentorshipService.createAssignment(
      workspaceContext.workspaceId,
      assignmentData,
      session.user.id
    )

    logger.info('Mentorship assignment created via user route', {
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
        message: 'Mentor assigned successfully',
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
        { error: { message: 'This user already has an active mentor' } },
        { status: 400 }
      )
    }

    logger.error('Error creating mentorship assignment via user route', {
      error: error.message,
      userId: params?.userId,
      createdBy: session?.user?.id,
    })
    return NextResponse.json(
      { error: { message: error.message || 'Failed to assign mentor' } },
      { status: 500 }
    )
  }
}
