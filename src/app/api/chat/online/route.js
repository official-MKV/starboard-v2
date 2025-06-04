export async function GET(request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const workspaceContext = await WorkspaceContext.getWorkspaceContext(request, session.user.id)
    if (!workspaceContext) {
      return NextResponse.json({ error: 'Workspace context required' }, { status: 403 })
    }

    // This would typically be stored in Redis or memory
    // For now, return users active in last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)

    const onlineUsers = await prisma.user.findMany({
      where: {
        lastActiveAt: { gte: fiveMinutesAgo },
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
        avatar: true,
      },
    })

    return NextResponse.json({ onlineUsers })
  } catch (error) {
    console.error('Error fetching online users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Update user's last active timestamp
export async function PATCH(request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { lastActiveAt: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating last active:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
