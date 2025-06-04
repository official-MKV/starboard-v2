// lib/websocket.js - WebSocket server implementation
import { WebSocketServer } from 'ws'
import { parse } from 'url'
import { verify } from 'jsonwebtoken'
import { prisma } from './database'

const connections = new Map() // userId -> WebSocket connection
const channelSubscriptions = new Map() // channelId -> Set of userIds

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

      // Store connection
      connections.set(userId, ws)

      console.log(`User ${userId} connected to WebSocket`)

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
      ws.on('close', () => {
        console.log(`User ${userId} disconnected from WebSocket`)
        connections.delete(userId)

        // Remove from all channel subscriptions
        for (const [channelId, subscribers] of channelSubscriptions.entries()) {
          subscribers.delete(userId)
          if (subscribers.size === 0) {
            channelSubscriptions.delete(channelId)
          }
        }
      })

      // Send connection confirmation
      ws.send(
        JSON.stringify({
          type: 'connected',
          message: 'WebSocket connection established',
          userId,
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
    case 'subscribe_channel':
      await subscribeToChannel(userId, payload.channelId)
      break

    case 'unsubscribe_channel':
      unsubscribeFromChannel(userId, payload.channelId)
      break

    case 'typing_start':
      await handleTypingIndicator(userId, payload, true)
      break

    case 'typing_stop':
      await handleTypingIndicator(userId, payload, false)
      break

    case 'mark_read':
      await markMessageAsRead(userId, payload.messageId)
      break

    default:
      console.log(`Unknown message type: ${type}`)
  }
}

async function subscribeToChannel(userId, channelId) {
  try {
    // Verify user has access to channel
    const membership = await prisma.channelMember.findFirst({
      where: {
        channelId,
        userId,
      },
    })

    if (!membership) {
      const ws = connections.get(userId)
      if (ws) {
        ws.send(
          JSON.stringify({
            type: 'error',
            message: 'Not a member of this channel',
          })
        )
      }
      return
    }

    // Add to channel subscription
    if (!channelSubscriptions.has(channelId)) {
      channelSubscriptions.set(channelId, new Set())
    }
    channelSubscriptions.get(channelId).add(userId)

    // Confirm subscription
    const ws = connections.get(userId)
    if (ws) {
      ws.send(
        JSON.stringify({
          type: 'channel_subscribed',
          channelId,
        })
      )
    }

    console.log(`User ${userId} subscribed to channel ${channelId}`)
  } catch (error) {
    console.error('Error subscribing to channel:', error)
  }
}

function unsubscribeFromChannel(userId, channelId) {
  const subscribers = channelSubscriptions.get(channelId)
  if (subscribers) {
    subscribers.delete(userId)
    if (subscribers.size === 0) {
      channelSubscriptions.delete(channelId)
    }
  }

  const ws = connections.get(userId)
  if (ws) {
    ws.send(
      JSON.stringify({
        type: 'channel_unsubscribed',
        channelId,
      })
    )
  }
}

async function handleTypingIndicator(userId, payload, isTyping) {
  const { channelId } = payload

  try {
    if (isTyping) {
      // Create or update typing indicator
      await prisma.typingIndicator.upsert({
        where: {
          channelId_userId: {
            channelId,
            userId,
          },
        },
        create: {
          channelId,
          userId,
          isTyping: true,
          expiresAt: new Date(Date.now() + 10000), // 10 seconds
        },
        update: {
          isTyping: true,
          expiresAt: new Date(Date.now() + 10000),
        },
      })
    } else {
      // Remove typing indicator
      await prisma.typingIndicator.deleteMany({
        where: {
          channelId,
          userId,
        },
      })
    }

    // Broadcast typing status to channel members
    broadcastToChannel(
      channelId,
      'typing_indicator',
      {
        userId,
        channelId,
        isTyping,
      },
      userId
    ) // Exclude the typing user
  } catch (error) {
    console.error('Error handling typing indicator:', error)
  }
}

async function markMessageAsRead(userId, messageId) {
  try {
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

    // Get message details to broadcast read receipt
    const message = await prisma.chatMessage.findUnique({
      where: { id: messageId },
      select: { channelId: true, senderId: true },
    })

    if (message) {
      // Notify sender that message was read
      if (message.channelId) {
        broadcastToChannel(message.channelId, 'message_read', {
          messageId,
          readBy: userId,
        })
      } else {
        // For direct messages, notify sender
        broadcastToUser(message.senderId, 'message_read', {
          messageId,
          readBy: userId,
        })
      }
    }
  } catch (error) {
    console.error('Error marking message as read:', error)
  }
}

// Broadcast functions
export function broadcastToChannel(channelId, type, data, excludeUserId = null) {
  const subscribers = channelSubscriptions.get(channelId)
  if (!subscribers) return

  const message = JSON.stringify({ type, data })

  for (const userId of subscribers) {
    if (userId === excludeUserId) continue

    const ws = connections.get(userId)
    if (ws && ws.readyState === 1) {
      // WebSocket.OPEN
      ws.send(message)
    }
  }
}

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

// Cleanup expired typing indicators (run this periodically)
export async function cleanupTypingIndicators() {
  try {
    await prisma.typingIndicator.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    })
  } catch (error) {
    console.error('Error cleaning up typing indicators:', error)
  }
}

// Run cleanup every 30 seconds
setInterval(cleanupTypingIndicators, 30000)
