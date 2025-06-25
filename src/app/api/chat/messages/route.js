import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/database'
import { WorkspaceContext } from '@/lib/workspace-context'

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

    const { searchParams } = new URL(request.url)
    const receiverId = searchParams.get('receiverId')
    const cursor = searchParams.get('cursor')
    const limit = parseInt(searchParams.get('limit') || '100')

    if (!receiverId) {
      return NextResponse.json({ error: 'Receiver ID required' }, { status: 400 })
    }

    const receiverWorkspace = await prisma.workspaceMember.findFirst({
      where: {
        userId: receiverId,
        workspaceId: workspaceContext.workspaceId,
        isActive: true,
      },
    })

    if (!receiverWorkspace) {
      return NextResponse.json({ error: 'User not in workspace' }, { status: 403 })
    }

    const where = {
      isDeleted: false,
      workspaceId: workspaceContext.workspaceId,
      OR: [
        { senderId: session.user.id, receiverId },
        { senderId: receiverId, receiverId: session.user.id },
      ],
    }

    if (cursor) {
      where.createdAt = { lt: new Date(cursor) }
    }

    const messages = await prisma.message.findMany({
      where,
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
        receiver: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
        _count: {
          select: { replies: true },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    })

    return NextResponse.json({
      messages: messages,
      hasMore: messages.length === limit,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to load messages',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    )
  }
}

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

    const {
      receiverId,
      content,
      type = 'TEXT',
      fileUrl,
      fileName,
      fileSize,
      mimeType,
      thumbnailUrl,
      metadata = {},
      parentId,
    } = await request.json()

    if (!receiverId) {
      return NextResponse.json({ error: 'Receiver ID required' }, { status: 400 })
    }

    if (!content && !fileUrl) {
      return NextResponse.json({ error: 'Message content or file required' }, { status: 400 })
    }

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

    const message = await prisma.message.create({
      data: {
        receiverId,
        senderId: session.user.id,
        workspaceId: workspaceContext.workspaceId,
        content,
        type,
        fileUrl,
        fileName,
        fileSize,
        mimeType,
        thumbnailUrl,
        metadata,
        parentId,
      },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
        receiver: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
        _count: {
          select: { replies: true },
        },
      },
    })

    return NextResponse.json({ message }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to send message',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const messageId = searchParams.get('messageId')

    if (!messageId) {
      return NextResponse.json({ error: 'Message ID required' }, { status: 400 })
    }

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: { senderId: true },
    })

    if (!message || message.senderId !== session.user.id) {
      return NextResponse.json({ error: 'Message not found or unauthorized' }, { status: 404 })
    }

    await prisma.message.update({
      where: { id: messageId },
      data: { isDeleted: true, deletedAt: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to delete message',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    )
  }
}

export async function PUT(request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { messageId, content } = await request.json()

    if (!messageId || !content) {
      return NextResponse.json({ error: 'Message ID and content required' }, { status: 400 })
    }

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: { senderId: true, createdAt: true },
    })

    if (!message || message.senderId !== session.user.id) {
      return NextResponse.json({ error: 'Message not found or unauthorized' }, { status: 404 })
    }

    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000)
    if (message.createdAt < fifteenMinutesAgo) {
      return NextResponse.json({ error: 'Message too old to edit' }, { status: 400 })
    }

    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: {
        content,
        isEdited: true,
        editedAt: new Date(),
      },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
        receiver: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
        _count: {
          select: { replies: true },
        },
      },
    })

    return NextResponse.json({ message: updatedMessage })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to edit message',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    )
  }
}
