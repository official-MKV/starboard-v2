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

    const { topic, participants = [] } = await request.json()

    // Verify participants are in same workspace
    if (participants.length > 0) {
      const participantWorkspaces = await prisma.workspaceMember.findMany({
        where: {
          userId: { in: participants },
          workspaceId: workspaceContext.workspaceId,
          isActive: true,
        },
      })

      if (participantWorkspaces.length !== participants.length) {
        return NextResponse.json(
          { error: 'Some participants are not in the workspace' },
          { status: 403 }
        )
      }
    }

    // This is a simplified version - you'd need to implement actual Zoom API integration
    // For now, we'll create a placeholder meeting
    const meetingId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
    const joinUrl = `https://zoom.us/j/${meetingId}` // Placeholder
    const startUrl = `https://zoom.us/s/${meetingId}` // Placeholder

    // Get participant names for the topic
    let meetingTopic = topic
    if (!meetingTopic && participants.length > 0) {
      const participantUsers = await prisma.user.findMany({
        where: { id: { in: participants } },
        select: { firstName: true, lastName: true },
      })

      const names = participantUsers.map(u => u.firstName).join(', ')
      meetingTopic = `Chat with ${names}`
    }

    // Create a system message with the Zoom link
    const zoomMessage = {
      type: 'ZOOM_LINK',
      content: `🎥 ${session.user.firstName} started a video call`,
      metadata: {
        zoomMeetingId: meetingId,
        joinUrl,
        startUrl,
        topic: meetingTopic || 'Video Chat',
        createdBy: session.user.id,
        participants,
        createdAt: new Date().toISOString(),
      },
    }

    return NextResponse.json({
      meetingId,
      joinUrl,
      startUrl,
      topic: meetingTopic || 'Video Chat',
      message: zoomMessage,
    })
  } catch (error) {
    console.error('Error creating Zoom meeting:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
