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

    // Get latest message for each conversation
    const conversations = await prisma.$queryRaw`
        SELECT
          CASE
            WHEN m.sender_id = ${session.user.id} THEN m.receiver_id
            ELSE m.sender_id
          END as other_user_id,
          MAX(m.created_at) as last_message_time,
          COUNT(*) as message_count
        FROM chat_messages m
        WHERE (m.sender_id = ${session.user.id} OR m.receiver_id = ${session.user.id})
          AND m.is_deleted = false
          AND m.channel_id IS NULL
        GROUP BY other_user_id
        ORDER BY last_message_time DESC
        LIMIT 20
      `

    // Get user details for each conversation
    const conversationUsers = await Promise.all(
      conversations.map(async conv => {
        const user = await prisma.user.findUnique({
          where: { id: conv.other_user_id },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            isActive: true,
            lastActiveAt: true,
          },
        })

        // Get the latest message
        const latestMessage = await prisma.chatMessage.findFirst({
          where: {
            OR: [
              { senderId: session.user.id, receiverId: conv.other_user_id },
              { senderId: conv.other_user_id, receiverId: session.user.id },
            ],
            isDeleted: false,
          },
          orderBy: { createdAt: 'desc' },
          select: {
            content: true,
            type: true,
            createdAt: true,
            senderId: true,
          },
        })

        return {
          user,
          lastMessage: latestMessage,
          messageCount: conv.message_count,
          lastMessageTime: conv.last_message_time,
        }
      })
    )

    return NextResponse.json({ conversations: conversationUsers })
  } catch (error) {
    console.error('Error fetching conversations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
