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

    const members = await prisma.workspaceMember.findMany({
      where: {
        workspaceId: workspaceContext.workspaceId,
        isActive: true,
        userId: { not: session.user.id }, // Exclude current user
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
            jobTitle: true,
            isActive: true,
            lastActiveAt: true,
          },
        },
        role: {
          select: {
            name: true,
            color: true,
          },
        },
      },
      orderBy: [{ user: { isActive: 'desc' } }, { user: { firstName: 'asc' } }],
    })

    return NextResponse.json({ members })
  } catch (error) {
    console.error('Error fetching workspace members:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
