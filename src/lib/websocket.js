// lib/websocket.js - CommonJS format for compatibility with server.js
const { WebSocketServer } = require('ws')
const { parse } = require('url')
const { verify } = require('jsonwebtoken')

// Import Prisma client from CommonJS database file
const { prisma } = require('./database-cjs')

const connections = new Map() // userId -> WebSocket connection
const userStatus = new Map() // userId -> { isOnline: boolean, lastSeen: Date }
let heartbeatInterval = null

function setupWebSocketServer(server) {
  console.log('🔌 Initializing WebSocket server...')

  const wss = new WebSocketServer({
    server,
    path: '/api/chat/ws',
  })

  wss.on('connection', async (ws, request) => {
    console.log('👋 New WebSocket connection attempt')

    try {
      const { query } = parse(request.url, true)
      const token = query.token

      if (!token) {
        console.log('❌ No token provided')
        ws.close(1008, 'Authentication required')
        return
      }

      // Verify JWT token
      const decoded = verify(token, process.env.NEXTAUTH_SECRET)
      const userId = decoded.sub || decoded.userId

      if (!userId) {
        console.log('❌ Invalid token, no userId')
        ws.close(1008, 'Invalid token')
        return
      }

      // Store connection and mark user as online
      connections.set(userId, ws)
      userStatus.set(userId, { isOnline: true, lastSeen: new Date() })

      console.log(`✅ User ${userId} connected (Total: ${connections.size})`)

      // Update user's last active timestamp in database
      try {
        await prisma.user.update({
          where: { id: userId },
          data: { lastActiveAt: new Date() },
        })
      } catch (dbError) {
        console.error('⚠️ Database update error:', dbError.message)
      }

      // Broadcast to workspace members that user is online
      await broadcastUserStatus(userId, 'online')

      // Send connection confirmation with online users
      try {
        const workspaceMembers = await getWorkspaceMembers(userId)
        const onlineMembers = workspaceMembers.filter(
          memberId => userStatus.get(memberId)?.isOnline
        )

        ws.send(
          JSON.stringify({
            type: 'connected',
            data: {
              message: 'WebSocket connection established',
              userId,
              onlineUsers: onlineMembers,
            },
          })
        )
      } catch (error) {
        console.error('⚠️ Error getting workspace members:', error)
      }

      // Handle incoming messages
      ws.on('message', async data => {
        try {
          const message = JSON.parse(data.toString())
          await handleWebSocketMessage(userId, message)
        } catch (error) {
          console.error('❌ Error handling WebSocket message:', error)
          ws.send(
            JSON.stringify({
              type: 'error',
              data: { message: 'Invalid message format' },
            })
          )
        }
      })

      // Handle connection close
      ws.on('close', async () => {
        console.log(`👋 User ${userId} disconnected`)
        connections.delete(userId)
        userStatus.set(userId, { isOnline: false, lastSeen: new Date() })

        // Update database
        try {
          await prisma.user.update({
            where: { id: userId },
            data: { lastActiveAt: new Date() },
          })
        } catch (dbError) {
          console.error('⚠️ Database update error on close:', dbError.message)
        }

        // Broadcast offline status
        await broadcastUserStatus(userId, 'offline')
      })

      // Handle WebSocket errors
      ws.on('error', error => {
        console.error(`❌ WebSocket error for user ${userId}:`, error)
      })
    } catch (error) {
      console.error('❌ WebSocket connection error:', error)
      ws.close(1011, 'Server error')
    }
  })

  // Start heartbeat when server is set up
  startHeartbeat()

  console.log('✅ WebSocket server initialized')
  return wss
}

async function handleWebSocketMessage(userId, message) {
  const { type, payload } = message

  switch (type) {
    case 'typing_start':
      await handleTypingIndicator(userId, payload.receiverId, true)
      break

    case 'typing_stop':
      await handleTypingIndicator(userId, payload.receiverId, false)
      break

    case 'mark_read':
      await markMessageAsRead(userId, payload.messageId)
      break

    case 'add_reaction':
      await addMessageReaction(userId, payload.messageId, payload.emoji)
      break

    case 'remove_reaction':
      await removeMessageReaction(userId, payload.messageId, payload.emoji)
      break

    case 'get_online_users':
      await sendOnlineUsers(userId)
      break

    case 'heartbeat_ack':
      // Update last seen timestamp
      userStatus.set(userId, { isOnline: true, lastSeen: new Date() })
      break

    case 'ping':
      // Simple ping-pong for connection testing
      broadcastToUser(userId, 'pong', { timestamp: new Date().toISOString() })
      break

    default:
      console.log(`❓ Unknown message type: ${type}`)
  }
}

async function handleTypingIndicator(userId, receiverId, isTyping) {
  try {
    // Verify both users are in same workspace
    const areInSameWorkspace = await verifyUsersInSameWorkspace(userId, receiverId)
    if (!areInSameWorkspace) {
      console.log('⚠️ Users not in same workspace for typing indicator')
      return
    }

    // Send typing indicator to receiver
    broadcastToUser(receiverId, 'typing_indicator', {
      userId,
      isTyping,
    })
  } catch (error) {
    console.error('❌ Error handling typing indicator:', error)
  }
}

async function markMessageAsRead(userId, messageId) {
  try {
    // Get the message and verify permissions
    const message = await prisma.message.findFirst({
      where: {
        id: messageId,
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
    })

    if (!message) {
      console.log('⚠️ Message not found or user not authorized')
      return
    }

    // Update message as read if the current user is the receiver
    if (message.receiverId === userId && !message.isRead) {
      const updatedMessage = await prisma.message.update({
        where: { id: messageId },
        data: { isRead: true },
        include: {
          sender: {
            select: { id: true, firstName: true, lastName: true, avatar: true },
          },
          receiver: {
            select: { id: true, firstName: true, lastName: true, avatar: true },
          },
          reactions: {
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
          },
        },
      })

      // Notify sender that message was read
      if (message.senderId !== userId) {
        broadcastToUser(message.senderId, 'message_read', {
          messageId,
          readBy: userId,
          message: updatedMessage,
        })
      }

      broadcastToUser(userId, 'message_updated', updatedMessage)
    }
  } catch (error) {
    console.error('❌ Error marking message as read:', error)
  }
}

async function addMessageReaction(userId, messageId, emoji) {
  try {
    console.log('⚠️ Message reactions require MessageReaction table in your schema')
    console.log('Add this to your schema if you want reactions:')
    console.log(`
      model MessageReaction {
        id        String   @id @default(cuid())
        messageId String
        userId    String
        emoji     String
        createdAt DateTime @default(now())

        message Message @relation(fields: [messageId], references: [id], onDelete: Cascade)
        user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)

        @@unique([messageId, userId, emoji])
        @@map("message_reactions")
      }
    `)

    // Uncomment this when you add the MessageReaction table:
    /*
    const reaction = await prisma.messageReaction.create({
      data: {
        messageId,
        userId,
        emoji
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true }
        }
      }
    })

    // Get updated message with all reactions
    const updatedMessage = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        receiver: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        reactions: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } }
          }
        }
      }
    })

    // Broadcast the updated message
    broadcastToUser(updatedMessage.senderId, 'message_updated', updatedMessage)
    if (updatedMessage.receiverId && updatedMessage.receiverId !== updatedMessage.senderId) {
      broadcastToUser(updatedMessage.receiverId, 'message_updated', updatedMessage)
    }
    */
  } catch (error) {
    console.error('❌ Error adding message reaction:', error)
  }
}

async function removeMessageReaction(userId, messageId, emoji) {
  try {
    console.log('⚠️ Message reaction removal requires MessageReaction table')

    // Uncomment when you have the table:
    /*
    await prisma.messageReaction.deleteMany({
      where: {
        messageId,
        userId,
        emoji
      }
    })

    // Get updated message and broadcast
    const updatedMessage = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        receiver: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        reactions: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } }
          }
        }
      }
    })

    broadcastToUser(updatedMessage.senderId, 'message_updated', updatedMessage)
    if (updatedMessage.receiverId && updatedMessage.receiverId !== updatedMessage.senderId) {
      broadcastToUser(updatedMessage.receiverId, 'message_updated', updatedMessage)
    }
    */
  } catch (error) {
    console.error('❌ Error removing message reaction:', error)
  }
}

async function sendOnlineUsers(userId) {
  try {
    const workspaceMembers = await getWorkspaceMembers(userId)
    const onlineMembers = workspaceMembers.filter(
      memberId => userStatus.get(memberId)?.isOnline && memberId !== userId
    )

    broadcastToUser(userId, 'online_users', { onlineUsers: onlineMembers })
  } catch (error) {
    console.error('❌ Error sending online users:', error)
  }
}

async function getWorkspaceMembers(userId) {
  try {
    // Get user's workspace
    const userWorkspace = await prisma.workspaceMember.findFirst({
      where: { userId, isActive: true },
      select: { workspaceId: true },
    })

    if (!userWorkspace) return []

    // Get all members in the same workspace
    const members = await prisma.workspaceMember.findMany({
      where: {
        workspaceId: userWorkspace.workspaceId,
        isActive: true,
      },
      select: { userId: true },
    })

    return members.map(m => m.userId)
  } catch (error) {
    console.error('❌ Error getting workspace members:', error)
    return []
  }
}

async function verifyUsersInSameWorkspace(userId1, userId2) {
  try {
    const user1Workspace = await prisma.workspaceMember.findFirst({
      where: { userId: userId1, isActive: true },
      select: { workspaceId: true },
    })

    const user2Workspace = await prisma.workspaceMember.findFirst({
      where: { userId: userId2, isActive: true },
      select: { workspaceId: true },
    })

    return user1Workspace?.workspaceId === user2Workspace?.workspaceId
  } catch (error) {
    console.error('❌ Error verifying workspace membership:', error)
    return false
  }
}

async function broadcastUserStatus(userId, status) {
  try {
    const workspaceMembers = await getWorkspaceMembers(userId)

    const statusMessage = {
      type: status === 'online' ? 'user_online' : 'user_offline',
      data: { userId },
    }

    // Broadcast to all workspace members except the user themselves
    for (const memberId of workspaceMembers) {
      if (memberId !== userId) {
        broadcastToUser(memberId, statusMessage.type, statusMessage.data)
      }
    }
  } catch (error) {
    console.error('❌ Error broadcasting user status:', error)
  }
}

// Export broadcast functions for use in API routes
function broadcastToUser(userId, type, data) {
  const ws = connections.get(userId)
  if (ws && ws.readyState === 1) {
    // WebSocket.OPEN
    try {
      ws.send(JSON.stringify({ type, data }))
      console.log(`📡 Broadcasted ${type} to user ${userId}`)
    } catch (error) {
      console.error(`❌ Error broadcasting to user ${userId}:`, error)
    }
  } else {
    console.log(`📡 Cannot broadcast ${type} to user ${userId}: not connected`)
  }
}

function broadcastToUsers(userIds, type, data) {
  const message = JSON.stringify({ type, data })

  for (const userId of userIds) {
    const ws = connections.get(userId)
    if (ws && ws.readyState === 1) {
      try {
        ws.send(message)
      } catch (error) {
        console.error(`❌ Error broadcasting to user ${userId}:`, error)
      }
    }
  }
}

// Heartbeat to keep connections alive and track online status
function startHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval)
  }

  heartbeatInterval = setInterval(() => {
    const now = new Date()
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)

    // Check for inactive users
    for (const [userId, status] of userStatus.entries()) {
      if (status.isOnline && status.lastSeen < fiveMinutesAgo) {
        // Mark user as offline
        userStatus.set(userId, { isOnline: false, lastSeen: status.lastSeen })
        broadcastUserStatus(userId, 'offline')
      }
    }

    // Send heartbeat to all connected users
    for (const [userId, ws] of connections.entries()) {
      if (ws.readyState === 1) {
        try {
          ws.send(JSON.stringify({ type: 'heartbeat' }))
        } catch (error) {
          console.error(`❌ Error sending heartbeat to ${userId}:`, error)
          // Remove broken connection
          connections.delete(userId)
        }
      }
    }
  }, 30000) // Every 30 seconds

  console.log('💓 WebSocket heartbeat started')
}

// Export connection info for monitoring
function getConnectionStats() {
  const totalConnections = connections.size
  const onlineUsers = Array.from(userStatus.values()).filter(s => s.isOnline).length

  return {
    totalConnections,
    onlineUsers,
    connectedUsers: Array.from(connections.keys()),
  }
}

// CommonJS exports
module.exports = {
  setupWebSocketServer,
  broadcastToUser,
  broadcastToUsers,
  getConnectionStats,
  connections,
  userStatus,
}
