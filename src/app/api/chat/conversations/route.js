// app/api/chat/conversations/route.js - Fixed for your schema
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

    console.log('📞 Loading conversations for user:', session.user.id)

    // Get all unique users that the current user has exchanged messages with
    // Using the correct table name "messages" and column names from your schema
    const conversations = await prisma.$queryRaw`
      SELECT DISTINCT
        CASE
          WHEN m."senderId" = ${session.user.id} THEN m."receiverId"
          ELSE m."senderId"
        END as other_user_id,
        MAX(m."createdAt") as last_message_time,
        COUNT(*) as message_count
      FROM "messages" m
      WHERE
        (m."senderId" = ${session.user.id} OR m."receiverId" = ${session.user.id})
        AND m."isDeleted" = false
        AND m."workspaceId" = ${workspaceContext.workspaceId}
        AND m."groupId" IS NULL
      GROUP BY other_user_id
      ORDER BY last_message_time DESC
      LIMIT 20
    `

    console.log(`📊 Found ${conversations.length} conversation threads`)

    // Get user details for each conversation
    const conversationUsers = await Promise.all(
      conversations.map(async conv => {
        try {
          // Get user details
          const user = await prisma.user.findUnique({
            where: { id: conv.other_user_id },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
              jobTitle: true,
              isActive: true,
              lastActiveAt: true,
            },
          })

          if (!user) {
            console.log(`⚠️ User not found: ${conv.other_user_id}`)
            return null
          }

          // Get the latest message between these users
          const latestMessage = await prisma.message.findFirst({
            where: {
              OR: [
                { senderId: session.user.id, receiverId: conv.other_user_id },
                { senderId: conv.other_user_id, receiverId: session.user.id },
              ],
              isDeleted: false,
              workspaceId: workspaceContext.workspaceId,
            },
            orderBy: { createdAt: 'desc' },
            select: {
              content: true,
              type: true,
              createdAt: true,
              senderId: true,
            },
          })

          // Format last message for display
          let lastMessage = 'No messages yet'
          if (latestMessage) {
            if (latestMessage.type === 'IMAGE') {
              lastMessage = '📷 Image'
            } else if (latestMessage.type === 'FILE') {
              lastMessage = '📎 File'
            } else if (latestMessage.type === 'ZOOM_LINK') {
              lastMessage = '🎥 Video call'
            } else if (latestMessage.content) {
              lastMessage =
                latestMessage.content.length > 50
                  ? `${latestMessage.content.substring(0, 50)}...`
                  : latestMessage.content
            }
          }

          return {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
            jobTitle: user.jobTitle,
            lastMessage,
            lastMessageTime: conv.last_message_time,
            messageCount: Number(conv.message_count),
            isActive: user.isActive,
            lastActiveAt: user.lastActiveAt,
          }
        } catch (error) {
          console.error(`❌ Error processing conversation for user ${conv.other_user_id}:`, error)
          return null
        }
      })
    )

    // Filter out null results and sort by last message time
    const validConversations = conversationUsers
      .filter(conv => conv !== null)
      .sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime))

    console.log(`✅ Returning ${validConversations.length} valid conversations`)

    return NextResponse.json({
      conversations: validConversations,
    })
  } catch (error) {
    console.error('❌ Error fetching conversations:', error)

    // Fallback: Try using Prisma queries instead of raw SQL
    try {
      console.log('🔄 Attempting fallback method...')

      const messages = await prisma.message.findMany({
        where: {
          OR: [{ senderId: session.user.id }, { receiverId: session.user.id }],
          isDeleted: false,
          workspaceId: workspaceContext.workspaceId,
          groupId: null,
        },
        include: {
          sender: {
            select: { id: true, firstName: true, lastName: true, avatar: true, jobTitle: true },
          },
          receiver: {
            select: { id: true, firstName: true, lastName: true, avatar: true, jobTitle: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 100, // Get recent messages to build conversation list
      })

      // Group messages by conversation partner
      const conversationMap = new Map()

      for (const message of messages) {
        const otherUserId =
          message.senderId === session.user.id ? message.receiverId : message.senderId

        if (!conversationMap.has(otherUserId)) {
          const otherUser = message.senderId === session.user.id ? message.receiver : message.sender

          if (otherUser) {
            let lastMessage = message.content
            if (message.type === 'IMAGE') lastMessage = '📷 Image'
            else if (message.type === 'FILE') lastMessage = '📎 File'
            else if (message.type === 'ZOOM_LINK') lastMessage = '🎥 Video call'
            else if (lastMessage && lastMessage.length > 50) {
              lastMessage = `${lastMessage.substring(0, 50)}...`
            }

            conversationMap.set(otherUserId, {
              id: otherUser.id,
              firstName: otherUser.firstName,
              lastName: otherUser.lastName,
              avatar: otherUser.avatar,
              jobTitle: otherUser.jobTitle,
              lastMessage,
              lastMessageTime: message.createdAt,
            })
          }
        }
      }

      const fallbackConversations = Array.from(conversationMap.values()).sort(
        (a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime)
      )

      console.log(`✅ Fallback method returned ${fallbackConversations.length} conversations`)

      return NextResponse.json({
        conversations: fallbackConversations,
      })
    } catch (fallbackError) {
      console.error('❌ Fallback method also failed:', fallbackError)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
}
