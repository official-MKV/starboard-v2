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

    const { resourceId, receiverId, message } = await request.json()

    if (!resourceId || !receiverId) {
      return NextResponse.json({ error: 'Resource ID and receiver ID required' }, { status: 400 })
    }

    // Verify receiver is in same workspace
    const receiverWorkspace = await prisma.workspaceMember.findFirst({
      where: {
        userId: receiverId,
        workspaceId: workspaceContext.workspaceId,
        isActive: true,
      },
    })

    if (!receiverWorkspace) {
      return NextResponse.json({ error: 'Receiver not in workspace' }, { status: 403 })
    }

    // Verify resource exists and user has access
    const resource = await prisma.resource.findFirst({
      where: {
        id: resourceId,
        workspaceId: workspaceContext.workspaceId,
        OR: [
          { isPublic: true },
          { creatorId: session.user.id },
          {
            access: {
              some: { userId: session.user.id },
            },
          },
        ],
      },
    })

    if (!resource) {
      return NextResponse.json({ error: 'Resource not found or access denied' }, { status: 404 })
    }

    // Create the resource share message
    const shareMessage = {
      type: 'RESOURCE_SHARE',
      content: message || `📎 ${session.user.firstName} shared a resource`,
      metadata: {
        resourceId: resource.id,
        resourceTitle: resource.title,
        resourceType: resource.type,
        resourceUrl: resource.fileUrl,
        fileName: resource.fileName,
        fileSize: resource.fileSize,
        sharedBy: session.user.id,
        description: resource.description,
      },
    }

    return NextResponse.json({
      resource,
      message: shareMessage,
    })
  } catch (error) {
    console.error('Error sharing resource:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
