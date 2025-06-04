'use effect'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Send,
  Paperclip,
  Image,
  Video,
  Smile,
  MoreVertical,
  Phone,
  Users,
  Hash,
  Search,
  Settings,
} from 'lucide-react'

// Main Chat Interface Component
export default function ChatInterface() {
  const [channels, setChannels] = useState([])
  const [activeChannel, setActiveChannel] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [typingUsers, setTypingUsers] = useState([])
  const [ws, setWs] = useState(null)
  const [user, setUser] = useState(null)
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)

  // Initialize WebSocket connection
  useEffect(() => {
    const initializeChat = async () => {
      // Get user session and workspace
      const sessionResponse = await fetch('/api/auth/session')
      const session = await sessionResponse.json()

      if (!session?.user) return

      setUser(session.user)

      // Load channels
      const channelsResponse = await fetch('/api/chat/channels')
      const channelsData = await channelsResponse.json()
      setChannels(channelsData.channels || [])

      // Connect WebSocket
      const wsUrl = `ws://localhost:3000/api/chat/ws?token=${session.accessToken}`
      const websocket = new WebSocket(wsUrl)

      websocket.onopen = () => {
        console.log('WebSocket connected')
        setWs(websocket)
      }

      websocket.onmessage = event => {
        const message = JSON.parse(event.data)
        handleWebSocketMessage(message)
      }

      websocket.onclose = () => {
        console.log('WebSocket disconnected')
        setWs(null)
      }

      return () => {
        websocket.close()
      }
    }

    initializeChat()
  }, [])

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback(
    message => {
      const { type, data } = message

      switch (type) {
        case 'new_message':
          if (data.channelId === activeChannel?.id) {
            setMessages(prev => [...prev, data])
            scrollToBottom()
          }
          break

        case 'message_updated':
          setMessages(prev => prev.map(msg => (msg.id === data.id ? data : msg)))
          break

        case 'message_deleted':
          setMessages(prev => prev.filter(msg => msg.id !== data.messageId))
          break

        case 'typing_indicator':
          if (data.channelId === activeChannel?.id && data.userId !== user?.id) {
            if (data.isTyping) {
              setTypingUsers(prev => [...prev.filter(id => id !== data.userId), data.userId])
            } else {
              setTypingUsers(prev => prev.filter(id => id !== data.userId))
            }
          }
          break
      }
    },
    [activeChannel, user]
  )

  // Load messages for active channel
  useEffect(() => {
    if (activeChannel && ws) {
      loadMessages(activeChannel.id)

      // Subscribe to channel
      ws.send(
        JSON.stringify({
          type: 'subscribe_channel',
          payload: { channelId: activeChannel.id },
        })
      )
    }
  }, [activeChannel, ws])

  const loadMessages = async channelId => {
    try {
      const response = await fetch(`/api/chat/messages?channelId=${channelId}&limit=50`)
      const data = await response.json()
      setMessages(data.messages || [])
      scrollToBottom()
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeChannel) return

    try {
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: activeChannel.id,
          content: newMessage,
          type: 'TEXT',
        }),
      })

      if (response.ok) {
        setNewMessage('')
        stopTyping()
      }
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const handleKeyPress = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const startTyping = () => {
    if (!isTyping && ws && activeChannel) {
      setIsTyping(true)
      ws.send(
        JSON.stringify({
          type: 'typing_start',
          payload: { channelId: activeChannel.id },
        })
      )
    }
  }

  const stopTyping = useCallback(() => {
    if (isTyping && ws && activeChannel) {
      setIsTyping(false)
      ws.send(
        JSON.stringify({
          type: 'typing_stop',
          payload: { channelId: activeChannel.id },
        })
      )
    }
  }, [isTyping, ws, activeChannel])

  const handleFileUpload = async file => {
    if (!file || !activeChannel) return

    try {
      // Get presigned URL
      const uploadResponse = await fetch('/api/chat/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        }),
      })

      const uploadData = await uploadResponse.json()

      // Upload file to S3
      await fetch(uploadData.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      })

      // Send message with file
      await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: activeChannel.id,
          content: `Shared ${file.name}`,
          type: file.type.startsWith('image/') ? 'IMAGE' : 'FILE',
          fileUrl: uploadData.fileUrl,
          fileName: uploadData.originalName,
          fileSize: file.size,
          mimeType: file.type,
          thumbnailUrl: uploadData.thumbnailUrl,
        }),
      })
    } catch (error) {
      console.error('Error uploading file:', error)
    }
  }

  const createZoomMeeting = async () => {
    if (!activeChannel) return

    try {
      const response = await fetch('/api/chat/zoom/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: `${activeChannel.name} Chat`,
          channelId: activeChannel.id,
        }),
      })

      const zoomData = await response.json()

      // Send zoom link message
      await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: activeChannel.id,
          content: zoomData.message.content,
          type: 'ZOOM_LINK',
          metadata: zoomData.message.metadata,
        }),
      })
    } catch (error) {
      console.error('Error creating Zoom meeting:', error)
    }
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar - Channels */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Channels</h2>
        </div>

        <div className="flex-1 overflow-y-auto">
          {channels.map(channel => (
            <div
              key={channel.id}
              onClick={() => setActiveChannel(channel)}
              className={`p-3 cursor-pointer hover:bg-gray-50 ${
                activeChannel?.id === channel.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
              }`}
            >
              <div className="flex items-center space-x-3">
                <Hash className="w-5 h-5 text-gray-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{channel.name}</p>
                  {channel.description && (
                    <p className="text-xs text-gray-500 truncate">{channel.description}</p>
                  )}
                </div>
                <div className="flex items-center space-x-1">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-500">{channel.members?.length || 0}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeChannel ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Hash className="w-6 h-6 text-gray-400" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{activeChannel.name}</h3>
                    {activeChannel.description && (
                      <p className="text-sm text-gray-500">{activeChannel.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={createZoomMeeting}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                    title="Start Zoom call"
                  >
                    <Video className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                    <Search className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map(message => (
                <MessageComponent key={message.id} message={message} />
              ))}

              {/* Typing Indicators */}
              {typingUsers.length > 0 && (
                <div className="text-sm text-gray-500 italic">
                  {typingUsers.length === 1
                    ? 'Someone is typing...'
                    : `${typingUsers.length} people are typing...`}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                  title="Attach file"
                >
                  <Paperclip className="w-5 h-5" />
                </button>

                <div className="flex-1 relative">
                  <textarea
                    value={newMessage}
                    onChange={e => {
                      setNewMessage(e.target.value)
                      startTyping()
                    }}
                    onKeyDown={handleKeyPress}
                    onBlur={stopTyping}
                    placeholder={`Message #${activeChannel.name}`}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows="1"
                  />
                </div>

                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                hidden
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) handleFileUpload(file)
                }}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Hash className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a channel</h3>
              <p className="text-gray-500">Choose a channel from the sidebar to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Message Component
function MessageComponent({ message }) {
  const formatTime = date => {
    return new Date(date).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const renderMessageContent = () => {
    switch (message.type) {
      case 'IMAGE':
        return (
          <div className="mt-2">
            <img
              src={message.thumbnailUrl || message.fileUrl}
              alt={message.fileName}
              className="max-w-sm rounded-lg cursor-pointer hover:opacity-90"
              onClick={() => window.open(message.fileUrl, '_blank')}
            />
          </div>
        )

      case 'FILE':
        return (
          <div className="mt-2 p-3 bg-gray-50 rounded-lg border">
            <div className="flex items-center space-x-3">
              <Paperclip className="w-5 h-5 text-gray-400" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{message.fileName}</p>
                {message.fileSize && (
                  <p className="text-xs text-gray-500">
                    {(message.fileSize / 1024 / 1024).toFixed(2)} MB
                  </p>
                )}
              </div>
              <button
                onClick={() => window.open(message.fileUrl, '_blank')}
                className="text-blue-500 hover:text-blue-700 text-sm font-medium"
              >
                Download
              </button>
            </div>
          </div>
        )

      case 'ZOOM_LINK':
        return (
          <div className="mt-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <Video className="w-6 h-6 text-blue-500" />
              <div className="flex-1">
                <p className="font-medium text-blue-900">{message.metadata?.topic}</p>
                <p className="text-sm text-blue-700">Zoom meeting ready to join</p>
              </div>
              <button
                onClick={() => window.open(message.metadata?.joinUrl, '_blank')}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
              >
                Join
              </button>
            </div>
          </div>
        )

      case 'RESOURCE_SHARE':
        return (
          <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <Paperclip className="w-5 h-5 text-green-500" />
              <div className="flex-1">
                <p className="font-medium text-green-900">{message.metadata?.resourceTitle}</p>
                <p className="text-sm text-green-700">{message.metadata?.resourceType}</p>
              </div>
              <button
                onClick={() => window.open(message.metadata?.resourceUrl, '_blank')}
                className="text-green-600 hover:text-green-800 text-sm font-medium"
              >
                View
              </button>
            </div>
          </div>
        )

      default:
        return <p className="text-gray-900 whitespace-pre-wrap">{message.content}</p>
    }
  }

  return (
    <div className="flex space-x-3">
      <img
        src={message.sender.avatar || '/default-avatar.png'}
        alt={`${message.sender.firstName} ${message.sender.lastName}`}
        className="w-8 h-8 rounded-full"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-900">
            {message.sender.firstName} {message.sender.lastName}
          </span>
          <span className="text-xs text-gray-500">{formatTime(message.createdAt)}</span>
          {message.isEdited && <span className="text-xs text-gray-400">(edited)</span>}
        </div>
        {renderMessageContent()}

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex space-x-1 mt-1">
            {message.reactions.map(reaction => (
              <span key={reaction.id} className="text-sm bg-gray-100 px-2 py-1 rounded-full">
                {reaction.emoji}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
