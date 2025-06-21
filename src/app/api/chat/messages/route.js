import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/database'
import { WorkspaceContext } from '@/lib/workspace-context'

const broadcastToUser =
  global.broadcastToUser ||
  (() => {
    console.log('WebSocket not available - message saved but not broadcasted')
  })

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
    const limit = parseInt(searchParams.get('limit') || '1000')

    if (!receiverId) {
      return NextResponse.json({ error: 'Receiver ID required' }, { status: 400 })
    }
    console.log(receiverId)
    console.log(workspaceContext.workspaceId)
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
    console.error('Error fetching messages:', error)
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

    try {
      broadcastToUser(receiverId, 'new_message', message)
      broadcastToUser(session.user.id, 'new_message', message)
    } catch (wsError) {
      console.error('WebSocket broadcast failed (message still saved):', wsError)
    }

    return NextResponse.json({ message }, { status: 201 })
  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json(
      {
        error: 'Failed to send message',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    )
  }
}
