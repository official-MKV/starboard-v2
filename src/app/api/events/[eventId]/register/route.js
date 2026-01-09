// app/api/events/[id]/register/route.js
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WorkspaceContext } from '@/lib/workspace-context'
import { EventService } from '@/lib/services/event-service'
import { logger } from '@/lib/logger'

/**
 * POST /api/events/[id]/register
 * Register user for an event
 */
export async function POST(request, { params }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    const eventId = (await params).eventId

    // Get event details first to check access and workspace
    const event = await EventService.findById(eventId)
    if (!event) {
      return NextResponse.json({ error: { message: 'Event not found' } }, { status: 404 })
    }

    // Check if user has access to register for this event
    let hasAccess = event.isPublic
    let invitedBy = null

    if (!hasAccess && event.workspaceId) {
      // Check if user is a workspace member
      const workspaceAccess = await WorkspaceContext.checkWorkspaceAccess(
        session.user.id,
        event.workspaceId
      )

      if (workspaceAccess) {
        hasAccess = true
      }
    }

    if (!hasAccess) {
      // Check if user has specific access to this event (invited, etc.)
      hasAccess = await EventService.checkEventAccess(eventId, session.user.id)
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: { message: 'You do not have access to register for this event' } },
        { status: 403 }
      )
    }

    // Check if event registration is still open
    const now = new Date()
    if (event.startDate <= now) {
      return NextResponse.json(
        { error: { message: 'Registration is closed for this event' } },
        { status: 400 }
      )
    }

    // Parse optional request body for invitation tracking
    let body = {}
    try {
      const requestText = await request.text()
      if (requestText) {
        body = JSON.parse(requestText)
      }
    } catch (e) {
      // No body or invalid JSON, continue with empty body
    }

    if (body.invitedBy) {
      invitedBy = body.invitedBy
    }

    // Register the user
    const result = await EventService.registerUser(eventId, session.user.id, invitedBy)

    if (result.type === 'waitlist') {
      logger.info('User added to event waitlist', {
        eventId,
        userId: session.user.id,
        position: result.position,
        eventTitle: event.title,
      })

      return NextResponse.json({
        success: true,
        data: {
          type: 'waitlist',
          position: result.position,
          message: `You have been added to the waitlist at position ${result.position}`,
        },
      })
    }

    logger.info('User registered for event', {
      eventId,
      userId: session.user.id,
      registrationId: result.registration.id,
      eventTitle: event.title,
      invitedBy,
    })

    return NextResponse.json({
      success: true,
      data: {
        type: 'registration',
        registration: result.registration,
        message: 'Successfully registered for the event',
      },
    })
  } catch (error) {
    logger.error('Error registering for event', {
      eventId: (await params).eventId,
      userId: session?.user?.id,
      error: error.message,
    })
    return NextResponse.json(
      { error: { message: error.message || 'Failed to register for event' } },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/events/[id]/register
 * Cancel user registration for an event
 */
export async function DELETE(request, { params }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    const eventId = (await params).eventId

    // Get event details first
    const event = await EventService.findById(eventId)
    if (!event) {
      return NextResponse.json({ error: { message: 'Event not found' } }, { status: 404 })
    }

    // Check if cancellation is still allowed (e.g., before event starts)
    const now = new Date()
    const hoursBeforeEvent = (new Date(event.startDate) - now) / (1000 * 60 * 60)

    if (hoursBeforeEvent < 1) {
      return NextResponse.json(
        { error: { message: 'Cannot cancel registration less than 1 hour before the event' } },
        { status: 400 }
      )
    }

    // Cancel the registration
    await EventService.cancelRegistration(eventId, session.user.id)

    logger.info('User cancelled event registration', {
      eventId,
      userId: session.user.id,
      eventTitle: event.title,
      hoursBeforeEvent: Math.round(hoursBeforeEvent),
    })

    return NextResponse.json({
      success: true,
      message: 'Registration cancelled successfully',
    })
  } catch (error) {
    logger.error('Error cancelling event registration', {
      eventId: (await params).eventId,
      userId: session?.user?.id,
      error: error.message,
    })
    return NextResponse.json(
      { error: { message: error.message || 'Failed to cancel registration' } },
      { status: 500 }
    )
  }
}
