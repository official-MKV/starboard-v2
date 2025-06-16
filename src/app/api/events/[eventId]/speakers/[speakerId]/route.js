// app/api/events/[id]/speakers/[speakerId]/route.js
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WorkspaceContext } from '@/lib/workspace-context'
import { EventService } from '@/lib/services/event-service'
import { prisma } from '@/lib/database'
import { logger } from '@/lib/logger'

/**
 * PUT /api/events/[id]/speakers/[speakerId]
 * Update a specific speaker
 */
export async function PUT(request, { params }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    const { id: eventId, speakerId } = params

    // Get event details first to check workspace access
    const event = await EventService.findById(eventId)
    if (!event) {
      return NextResponse.json({ error: { message: 'Event not found' } }, { status: 404 })
    }

    // Check if speaker exists and belongs to this event
    const existingSpeaker = await prisma.eventSpeaker.findFirst({
      where: { id: speakerId, eventId },
    })

    if (!existingSpeaker) {
      return NextResponse.json({ error: { message: 'Speaker not found' } }, { status: 404 })
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
      isConfirmed,
      socialLinks,
      honorarium,
      notes,
    } = body

    // Validate required fields
    if (name !== undefined && !name?.trim()) {
      return NextResponse.json(
        { error: { message: 'Speaker name cannot be empty' } },
        { status: 400 }
      )
    }

    if (isExternal && email === '') {
      return NextResponse.json(
        { error: { message: 'Email is required for external speakers' } },
        { status: 400 }
      )
    }

    // Create update data (only include fields that are provided)
    const updateData = {}

    if (userId !== undefined) updateData.userId = !isExternal ? userId : null
    if (name !== undefined) updateData.name = name.trim()
    if (email !== undefined) updateData.email = email?.trim() || null
    if (bio !== undefined) updateData.bio = bio?.trim() || null
    if (avatar !== undefined) updateData.avatar = avatar?.trim() || null
    if (company !== undefined) updateData.company = company?.trim() || null
    if (jobTitle !== undefined) updateData.jobTitle = jobTitle?.trim() || null
    if (role !== undefined) updateData.role = role
    if (isExternal !== undefined) updateData.isExternal = Boolean(isExternal)
    if (isConfirmed !== undefined) updateData.isConfirmed = Boolean(isConfirmed)
    if (socialLinks !== undefined) updateData.socialLinks = socialLinks || {}
    if (honorarium !== undefined) updateData.honorarium = honorarium ? parseFloat(honorarium) : null
    if (notes !== undefined) updateData.notes = notes?.trim() || null

    // Update the speaker
    const speaker = await prisma.eventSpeaker.update({
      where: { id: speakerId },
      data: updateData,
    })

    logger.info('Event speaker updated', {
      eventId,
      speakerId,
      speakerName: speaker.name,
      userId: session.user.id,
      updatedFields: Object.keys(updateData),
    })

    return NextResponse.json({
      success: true,
      data: { speaker },
      message: 'Speaker updated successfully',
    })
  } catch (error) {
    logger.error('Error updating event speaker', {
      eventId: params.eventId,
      speakerId: params.speakerId,
      error: error.message,
    })
    return NextResponse.json(
      { error: { message: error.message || 'Failed to update speaker' } },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/events/[id]/speakers/[speakerId]
 * Remove a speaker from an event
 */
export async function DELETE(request, { params }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: { message: 'Authentication required' } }, { status: 401 })
    }

    const { id: eventId, speakerId } = params

    // Get event details first to check workspace access
    const event = await EventService.findById(eventId)
    if (!event) {
      return NextResponse.json({ error: { message: 'Event not found' } }, { status: 404 })
    }

    // Check if speaker exists and belongs to this event
    const existingSpeaker = await prisma.eventSpeaker.findFirst({
      where: { id: speakerId, eventId },
    })

    if (!existingSpeaker) {
      return NextResponse.json({ error: { message: 'Speaker not found' } }, { status: 404 })
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

    // Delete the speaker and reorder remaining speakers
    await prisma.$transaction(async tx => {
      // Delete the speaker
      await tx.eventSpeaker.delete({
        where: { id: speakerId },
      })

      // Reorder remaining speakers to fill the gap
      const remainingSpeakers = await tx.eventSpeaker.findMany({
        where: {
          eventId,
          order: { gt: existingSpeaker.order },
        },
        orderBy: { order: 'asc' },
      })

      // Update order for remaining speakers
      for (let i = 0; i < remainingSpeakers.length; i++) {
        await tx.eventSpeaker.update({
          where: { id: remainingSpeakers[i].id },
          data: { order: existingSpeaker.order + i },
        })
      }
    })

    logger.info('Event speaker removed', {
      eventId,
      speakerId,
      speakerName: existingSpeaker.name,
      userId: session.user.id,
      wasExternal: existingSpeaker.isExternal,
    })

    return NextResponse.json({
      success: true,
      message: 'Speaker removed successfully',
    })
  } catch (error) {
    logger.error('Error removing event speaker', {
      eventId: params.eventId,
      speakerId: params.speakerId,
      error: error.message,
    })
    return NextResponse.json(
      { error: { message: error.message || 'Failed to remove speaker' } },
      { status: 500 }
    )
  }
}
