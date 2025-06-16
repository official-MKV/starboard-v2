// app/api/events/[id]/recordings/route.js
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WorkspaceContext } from '@/lib/workspace-context'
import { EventService } from '@/lib/services/event-service'
import { prisma } from '@/lib/database'
import { logger } from '@/lib/logger'

/**
 * GET /api/events/[id]/recordings
 * Get recordings for an event
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
    let showPrivateRecordings = false

    if (!hasAccess) {
      const workspaceContext = await WorkspaceContext.getWorkspaceContext(request, session.user.id)
      if (workspaceContext && workspaceContext.workspaceId === event.workspaceId) {
        hasAccess = await WorkspaceContext.hasAnyPermission(session.user.id, event.workspaceId, [
          'events.view',
          'events.manage',
        ])

        // Check if user can see private recordings
        showPrivateRecordings = await WorkspaceContext.hasPermission(
          session.user.id,
          event.workspaceId,
          'events.manage'
        )
      }
    }

    if (!hasAccess) {
      // Check if user was registered for the event
      const registration = await prisma.eventRegistration.findUnique({
        where: { eventId_userId: { eventId, userId: session.user.id } },
      })

      if (registration) {
        hasAccess = true
      }
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: { message: 'Insufficient permissions to view recordings' } },
        { status: 403 }
      )
    }

    // Build where clause for recordings
    const where = { eventId }

    // If user doesn't have manage permissions, only show public recordings
    if (!showPrivateRecordings) {
      where.isPublic = true
    }

    // Get recordings
    const recordings = await prisma.eventRecording.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        recordingUrl: true,
        downloadUrl: showPrivateRecordings ? true : false, // Only show download for managers
        thumbnailUrl: true,
        duration: true,
        fileSize: true,
        format: true,
        quality: true,
        isPublic: true,
        isProcessed: true,
        processingStatus: true,
        viewCount: true,
        downloadCount: showPrivateRecordings ? true : false,
        transcription: showPrivateRecordings ? true : false,
        chapters: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    // Track view if user is viewing recordings
    if (recordings.length > 0) {
      // Increment view count for public recordings or if user has access
      await prisma.recordingView
        .create({
          data: {
            recordingId: recordings[0].id, // Track main recording view
            userId: session.user.id,
            viewedAt: new Date(),
          },
        })
        .catch(() => {
          // Ignore errors (might be duplicate views)
        })
    }

    logger.info('Event recordings fetched', {
      eventId,
      userId: session.user.id,
      recordingCount: recordings.length,
      showPrivateRecordings,
    })

    return NextResponse.json({
      success: true,
      data: {
        recordings,
        hasManageAccess: showPrivateRecordings,
      },
    })
  } catch (error) {
    logger.error('Error fetching event recordings', {
      eventId: params.eventId,
      error: error.message,
    })
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch recordings' } },
      { status: 500 }
    )
  }
}

/**
 * POST /api/events/[id]/recordings
 * Upload/Create a recording for an event
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

    if (!hasPermission) {
      return NextResponse.json(
        { error: { message: 'Insufficient permissions to manage event recordings' } },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const {
      title,
      description,
      recordingUrl,
      downloadUrl,
      thumbnailUrl,
      duration,
      fileSize,
      format,
      quality,
      isPublic,
      transcription,
      chapters,
    } = body

    // Validate required fields
    if (!title?.trim()) {
      return NextResponse.json(
        { error: { message: 'Recording title is required' } },
        { status: 400 }
      )
    }

    if (!recordingUrl?.trim()) {
      return NextResponse.json({ error: { message: 'Recording URL is required' } }, { status: 400 })
    }

    // Create recording data
    const recordingData = {
      eventId,
      title: title.trim(),
      description: description?.trim() || null,
      recordingUrl: recordingUrl.trim(),
      downloadUrl: downloadUrl?.trim() || null,
      thumbnailUrl: thumbnailUrl?.trim() || null,
      duration: duration ? parseInt(duration) : null,
      fileSize: fileSize ? parseInt(fileSize) : null,
      format: format?.toLowerCase() || 'mp4',
      quality: quality || 'HD',
      isPublic: Boolean(isPublic),
      isProcessed: true, // Manual uploads are considered processed
      processingStatus: 'COMPLETED',
      viewCount: 0,
      downloadCount: 0,
      transcription: transcription?.trim() || null,
      chapters: chapters || null,
    }

    // Create the recording
    const recording = await prisma.eventRecording.create({
      data: recordingData,
    })

    logger.info('Event recording created', {
      eventId,
      recordingId: recording.id,
      recordingTitle: recording.title,
      userId: session.user.id,
      isPublic: recording.isPublic,
    })

    return NextResponse.json({
      success: true,
      data: { recording },
      message: 'Recording uploaded successfully',
    })
  } catch (error) {
    logger.error('Error creating event recording', {
      eventId: params.eventId,
      error: error.message,
    })
    return NextResponse.json(
      { error: { message: error.message || 'Failed to create recording' } },
      { status: 500 }
    )
  }
}
