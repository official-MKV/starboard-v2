'use client'
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
  Search,
  Settings,
  Plus,
  Circle,
} from 'lucide-react'

// Main Chat Interface Component
export default function ChatInterface() {
  const [workspaceMembers, setWorkspaceMembers] = useState([])
  const [activeConversation, setActiveConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [typingUsers, setTypingUsers] = useState([])
  const [ws, setWs] = useState(null)
  const [user, setUser] = useState(null)
  const [onlineUsers, setOnlineUsers] = useState(new Set())
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Initialize WebSocket connection
  useEffect(() => {
    const initializeChat = async () => {
      // Get user session and workspace
      const sessionResponse = await fetch('/api/auth/session')
      const session = await sessionResponse.json()

      if (!session?.user) return

      setUser(session.user)

      // Load workspace members
      const membersResponse = await fetch('/api/workspaces/members')
      const membersData = await membersResponse.json()
      setWorkspaceMembers(membersData.members || [])

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
          // Only show if it's from current conversation
          if (isMessageFromActiveConversation(data)) {
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
          if (data.userId === activeConversation?.id && data.userId !== user?.id) {
            if (data.isTyping) {
              setTypingUsers(prev => [...prev.filter(id => id !== data.userId), data.userId])
            } else {
              setTypingUsers(prev => prev.filter(id => id !== data.userId))
            }
          }
          break

        case 'user_online':
          setOnlineUsers(prev => new Set([...prev, data.userId]))
          break

        case 'user_offline':
          setOnlineUsers(prev => {
            const newSet = new Set(prev)
            newSet.delete(data.userId)
            return newSet
          })
          break
      }
    },
    [activeConversation, user]
  )

  const isMessageFromActiveConversation = message => {
    if (!activeConversation) return false

    return (
      (message.senderId === user?.id && message.receiverId === activeConversation.id) ||
      (message.senderId === activeConversation.id && message.receiverId === user?.id)
    )
  }

  // Load messages for active conversation
  useEffect(() => {
    if (activeConversation && ws) {
      loadMessages(activeConversation.id)
    }
  }, [activeConversation, ws])

  const loadMessages = async otherUserId => {
    try {
      const response = await fetch(`/api/chat/messages?receiverId=${otherUserId}&limit=50`)
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
    if (!newMessage.trim() || !activeConversation) return

    try {
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: activeConversation.id,
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
    if (!isTyping && ws && activeConversation) {
      setIsTyping(true)
      ws.send(
        JSON.stringify({
          type: 'typing_start',
          payload: { receiverId: activeConversation.id },
        })
      )
    }
  }

  const stopTyping = useCallback(() => {
    if (isTyping && ws && activeConversation) {
      setIsTyping(false)
      ws.send(
        JSON.stringify({
          type: 'typing_stop',
          payload: { receiverId: activeConversation.id },
        })
      )
    }
  }, [isTyping, ws, activeConversation])

  const handleFileUpload = async file => {
    if (!file || !activeConversation) return

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
          receiverId: activeConversation.id,
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
    if (!activeConversation) return

    try {
      const response = await fetch('/api/chat/zoom/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: `Chat with ${activeConversation.firstName} ${activeConversation.lastName}`,
          participants: [activeConversation.id],
        }),
      })

      const zoomData = await response.json()

      // Send zoom link message
      await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: activeConversation.id,
          content: zoomData.message.content,
          type: 'ZOOM_LINK',
          metadata: zoomData.message.metadata,
        }),
      })
    } catch (error) {
      console.error('Error creating Zoom meeting:', error)
    }
  }

  const filteredMembers = workspaceMembers.filter(
    member =>
      member.user.id !== user?.id && // Exclude current user
      (member.user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.user.email.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const getLastMessage = memberId => {
    // This would typically come from a separate API call for conversation previews
    return 'Click to start chatting...'
  }

  const isOnline = userId => onlineUsers.has(userId)

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar - Workspace Members */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search people..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredMembers.map(member => (
            <div
              key={member.user.id}
              onClick={() => setActiveConversation(member.user)}
              className={`p-4 cursor-pointer hover:bg-gray-50 border-b border-gray-100 ${
                activeConversation?.id === member.user.id
                  ? 'bg-blue-50 border-r-2 border-blue-500'
                  : ''
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <img
                    src={member.user.avatar || '/default-avatar.png'}
                    alt={`${member.user.firstName} ${member.user.lastName}`}
                    className="w-12 h-12 rounded-full"
                  />
                  {isOnline(member.user.id) && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {member.user.firstName} {member.user.lastName}
                    </p>
                    <span className="text-xs text-gray-500">
                      {isOnline(member.user.id) ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    {member.user.jobTitle || member.role.name}
                  </p>
                  <p className="text-xs text-gray-400 truncate mt-1">
                    {getLastMessage(member.user.id)}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {filteredMembers.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No workspace members found</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <img
                      src={activeConversation.avatar || '/default-avatar.png'}
                      alt={`${activeConversation.firstName} ${activeConversation.lastName}`}
                      className="w-10 h-10 rounded-full"
                    />
                    {isOnline(activeConversation.id) && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {activeConversation.firstName} {activeConversation.lastName}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {isOnline(activeConversation.id) ? 'Active now' : 'Offline'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={createZoomMeeting}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                    title="Start video call"
                  >
                    <Video className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                    <Phone className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message, index) => (
                <MessageComponent
                  key={message.id}
                  message={message}
                  isOwnMessage={message.senderId === user?.id}
                  showAvatar={index === 0 || messages[index - 1]?.senderId !== message.senderId}
                />
              ))}

              {/* Typing Indicators */}
              {typingUsers.length > 0 && (
                <div className="flex items-center space-x-2">
                  <img
                    src={activeConversation.avatar || '/default-avatar.png'}
                    alt="typing"
                    className="w-6 h-6 rounded-full"
                  />
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0.1s' }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0.2s' }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-500">typing...</span>
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
                    placeholder={`Message ${activeConversation.firstName}...`}
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
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">Welcome to Chat</h3>
              <p className="text-gray-500 mb-4">
                Select a workspace member to start a conversation
              </p>
              <div className="text-sm text-gray-400">
                💬 Send messages • 📎 Share files • 🎥 Video calls
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Message Component
function MessageComponent({ message, isOwnMessage, showAvatar }) {
  const formatTime = date => {
    const now = new Date()
    const messageDate = new Date(date)
    const diffInHours = (now - messageDate) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return messageDate.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    } else {
      return messageDate.toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    }
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
          <div className="mt-2 p-3 bg-gray-50 rounded-lg border max-w-sm">
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
          <div className="mt-2 p-4 bg-blue-50 border border-blue-200 rounded-lg max-w-sm">
            <div className="flex items-center space-x-3">
              <Video className="w-6 h-6 text-blue-500" />
              <div className="flex-1">
                <p className="font-medium text-blue-900">{message.metadata?.topic}</p>
                <p className="text-sm text-blue-700">Video call invitation</p>
              </div>
            </div>
            <button
              onClick={() => window.open(message.metadata?.joinUrl, '_blank')}
              className="mt-3 w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
            >
              Join Call
            </button>
          </div>
        )

      default:
        return (
          <div
            className={`inline-block px-4 py-2 rounded-2xl max-w-xs lg:max-w-md ${
              isOwnMessage ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-900'
            }`}
          >
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          </div>
        )
    }
  }

  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`flex space-x-2 max-w-xl ${isOwnMessage ? 'flex-row-reverse space-x-reverse' : ''}`}
      >
        {showAvatar && !isOwnMessage && (
          <img
            src={message.sender.avatar || '/default-avatar.png'}
            alt={`${message.sender.firstName} ${message.sender.lastName}`}
            className="w-8 h-8 rounded-full"
          />
        )}

        <div className={`${showAvatar ? '' : 'ml-10'} ${isOwnMessage ? 'mr-10' : ''}`}>
          {renderMessageContent()}
          <p className={`text-xs text-gray-500 mt-1 ${isOwnMessage ? 'text-right' : 'text-left'}`}>
            {formatTime(message.createdAt)}
            {message.isEdited && <span className="ml-1">(edited)</span>}
          </p>
        </div>
      </div>
    </div>
  )
}
