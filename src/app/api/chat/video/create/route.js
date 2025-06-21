import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/database'
import { WorkspaceContext } from '@/lib/workspace-context'
import { ZoomService } from '@/lib/services/zoom-service'

export async function POST(request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const workspaceContext = await WorkspaceContext.getWorkspaceContext(request, session.user.id)
    if (!workspaceContext) {
      return NextResponse.json({ error: 'Workspace context required' }, { status: 403 })
    }

    const { participantId } = await request.json()

    if (!participantId) {
      return NextResponse.json({ error: 'Participant ID required' }, { status: 400 })
    }

    // Verify participant is in same workspace
    const participant = await prisma.user.findFirst({
      where: {
        id: participantId,
        workspaceMembers: {
          some: {
            workspaceId: workspaceContext.workspaceId,
            isActive: true,
          },
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    })

    if (!participant) {
      return NextResponse.json({ error: 'Participant not found in workspace' }, { status: 404 })
    }

    const meetingTopic = `Video call with ${participant.firstName} ${participant.lastName}`

    // 🎥 NEW: Create actual Zoom meeting using ZoomService
    let zoomMeeting = null
    const meetingPassword = Math.random().toString(36).substring(2, 8) // Fallback password

    try {
      // Create Zoom meeting
      zoomMeeting = await ZoomService.createMeeting({
        topic: meetingTopic,
        start_time: new Date(), // Start immediately
        duration: 60, // 1 hour default
        timezone: 'UTC',
        password: meetingPassword,
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: true,
          mute_upon_entry: false,
          waiting_room: false,
          auto_recording: 'none',
          allow_multiple_devices: true,
        },
      })

      console.log('✅ Zoom meeting created:', zoomMeeting.id)
    } catch (zoomError) {
      console.error('❌ Failed to create Zoom meeting:', zoomError.message)
      // Continue with fallback - we'll create a database record without Zoom integration
    }

    // Create VideoCall record in database
    const videoCall = await prisma.videoCall.create({
      data: {
        hostId: session.user.id,
        participantId: participantId,
        workspaceId: workspaceContext.workspaceId,
        topic: meetingTopic,
        zoomMeetingId: zoomMeeting?.id || `fallback-${Date.now()}`,
        joinUrl: zoomMeeting?.join_url || `/video/join/${Date.now()}-${participantId}`,
        startUrl: zoomMeeting?.start_url || `/video/start/${Date.now()}-${session.user.id}`,
        password: zoomMeeting?.password || meetingPassword,
        status: 'STARTED',
        // Store additional Zoom data if available
        ...(zoomMeeting && {
          zoomUuid: zoomMeeting.uuid,
          zoomHostId: zoomMeeting.host_id,
          zoomStartTime: new Date(zoomMeeting.start_time),
          zoomDuration: zoomMeeting.duration,
          zoomTimezone: zoomMeeting.timezone,
        }),
      },
      include: {
        host: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
        participant: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
      },
    })

    console.log('✅ Video call record created:', videoCall.id)

    // Create enhanced message content
    const messageContent = zoomMeeting
      ? `🎥 **Video Call Started**\n\n**Meeting ID:** ${zoomMeeting.id}\n**Password:** ${zoomMeeting.password}\n\nClick "Join Call" to start the video call.`
      : `🎥 **Video Call Started**\n\nClick "Join Call" to start the video call.`

    // Send message to chat with video call info
    const message = await prisma.message.create({
      data: {
        senderId: session.user.id,
        receiverId: participantId,
        workspaceId: workspaceContext.workspaceId,
        content: messageContent,
        type: 'VIDEO_CALL', // ✅ FIXED: Using VIDEO_CALL (provider-agnostic)
        metadata: {
          videoCallId: videoCall.id,
          joinUrl: videoCall.joinUrl,
          meetingId: zoomMeeting?.id,
          password: videoCall.password,
          status: 'STARTED',
          isZoomMeeting: !!zoomMeeting,
          createdAt: videoCall.createdAt.toISOString(),
        },
      },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
        receiver: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
      },
    })

    return NextResponse.json(
      {
        success: true,
        meeting: {
          id: videoCall.id,
          topic: videoCall.topic,
          joinUrl: videoCall.joinUrl,
          startUrl: videoCall.startUrl,
          password: videoCall.password,
          status: videoCall.status,
          host: videoCall.host,
          participant: videoCall.participant,
          createdAt: videoCall.createdAt,
          // Include Zoom-specific data if available
          ...(zoomMeeting && {
            zoomMeetingId: zoomMeeting.id,
            zoomUuid: zoomMeeting.uuid,
            isZoomMeeting: true,
          }),
        },
        message: {
          id: message.id,
          content: message.content,
          type: message.type,
          metadata: message.metadata,
          sender: message.sender,
          receiver: message.receiver,
          createdAt: message.createdAt,
        },
        zoomIntegration: !!zoomMeeting,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('❌ Error creating video call:', error)
    return NextResponse.json(
      {
        error: 'Failed to create video call. Please try again.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    )
  }
}
