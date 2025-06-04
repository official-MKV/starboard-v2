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

    const { eventId, receiverId, message } = await request.json()

    // Verify event exists in workspace
    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        workspaceId: workspaceContext.workspaceId,
      },
      include: {
        creator: {
          select: { firstName: true, lastName: true },
        },
      },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Create event share message
    const shareMessage = {
      type: 'EVENT_INVITE',
      content: message || `📅 ${session.user.firstName} shared an event`,
      metadata: {
        eventId: event.id,
        eventTitle: event.title,
        eventType: event.type,
        startDate: event.startDate,
        endDate: event.endDate,
        location: event.location,
        virtualLink: event.virtualLink,
        sharedBy: session.user.id,
        creator: event.creator,
      },
    }

    return NextResponse.json({
      event,
      message: shareMessage,
    })
  } catch (error) {
    console.error('Error sharing event:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
