// lib/websocket.js - WebSocket server for direct messaging
import { WebSocketServer } from 'ws'
import { parse } from 'url'
import { verify } from 'jsonwebtoken'
import { prisma } from './database'

const connections = new Map() // userId -> WebSocket connection
const userStatus = new Map() // userId -> { isOnline: boolean, lastSeen: Date }

export function setupWebSocketServer(server) {
  const wss = new WebSocketServer({
    server,
    path: '/api/chat/ws',
  })

  wss.on('connection', async (ws, request) => {
    try {
      const { query } = parse(request.url, true)
      const token = query.token

      if (!token) {
        ws.close(1008, 'Authentication required')
        return
      }

      // Verify JWT token (adjust based on your auth implementation)
      const decoded = verify(token, process.env.NEXTAUTH_SECRET)
      const userId = decoded.sub || decoded.userId

      if (!userId) {
        ws.close(1008, 'Invalid token')
        return
      }

      // Store connection and mark user as online
      connections.set(userId, ws)
      userStatus.set(userId, { isOnline: true, lastSeen: new Date() })

      console.log(`User ${userId} connected to WebSocket`)

      // Update user's last active timestamp in database
      await prisma.user
        .update({
          where: { id: userId },
          data: { lastActiveAt: new Date() },
        })
        .catch(console.error)

      // Broadcast to workspace members that user is online
      broadcastUserStatus(userId, 'online')

      // Handle incoming messages
      ws.on('message', async data => {
        try {
          const message = JSON.parse(data.toString())
          await handleWebSocketMessage(userId, message)
        } catch (error) {
          console.error('Error handling WebSocket message:', error)
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }))
        }
      })

      // Handle connection close
      ws.on('close', async () => {
        console.log(`User ${userId} disconnected from WebSocket`)
        connections.delete(userId)
        userStatus.set(userId, { isOnline: false, lastSeen: new Date() })

        // Update database
        await prisma.user
          .update({
            where: { id: userId },
            data: { lastActiveAt: new Date() },
          })
          .catch(console.error)

        // Broadcast offline status
        broadcastUserStatus(userId, 'offline')
      })

      // Send connection confirmation with online users
      const workspaceMembers = await getWorkspaceMembers(userId)
      const onlineMembers = workspaceMembers.filter(memberId => userStatus.get(memberId)?.isOnline)

      ws.send(
        JSON.stringify({
          type: 'connected',
          message: 'WebSocket connection established',
          userId,
          onlineUsers: onlineMembers,
        })
      )
    } catch (error) {
      console.error('WebSocket connection error:', error)
      ws.close(1011, 'Server error')
    }
  })

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

    case 'get_online_users':
      await sendOnlineUsers(userId)
      break

    case 'heartbeat':
      // Update last seen timestamp
      userStatus.set(userId, { isOnline: true, lastSeen: new Date() })
      const ws = connections.get(userId)
      if (ws) {
        ws.send(JSON.stringify({ type: 'heartbeat_ack' }))
      }
      break

    default:
      console.log(`Unknown message type: ${type}`)
  }
}

async function handleTypingIndicator(userId, receiverId, isTyping) {
  try {
    // Verify both users are in same workspace
    const areInSameWorkspace = await verifyUsersInSameWorkspace(userId, receiverId)
    if (!areInSameWorkspace) return

    // Send typing indicator to receiver
    broadcastToUser(receiverId, 'typing_indicator', {
      userId,
      isTyping,
    })
  } catch (error) {
    console.error('Error handling typing indicator:', error)
  }
}

async function markMessageAsRead(userId, messageId) {
  try {
    // Create read receipt
    await prisma.messageReadReceipt.upsert({
      where: {
        messageId_userId: {
          messageId,
          userId,
        },
      },
      create: {
        messageId,
        userId,
      },
      update: {
        readAt: new Date(),
      },
    })

    // Get message details to notify sender
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: { senderId: true, receiverId: true },
    })

    if (message) {
      // Notify sender that message was read
      broadcastToUser(message.senderId, 'message_read', {
        messageId,
        readBy: userId,
      })
    }
  } catch (error) {
    console.error('Error marking message as read:', error)
  }
}

async function sendOnlineUsers(userId) {
  try {
    const workspaceMembers = await getWorkspaceMembers(userId)
    const onlineMembers = workspaceMembers.filter(
      memberId => userStatus.get(memberId)?.isOnline && memberId !== userId
    )

    const ws = connections.get(userId)
    if (ws) {
      ws.send(
        JSON.stringify({
          type: 'online_users',
          data: { onlineUsers: onlineMembers },
        })
      )
    }
  } catch (error) {
    console.error('Error sending online users:', error)
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
    console.error('Error getting workspace members:', error)
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
    console.error('Error verifying workspace membership:', error)
    return false
  }
}

async function broadcastUserStatus(userId, status) {
  try {
    const workspaceMembers = await getWorkspaceMembers(userId)

    const statusMessage = JSON.stringify({
      type: status === 'online' ? 'user_online' : 'user_offline',
      data: { userId },
    })

    // Broadcast to all workspace members except the user themselves
    for (const memberId of workspaceMembers) {
      if (memberId !== userId) {
        const ws = connections.get(memberId)
        if (ws && ws.readyState === 1) {
          // WebSocket.OPEN
          ws.send(statusMessage)
        }
      }
    }
  } catch (error) {
    console.error('Error broadcasting user status:', error)
  }
}

// Broadcast functions
export function broadcastToUser(userId, type, data) {
  const ws = connections.get(userId)
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify({ type, data }))
  }
}

export function broadcastToUsers(userIds, type, data) {
  const message = JSON.stringify({ type, data })

  for (const userId of userIds) {
    const ws = connections.get(userId)
    if (ws && ws.readyState === 1) {
      ws.send(message)
    }
  }
}

// Legacy channel broadcast for backward compatibility
export function broadcastToChannel(channelId, type, data, excludeUserId = null) {
  // This is kept for backward compatibility but not used in direct messaging
  console.log('Channel broadcast called but not implemented in direct messaging mode')
}

// Heartbeat to keep connections alive and track online status
function startHeartbeat() {
  setInterval(() => {
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
        ws.send(JSON.stringify({ type: 'heartbeat' }))
      }
    }
  }, 30000) // Every 30 seconds
}

// Cleanup old typing indicators and offline users
export async function cleanupExpiredData() {
  try {
    // Clean up typing indicators older than 10 seconds
    await prisma.typingIndicator.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    })

    // Clean up old user status entries
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    for (const [userId, status] of userStatus.entries()) {
      if (!status.isOnline && status.lastSeen < oneHourAgo) {
        userStatus.delete(userId)
      }
    }
  } catch (error) {
    console.error('Error cleaning up expired data:', error)
  }
}

// Get current online users for a workspace
export async function getOnlineUsersForWorkspace(workspaceId) {
  try {
    const workspaceMembers = await prisma.workspaceMember.findMany({
      where: {
        workspaceId,
        isActive: true,
      },
      select: { userId: true },
    })

    const onlineUsers = workspaceMembers
      .map(m => m.userId)
      .filter(userId => userStatus.get(userId)?.isOnline)

    return onlineUsers
  } catch (error) {
    console.error('Error getting online users for workspace:', error)
    return []
  }
}

// Start background processes
startHeartbeat()
setInterval(cleanupExpiredData, 60000) // Run cleanup every minute

// Export connection info for monitoring
export function getConnectionStats() {
  const totalConnections = connections.size
  const onlineUsers = Array.from(userStatus.values()).filter(s => s.isOnline).length

  return {
    totalConnections,
    onlineUsers,
    connectedUsers: Array.from(connections.keys()),
  }
}
