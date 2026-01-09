// app/api/events/[id]/route.js
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WorkspaceContext } from '@/lib/workspace-context'
import { EventService } from '@/lib/services/event-service'
import { logger } from '@/lib/logger'
 
 
export async function GET(request, { params }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    const { eventId } = await params
    
   
    const event = await EventService.findById(eventId, session.user.id)
    if (!event) {
      return NextResponse.json({ error: { message: 'Event not found' } }, { status: 404 })
    }

  
    let hasAccess = event.isPublic

    if (!hasAccess) { 
      const workspaceContext = await WorkspaceContext.getWorkspaceContext(request, session.user.id)
      if (workspaceContext && workspaceContext.workspaceId === event.workspaceId) {
        hasAccess = await WorkspaceContext.hasAnyPermission(session.user.id, event.workspaceId, [
          'events.view',
          'events.manage',
        ])
      }
    }

    if (!hasAccess) {
     
      hasAccess = await EventService.checkEventAccess(eventId, session.user.id)
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: { message: 'Insufficient permissions to view this event' } },
        { status: 403 }
      )
    }

    logger.info('Event fetched', {
      eventId,
      userId: session.user.id,
      isPublic: event.isPublic,
      workspaceId: event.workspaceId,
      hasSubmission: event.type === 'DEMO_DAY' ? !!event.userSubmission : null,
    })

    return NextResponse.json({
      success: true,
      data: { event },
    })
  } catch (error) {
    const { eventId } = await params
    logger.error('Error fetching event', { eventId, error: error.message })
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch event' } },
      { status: 500 }
    )
  }
}
/**
 * PUT /api/events/[id]
 * Update event by ID
 */
export async function PUT(request, { params }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    const { eventId } = await params

    // Get event details first to check workspace access
    const existingEvent = await EventService.findById(eventId)
    if (!existingEvent) {
      return NextResponse.json({ error: { message: 'Event not found' } }, { status: 404 })
    }

    // Check workspace context
    const workspaceContext = await WorkspaceContext.getWorkspaceContext(request, session.user.id)
    if (!workspaceContext || workspaceContext.workspaceId !== existingEvent.workspaceId) {
      return NextResponse.json({ error: { message: 'Invalid workspace context' } }, { status: 400 })
    }

    // Check permissions
    const hasPermission = await WorkspaceContext.hasPermission(
      session.user.id,
      existingEvent.workspaceId,
      'events.manage'
    )

    if (!hasPermission && existingEvent.creatorId !== session.user.id) {
      return NextResponse.json(
        { error: { message: 'Insufficient permissions to update this event' } },
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
    if (title !== undefined && !title?.trim()) {
      return NextResponse.json(
        { error: { message: 'Event title cannot be empty' } },
        { status: 400 }
      )
    }

    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
      return NextResponse.json(
        { error: { message: 'End date must be after start date' } },
        { status: 400 }
      )
    }

    if (isVirtual && virtualLink === '') {
      return NextResponse.json(
        { error: { message: 'Virtual link is required for virtual events' } },
        { status: 400 }
      )
    }

    // Create update data (only include fields that are provided)
    const updateData = {}

    if (title !== undefined) updateData.title = title.trim()
    if (description !== undefined) updateData.description = description?.trim() || null
    if (type !== undefined) updateData.type = type
    if (startDate !== undefined) updateData.startDate = new Date(startDate)
    if (endDate !== undefined) updateData.endDate = new Date(endDate)
    if (location !== undefined) updateData.location = location?.trim() || null
    if (virtualLink !== undefined) updateData.virtualLink = isVirtual ? virtualLink?.trim() : null
    if (isVirtual !== undefined) updateData.isVirtual = Boolean(isVirtual)
    if (isPublic !== undefined) updateData.isPublic = Boolean(isPublic)
    if (maxAttendees !== undefined)
      updateData.maxAttendees = maxAttendees ? parseInt(maxAttendees) : null
    if (bannerImage !== undefined) updateData.bannerImage = bannerImage?.trim() || null
    if (waitingRoom !== undefined) updateData.waitingRoom = Boolean(waitingRoom)
    if (autoRecord !== undefined) updateData.autoRecord = Boolean(autoRecord)
    if (requireApproval !== undefined) updateData.requireApproval = Boolean(requireApproval)
    if (agenda !== undefined) updateData.agenda = agenda?.trim() || null
    if (instructions !== undefined) updateData.instructions = instructions?.trim() || null
    if (tags !== undefined)
      updateData.tags = Array.isArray(tags) ? tags.filter(tag => tag?.trim()) : []
    if (timezone !== undefined) updateData.timezone = timezone || 'UTC'
    if (isRecurring !== undefined) updateData.isRecurring = Boolean(isRecurring)
    if (recurringRule !== undefined) updateData.recurringRule = isRecurring ? recurringRule : null
    if (speakers !== undefined) updateData.speakers = Array.isArray(speakers) ? speakers : []
    if (accessRules !== undefined)
      updateData.accessRules = Array.isArray(accessRules) ? accessRules : []
    if (resources !== undefined) updateData.resources = Array.isArray(resources) ? resources : []

    // Update the event
    const event = await EventService.update(eventId, updateData, session.user.id)

    logger.info('Event updated', {
      eventId,
      eventTitle: event.title,
      userId: session.user.id,
      workspaceId: event.workspaceId,
      updatedFields: Object.keys(updateData),
    })

    return NextResponse.json({
      success: true,
      data: { event },
      message: 'Event updated successfully',
    })
  } catch (error) {
    const { eventId } = await params
    logger.error('Error updating event', { eventId, error: error.message })
    return NextResponse.json(
      { error: { message: error.message || 'Failed to update event' } },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/events/[id]
 * Delete event by ID
 */
export async function DELETE(request, { params }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    const { eventId } = await params

    // Get event details first to check workspace access
    const existingEvent = await EventService.findById(eventId)
    if (!existingEvent) {
      return NextResponse.json({ error: { message: 'Event not found' } }, { status: 404 })
    }

    // Check workspace context
    const workspaceContext = await WorkspaceContext.getWorkspaceContext(request, session.user.id)
    if (!workspaceContext || workspaceContext.workspaceId !== existingEvent.workspaceId) {
      return NextResponse.json({ error: { message: 'Invalid workspace context' } }, { status: 400 })
    }

    // Check permissions
    const hasPermission = await WorkspaceContext.hasPermission(
      session.user.id,
      existingEvent.workspaceId,
      'events.manage'
    )

    if (!hasPermission && existingEvent.creatorId !== session.user.id) {
      return NextResponse.json(
        { error: { message: 'Insufficient permissions to delete this event' } },
        { status: 403 }
      )
    }

    // Check if event has registrations (optional safety check)
    if (existingEvent._count?.registrations > 0) {
      const { searchParams } = new URL(request.url)
      const force = searchParams.get('force') === 'true'

      if (!force) {
        return NextResponse.json(
          {
            error: {
              message: 'Event has registered participants. Use force=true to delete anyway.',
              code: 'HAS_REGISTRATIONS',
              registrationCount: existingEvent._count.registrations,
            },
          },
          { status: 409 }
        )
      }
    }

    // Delete the event
    await EventService.delete(eventId, session.user.id)

    logger.info('Event deleted', {
      eventId,
      eventTitle: existingEvent.title,
      userId: session.user.id,
      workspaceId: existingEvent.workspaceId,
      hadRegistrations: existingEvent._count?.registrations > 0,
    })

    return NextResponse.json({
      success: true,
      message: 'Event deleted successfully',
    })
  } catch (error) {
    const { eventId } = await params
    logger.error('Error deleting event', { eventId, error: error.message })
    return NextResponse.json(
      { error: { message: error.message || 'Failed to delete event' } },
      { status: 500 }
    )
  }
}
