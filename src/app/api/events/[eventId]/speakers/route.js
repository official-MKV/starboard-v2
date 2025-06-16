// app/api/events/[id]/speakers/route.js
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WorkspaceContext } from '@/lib/workspace-context'
import { EventService } from '@/lib/services/event-service'
import { prisma } from '@/lib/database'
import { logger } from '@/lib/logger'

/**
 * GET /api/events/[id]/speakers
 * Get speakers for an event
 */
export async function GET(request, { params }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    const eventId = params.eventId

    // Get event details first to check access
    const event = await EventService.findById(eventId)
    if (!event) {
      return NextResponse.json({ error: { message: 'Event not found' } }, { status: 404 })
    }

    // Check access permissions
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
        { error: { message: 'Insufficient permissions to view event speakers' } },
        { status: 403 }
      )
    }

    // Get speakers
    const speakers = await prisma.eventSpeaker.findMany({
      where: { eventId },
      orderBy: { order: 'asc' },
    })

    logger.info('Event speakers fetched', {
      eventId,
      userId: session.user.id,
      speakerCount: speakers.length,
    })

    return NextResponse.json({
      success: true,
      data: { speakers },
    })
  } catch (error) {
    logger.error('Error fetching event speakers', { eventId: params.eventId, error: error.message })
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch speakers' } },
      { status: 500 }
    )
  }
}

/**
 * POST /api/events/[id]/speakers
 * Add speaker to an event
 */
export async function POST(request, { params }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    const eventId = params.eventId

    // Get event details first to check workspace access
    const event = await EventService.findById(eventId)
    if (!event) {
      return NextResponse.json({ error: { message: 'Event not found' } }, { status: 404 })
    }

    // Check workspace context and permissions
    const workspaceContext = await WorkspaceContext.getWorkspaceContext(request, session.user.id)
    if (!workspaceContext || workspaceContext.workspaceId !== event.workspaceId) {
      return NextResponse.json({ error: { message: 'Invalid workspace context' } }, { status: 400 })
    }

    const hasPermission = await WorkspaceContext.hasPermission(
      session.user.id,
      event.workspaceId,
      'events.manage'
    )

    if (!hasPermission && event.creatorId !== session.user.id) {
      return NextResponse.json(
        { error: { message: 'Insufficient permissions to manage event speakers' } },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const {
      userId,
      name,
      email,
      bio,
      avatar,
      company,
      jobTitle,
      role,
      isExternal,
      socialLinks,
      honorarium,
      notes,
    } = body

    // Validate required fields
    if (!name?.trim()) {
      return NextResponse.json({ error: { message: 'Speaker name is required' } }, { status: 400 })
    }

    if (isExternal && !email?.trim()) {
      return NextResponse.json(
        { error: { message: 'Email is required for external speakers' } },
        { status: 400 }
      )
    }

    // Get next order position
    const lastSpeaker = await prisma.eventSpeaker.findFirst({
      where: { eventId },
      orderBy: { order: 'desc' },
    })

    const order = (lastSpeaker?.order || 0) + 1

    // Create speaker data
    const speakerData = {
      eventId,
      userId: !isExternal ? userId : null,
      name: name.trim(),
      email: email?.trim() || null,
      bio: bio?.trim() || null,
      avatar: avatar?.trim() || null,
      company: company?.trim() || null,
      jobTitle: jobTitle?.trim() || null,
      role: role || 'SPEAKER',
      isExternal: Boolean(isExternal),
      isConfirmed: !isExternal, // Internal speakers are auto-confirmed
      order,
      honorarium: honorarium ? parseFloat(honorarium) : null,
      notes: notes?.trim() || null,
      socialLinks: socialLinks || {},
    }

    // Create the speaker
    const speaker = await prisma.eventSpeaker.create({
      data: speakerData,
    })

    logger.info('Event speaker added', {
      eventId,
      speakerId: speaker.id,
      speakerName: speaker.name,
      isExternal: speaker.isExternal,
      userId: session.user.id,
    })

    return NextResponse.json({
      success: true,
      data: { speaker },
      message: 'Speaker added successfully',
    })
  } catch (error) {
    logger.error('Error adding event speaker', { eventId: params.eventId, error: error.message })
    return NextResponse.json(
      { error: { message: error.message || 'Failed to add speaker' } },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/events/[id]/speakers
 * Update speakers order for an event
 */
export async function PUT(request, { params }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    const eventId = params.eventId

    // Get event details first to check workspace access
    const event = await EventService.findById(eventId)
    if (!event) {
      return NextResponse.json({ error: { message: 'Event not found' } }, { status: 404 })
    }

    // Check workspace context and permissions
    const workspaceContext = await WorkspaceContext.getWorkspaceContext(request, session.user.id)
    if (!workspaceContext || workspaceContext.workspaceId !== event.workspaceId) {
      return NextResponse.json({ error: { message: 'Invalid workspace context' } }, { status: 400 })
    }

    const hasPermission = await WorkspaceContext.hasPermission(
      session.user.id,
      event.workspaceId,
      'events.manage'
    )

    if (!hasPermission && event.creatorId !== session.user.id) {
      return NextResponse.json(
        { error: { message: 'Insufficient permissions to manage event speakers' } },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { speakers } = body

    if (!Array.isArray(speakers)) {
      return NextResponse.json({ error: { message: 'Speakers must be an array' } }, { status: 400 })
    }

    // Update speaker orders in transaction
    await prisma.$transaction(async tx => {
      for (let i = 0; i < speakers.length; i++) {
        const speaker = speakers[i]
        if (speaker.id) {
          await tx.eventSpeaker.update({
            where: {
              id: speaker.id,
              eventId, // Ensure speaker belongs to this event
            },
            data: { order: i },
          })
        }
      }
    })

    logger.info('Event speakers order updated', {
      eventId,
      speakerCount: speakers.length,
      userId: session.user.id,
    })

    return NextResponse.json({
      success: true,
      message: 'Speaker order updated successfully',
    })
  } catch (error) {
    logger.error('Error updating speaker order', { eventId: params.eventId, error: error.message })
    return NextResponse.json(
      { error: { message: error.message || 'Failed to update speaker order' } },
      { status: 500 }
    )
  }
}
