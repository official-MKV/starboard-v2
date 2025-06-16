// app/api/events/route.js
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WorkspaceContext } from '@/lib/workspace-context'
import { EventService } from '@/lib/services/event-service'
import { logger } from '@/lib/logger'

/**
 * GET /api/events
 * Get events for current workspace with filters
 */
export async function GET(request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    // Get workspace context from cookies
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
    const { searchParams } = new URL(request.url)
    const filters = {
      search: searchParams.get('search') || '',
      type: searchParams.get('type') || 'all',
      status: searchParams.get('status') || 'all',
      date: searchParams.get('date') || 'all',
      isPublic: searchParams.get('isPublic'),
      creatorId: searchParams.get('creatorId'),
      page: parseInt(searchParams.get('page')) || 1,
      limit: parseInt(searchParams.get('limit')) || 50,
    }

    // Get events for workspace
    const eventsData = await EventService.findByWorkspace(workspaceContext.workspaceId, filters)

    logger.info('Events fetched', {
      workspaceId: workspaceContext.workspaceId,
      userId: session.user.id,
      eventCount: eventsData.events.length,
      filters: JSON.stringify(filters),
    })

    return NextResponse.json({
      success: true,
      data: eventsData,
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

    // Get workspace context from cookies
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
      isVirtual,
      isPublic,
      maxAttendees,
      bannerImage,
      waitingRoom,
      autoRecord,
      requireApproval,
      agenda,
      instructions,
      tags,
      speakers,
      accessRules,
      resources,
      timezone,
      isRecurring,
      recurringRule,
    } = body

    // Validate required fields
    if (!title?.trim()) {
      return NextResponse.json({ error: { message: 'Event title is required' } }, { status: 400 })
    }

    if (!startDate) {
      return NextResponse.json({ error: { message: 'Start date is required' } }, { status: 400 })
    }

    if (!endDate) {
      return NextResponse.json({ error: { message: 'End date is required' } }, { status: 400 })
    }

    if (new Date(startDate) >= new Date(endDate)) {
      return NextResponse.json(
        { error: { message: 'End date must be after start date' } },
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
      location: location?.trim() || null,
      isVirtual: Boolean(isVirtual),
      isPublic: Boolean(isPublic),
      maxAttendees: maxAttendees ? parseInt(maxAttendees) : null,
      bannerImage: bannerImage?.trim() || null,
      waitingRoom: Boolean(waitingRoom),
      autoRecord: Boolean(autoRecord),
      requireApproval: Boolean(requireApproval),
      agenda: agenda?.trim() || null,
      instructions: instructions?.trim() || null,
      tags: Array.isArray(tags) ? tags.filter(tag => tag?.trim()) : [],
      timezone: timezone || 'UTC',
      isRecurring: Boolean(isRecurring),
      recurringRule: isRecurring ? recurringRule : null,
      speakers: Array.isArray(speakers) ? speakers : [],
      accessRules: Array.isArray(accessRules) ? accessRules : [],
      resources: Array.isArray(resources) ? resources : [],

      // Virtual meeting will be handled in the service
      virtualLink: null, // This will be set by the service if virtual
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
      isPublic: event.isPublic,
      isVirtual: event.virtualLink ? true : false,
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
