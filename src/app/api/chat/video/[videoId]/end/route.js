import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/database'
import { WorkspaceContext } from '@/lib/workspace-context'

export async function POST(request, { params }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { videoCallId } = params

    if (!videoCallId) {
      return NextResponse.json({ error: 'Video call ID required' }, { status: 400 })
    }

    // Find the video call
    const videoCall = await prisma.videoCall.findUnique({
      where: { id: videoCallId },
      include: {
        host: true,
        participant: true,
      },
    })

    if (!videoCall) {
      return NextResponse.json({ error: 'Video call not found' }, { status: 404 })
    }

    // Verify user is either host or participant
    if (videoCall.hostId !== session.user.id && videoCall.participantId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized to end this call' }, { status: 403 })
    }

    // Update video call status
    const updatedVideoCall = await prisma.videoCall.update({
      where: { id: videoCallId },
      data: { status: 'ENDED' },
    })

    // Find and update the related message
    const message = await prisma.message.findFirst({
      where: {
        type: 'VIDEO_CALL',
        metadata: {
          path: ['videoCallId'],
          equals: videoCallId,
        },
      },
    })

    if (message) {
      // Update message metadata to reflect ended status
      const updatedMetadata = {
        ...message.metadata,
        status: 'ENDED',
        endedAt: new Date().toISOString(),
      }

      await prisma.message.update({
        where: { id: message.id },
        data: { metadata: updatedMetadata },
      })
    }

    console.log('✅ Video call ended:', videoCallId)

    return NextResponse.json({
      success: true,
      videoCall: updatedVideoCall,
    })
  } catch (error) {
    console.error('❌ Error ending video call:', error)
    return NextResponse.json(
      {
        error: 'Failed to end video call',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    )
  }
}
