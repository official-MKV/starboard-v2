import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WorkspaceContext } from '@/lib/workspace-context'
import { EventService } from '@/lib/services/event-service'
import { logger } from '@/lib/logger'

/**
 * GET /api/events
 * Get all events for current workspace with filters
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
      ['events.view', 'events.manage']
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: { message: 'Insufficient permissions to view events' } },
        { status: 403 }
      )
    }

    // Parse query parameters
    const url = new URL(request.url)
    const filters = {
      search: url.searchParams.get('search') || '',
      type: url.searchParams.get('type') || 'all',
      status: url.searchParams.get('status') || 'all',
      date: url.searchParams.get('date') || 'all',
      page: parseInt(url.searchParams.get('page')) || 1,
      limit: parseInt(url.searchParams.get('limit')) || 50,
    }

    // Get events
    const result = await EventService.findByWorkspace(workspaceContext.workspaceId, filters)

    logger.info('Events fetched', {
      workspaceId: workspaceContext.workspaceId,
      userId: session.user.id,
      filters,
      eventCount: result.events.length,
    })

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    logger.error('Error fetching events', { error: error.message })
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch events' } },
      { status: 500 }
    )
  }
}

/**
 * POST /api/events
 * Create a new event
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
      'events.manage'
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: { message: 'Insufficient permissions to create events' } },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const {
      title,
      description,
      type,
      startDate,
      endDate,
      location,
      virtualLink,
      isPublic,
      maxAttendees,
      requireApproval,
      waitingRoom,
      isRecorded,
      autoRecord,
      meetingPassword,
      agenda,
      instructions,
      tags,
      speakers,
      accessRules,
      resources,
    } = body

    // Validate required fields
    if (!title?.trim()) {
      return NextResponse.json({ error: { message: 'Event title is required' } }, { status: 400 })
    }

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: { message: 'Start and end dates are required' } },
        { status: 400 }
      )
    }

    if (new Date(endDate) <= new Date(startDate)) {
      return NextResponse.json(
        { error: { message: 'End date must be after start date' } },
        { status: 400 }
      )
    }

    // Validate virtual meeting requirements
    const isVirtual = !!virtualLink
    if (isVirtual && !virtualLink) {
      return NextResponse.json(
        { error: { message: 'Virtual link is required for virtual events' } },
        { status: 400 }
      )
    }

    if (!isVirtual && !location) {
      return NextResponse.json(
        { error: { message: 'Location is required for in-person events' } },
        { status: 400 }
      )
    }

    // Create event data
    const eventData = {
      title: title.trim(),
      description: description?.trim() || null,
      type: type || 'WORKSHOP',
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      location: isVirtual ? null : location?.trim(),
      virtualLink: isVirtual ? virtualLink.trim() : null,
      isPublic: Boolean(isPublic),
      maxAttendees: maxAttendees ? parseInt(maxAttendees) : null,
      requireApproval: Boolean(requireApproval),
      waitingRoom: Boolean(waitingRoom),
      isRecorded: Boolean(isRecorded),
      autoRecord: Boolean(autoRecord),
      meetingPassword: meetingPassword?.trim() || null,
      agenda: agenda?.trim() || null,
      instructions: instructions?.trim() || null,
      tags: tags || [],
      speakers: speakers || [],
      accessRules: accessRules || [],
      resources: resources || [],
    }

    // Create the event
    const event = await EventService.create(
      workspaceContext.workspaceId,
      eventData,
      session.user.id
    )

    logger.info('Event created', {
      eventId: event.id,
      eventTitle: event.title,
      workspaceId: workspaceContext.workspaceId,
      userId: session.user.id,
    })

    return NextResponse.json({
      success: true,
      data: { event },
      message: 'Event created successfully',
    })
  } catch (error) {
    logger.error('Error creating event', { error: error.message })
    return NextResponse.json(
      { error: { message: error.message || 'Failed to create event' } },
      { status: 500 }
    )
  }
}
