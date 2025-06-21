'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, Paperclip, Video, MoreVertical, Phone, Users, Search, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import MessageComponent from './message-component'
import { VideoCallInterface } from './video-call-interface'

// Main Chat Interface Component
export default function ChatInterface() {
  const [workspaceMembers, setWorkspaceMembers] = useState([])
  const [activeConversation, setActiveConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [conversationMessages, setConversationMessages] = useState({}) // Store messages per conversation
  const [conversations, setConversations] = useState([]) // List of active conversations
  const [showMemberModal, setShowMemberModal] = useState(false) // For selecting users to chat with
  const [showVideoCall, setShowVideoCall] = useState(false)
  const [currentVideoCall, setCurrentVideoCall] = useState(null)
  const [newMessage, setNewMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [typingUsers, setTypingUsers] = useState([])
  const [ws, setWs] = useState(null)
  const [user, setUser] = useState(null)
  const [onlineUsers, setOnlineUsers] = useState(new Set())
  const [connectionStatus, setConnectionStatus] = useState('disconnected')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [memberSearchQuery, setMemberSearchQuery] = useState('')

  useEffect(() => {
    const initializeChat = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const sessionResponse = await fetch('/api/auth/session')
        const session = await sessionResponse.json()

        if (!session?.user) {
          setError('No user session found. Please log in.')
          return
        }

        setUser(session.user)
        await loadExistingConversations(session.user.id)

        try {
          const tokenResponse = await fetch('/api/auth/ws-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          })
          const tokenData = await tokenResponse.json()

          if (tokenData.token) {
            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
            const wsUrl = `${wsProtocol}//${window.location.host}/api/chat/ws?token=${tokenData.token}`

            const websocket = new WebSocket(wsUrl)

            websocket.onopen = () => {
              setWs(websocket)
              setConnectionStatus('connected')
            }

            websocket.onmessage = event => {
              try {
                const message = JSON.parse(event.data)
                handleWebSocketMessage(message)
              } catch (error) {
                // Silent error handling
              }
            }

            websocket.onclose = event => {
              setWs(null)
              setConnectionStatus('disconnected')
            }

            websocket.onerror = error => {
              setConnectionStatus('error')
            }
          }
        } catch (error) {
          setConnectionStatus('error')
        }
      } catch (error) {
        setError('Failed to initialize chat. Please refresh the page.')
      } finally {
        setIsLoading(false)
      }
    }

    initializeChat()
  }, [])

  // Listen for video call events from message components
  useEffect(() => {
    const handleOpenVideoCall = event => {
      const { meetingData } = event.detail
      setCurrentVideoCall(meetingData)
      setShowVideoCall(true)
    }

    window.addEventListener('openVideoCall', handleOpenVideoCall)
    return () => window.removeEventListener('openVideoCall', handleOpenVideoCall)
  }, [])

  const handleWebSocketMessage = useCallback(
    message => {
      const { type, data } = message
      console.log(`Handling WebSocket message type: ${type}`, data)

      switch (type) {
        case 'connected':
          console.log('WebSocket connection confirmed')
          if (data.onlineUsers) {
            setOnlineUsers(new Set(data.onlineUsers))
          }
          break

        case 'new_message':
          console.log('New message received:', data)
          if (data.senderId === user?.id || data.receiverId === user?.id) {
            // Update current messages if this conversation is active
            if (
              (data.senderId === activeConversation?.id && data.receiverId === user?.id) ||
              (data.senderId === user?.id && data.receiverId === activeConversation?.id)
            ) {
              setMessages(prev => {
                const exists = prev.some(msg => msg.id === data.id)
                if (!exists) {
                  console.log('Adding message to current conversation')
                  const updated = [...prev, data]
                  setTimeout(scrollToBottom, 100)
                  return updated
                }
                return prev
              })
            }

            // Update conversation-specific storage
            const otherUserId = data.senderId === user?.id ? data.receiverId : data.senderId
            const conversationKey = [user.id, otherUserId].sort().join('-')
            setConversationMessages(prev => {
              const existingMessages = prev[conversationKey] || []
              const exists = existingMessages.some(msg => msg.id === data.id)
              if (!exists) {
                return {
                  ...prev,
                  [conversationKey]: [...existingMessages, data],
                }
              }
              return prev
            })

            // Update conversations list with last message
            setConversations(prev => {
              return prev.map(conv => {
                if (conv.id === otherUserId) {
                  let lastMessage = data.content
                  if (data.type === 'IMAGE') lastMessage = '📷 Image'
                  else if (data.type === 'FILE') lastMessage = '📎 File'
                  else if (data.type === 'VIDEO_CALL') lastMessage = '🎥 Video call'
                  else if (lastMessage && lastMessage.length > 50)
                    lastMessage = `${lastMessage.substring(0, 50)}...`

                  return {
                    ...conv,
                    lastMessage,
                    lastMessageTime: data.createdAt,
                  }
                }
                return conv
              })
            })
          }
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

        default:
          console.log('Unknown message type:', type)
      }
    },
    [activeConversation, user, ws]
  )

  useEffect(() => {
    if (activeConversation && user) {
      const conversationKey = [user.id, activeConversation.id].sort().join('-')
      const cachedMessages = conversationMessages[conversationKey]
      if (cachedMessages && cachedMessages.length > 1) {
        setMessages(cachedMessages)
        setTimeout(scrollToBottom, 100)
      } else {
        loadMessages(activeConversation.id)
      }
    }
  }, [activeConversation, user])

  const loadMessages = async otherUserId => {
    try {
      console.log('Fetching messages for user:', otherUserId)
      const response = await fetch(`/api/chat/messages?receiverId=${otherUserId}&limit=100`)
      const data = await response.json()
      console.log(data)

      if (response.ok) {
        console.log('Messages loaded:', data.messages?.length)
        const newMessages = data.messages || []
        setMessages(newMessages)

        const conversationKey = [user.id, otherUserId].sort().join('-')
        setConversationMessages(prev => ({
          ...prev,
          [conversationKey]: newMessages,
        }))

        setTimeout(scrollToBottom, 100)
      } else {
        console.error('Error loading messages:', data.error)
        setError('Failed to load messages')
      }
    } catch (error) {
      console.error('Error loading messages:', error)
      setError('Failed to load messages')
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConversation) {
      return
    }

    const messageContent = newMessage.trim()
    setNewMessage('')
    stopTyping()

    try {
      const payload = {
        receiverId: activeConversation.id, // ✅ Now correctly uses User.id
        content: messageContent,
        type: 'TEXT',
      }

      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('❌ Error sending message:', data.error)
        setError(`Failed to send message: ${data.error}`)
        setNewMessage(messageContent)
      } else {
        console.log('✅ Message sent successfully:', data.message)
        setMessages(prev => {
          const exists = prev.some(msg => msg.id === data.message.id)
          if (!exists) {
            return [...prev, data.message]
          }
          return prev
        })

        // Update conversations list with last message
        setConversations(prev => {
          return prev.map(conv => {
            if (conv.id === activeConversation.id) {
              let lastMessage = messageContent
              if (lastMessage.length > 50) lastMessage = `${lastMessage.substring(0, 50)}...`

              return {
                ...conv,
                lastMessage,
                lastMessageTime: data.message.createdAt,
              }
            }
            return conv
          })
        })

        setTimeout(scrollToBottom, 100)
      }
    } catch (error) {
      console.error('❌ Network error sending message:', error)
      setError('Network error. Please check your connection.')
      setNewMessage(messageContent)
    }
  }

  const handleKeyPress = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const startTyping = () => {
    if (!isTyping && ws && activeConversation && ws.readyState === WebSocket.OPEN) {
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
    if (isTyping && ws && activeConversation && ws.readyState === WebSocket.OPEN) {
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
          receiverId: activeConversation.id, // ✅ Now correctly uses User.id
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
      setError('Failed to upload file')
    }
  }

  const createVideoCall = async () => {
    if (!activeConversation) return

    try {
      console.log('🎥 Creating video call...')
      const response = await fetch('/api/chat/video/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId: activeConversation.id, // ✅ Now correctly uses User.id
        }),
      })

      const data = await response.json()

      if (response.ok) {
        console.log('✅ Video call created:', data.meeting)

        // Set video call data and show interface
        setCurrentVideoCall(data.meeting)
        setShowVideoCall(true)

        // The message is already sent by the API, no need to send another one
      } else {
        console.error('❌ Error creating video call:', data.error)
        setError('Failed to create video call')
      }
    } catch (error) {
      console.error('❌ Error creating video call:', error)
      setError('Failed to create video call')
    }
  }

  const handleCallEnd = () => {
    // Refresh messages to update call status
    if (activeConversation) {
      loadMessages(activeConversation.id)
    }
  }

  const loadExistingConversations = async userId => {
    try {
      console.log('📞 Fetching conversations from API...')
      const response = await fetch('/api/chat/conversations')
      const data = await response.json()

      if (response.ok && data.conversations) {
        console.log(`✅ Found ${data.conversations.length} existing conversations`)

        // ✅ Transform conversations to ensure they have proper User structure
        const transformedConversations = data.conversations.map(conv => ({
          id: conv.id, // Should already be User.id from your API
          firstName: conv.firstName,
          lastName: conv.lastName,
          avatar: conv.avatar,
          jobTitle: conv.jobTitle,
          email: conv.email,
          lastMessage: conv.lastMessage,
          lastMessageTime: conv.lastMessageTime,
        }))

        setConversations(transformedConversations)

        const conversationMessagesData = {}
        for (const conv of transformedConversations) {
          try {
            const messagesResponse = await fetch(`/api/chat/messages?receiverId=${conv.id}&limit=1`)
            const messagesData = await messagesResponse.json()

            if (messagesData.messages && messagesData.messages.length > 0) {
              const conversationKey = [userId, conv.id].sort().join('-')
              conversationMessagesData[conversationKey] = messagesData.messages
            }
          } catch (error) {
            console.log(`⚠️ Could not load messages for ${conv.firstName} ${conv.lastName}`)
          }
        }
        setConversationMessages(conversationMessagesData)
      } else {
        console.log('📭 No existing conversations found')
      }
    } catch (error) {
      console.error('❌ Error loading existing conversations:', error)
      setError('Failed to load conversations')
    }
  }

  const loadWorkspaceMembers = async () => {
    if (workspaceMembers.length > 0) {
      return
    }

    try {
      console.log('👥 Loading workspace members from API...')
      const membersResponse = await fetch('/api/workspaces/members')
      const membersData = await membersResponse.json()

      if (membersResponse.ok && membersData.members) {
        // ✅ Transform members to flatten user data to top level for easier access
        const transformedMembers = membersData.members.map(member => ({
          // Spread user properties to top level for easier access
          id: member.user.id, // ✅ User.id at top level
          firstName: member.user.firstName,
          lastName: member.user.lastName,
          avatar: member.user.avatar,
          jobTitle: member.user.jobTitle,
          email: member.user.email,
          // Keep original structure for reference
          workspaceMemberId: member.id,
          role: member.role,
          user: member.user, // Keep original user object
        }))

        setWorkspaceMembers(transformedMembers)
        console.log(`✅ Loaded ${transformedMembers.length} workspace members`)
      } else {
        console.error('❌ Failed to load workspace members:', membersData)
        setError('Failed to load workspace members')
      }
    } catch (error) {
      console.error('❌ Error loading workspace members:', error)
      setError('Failed to load workspace members')
    }
  }

  // ✅ Fixed startConversation function
  const startConversation = async memberUser => {
    console.log('Starting conversation with:', memberUser.firstName, memberUser.lastName)

    // ✅ Create conversation object using User data (already transformed)
    const newConversation = {
      id: memberUser.id, // ✅ This is now User.id
      firstName: memberUser.firstName,
      lastName: memberUser.lastName,
      avatar: memberUser.avatar,
      jobTitle: memberUser.jobTitle,
      email: memberUser.email,
      lastMessage: null,
      lastMessageTime: null,
    }

    setConversations(prev => {
      const exists = prev.some(conv => conv.id === memberUser.id) // ✅ Check User.id
      if (!exists) {
        return [...prev, newConversation]
      }
      return prev
    })

    setActiveConversation(newConversation) // ✅ Set User object as active conversation
    setShowMemberModal(false)
    setMemberSearchQuery('')

    await loadMessages(memberUser.id) // ✅ Use User.id
  }

  const handleStartConversation = async () => {
    try {
      await loadWorkspaceMembers()
      setShowMemberModal(true)
    } catch (error) {
      console.error('❌ Error in handleStartConversation:', error)
    }
  }

  const isOnline = userId => onlineUsers.has(userId)

  // ✅ Filter workspace members for modal
  const filteredWorkspaceMembers = workspaceMembers.filter(member => {
    if (!memberSearchQuery) return true
    const query = memberSearchQuery.toLowerCase()
    return (
      member.firstName.toLowerCase().includes(query) ||
      member.lastName.toLowerCase().includes(query) ||
      (member.jobTitle && member.jobTitle.toLowerCase().includes(query))
    )
  })

  if (isLoading) {
    return (
      <div className="flex h-screen bg-gray-100 items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading chat...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen bg-gray-100 items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">❌ {error}</div>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
          >
            Refresh Page
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar - Conversations */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
            <div className="flex items-center space-x-2">
              <div
                className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : 'bg-gray-400'}`}
              ></div>
            </div>
          </div>

          {conversations.length > 0 && (
            <Button onClick={handleStartConversation} className="w-full mb-3">
              <Plus className="w-4 h-4 mr-2" />
              New Conversation
            </Button>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="flex items-center justify-center h-full p-8">
              <div className="text-center">
                <Users className="w-16 h-16 mx-auto mb-6 text-gray-300" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">No conversations yet</h3>
                <p className="text-gray-500 mb-6">Start chatting with your workspace members</p>
                <Button onClick={handleStartConversation}>
                  <Plus className="w-5 h-5 mr-2" />
                  Start Your First Conversation
                </Button>
              </div>
            </div>
          ) : (
            <>
              {conversations
                .filter(conversation => {
                  if (!searchQuery) return true
                  const query = searchQuery.toLowerCase()
                  return (
                    conversation.firstName.toLowerCase().includes(query) ||
                    conversation.lastName.toLowerCase().includes(query) ||
                    (conversation.lastMessage &&
                      conversation.lastMessage.toLowerCase().includes(query))
                  )
                })
                .map(conversation => (
                  <div
                    key={conversation.id}
                    onClick={() => {
                      setActiveConversation(conversation)
                    }}
                    className={`p-4 cursor-pointer hover:bg-gray-50 border-b border-gray-100 ${
                      activeConversation?.id === conversation.id
                        ? 'bg-blue-50 border-r-2 border-blue-500'
                        : ''
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <img
                          src={conversation.avatar || '/placeholder.svg?height=48&width=48'}
                          alt={`${conversation.firstName} ${conversation.lastName}`}
                          className="w-12 h-12 rounded-full"
                        />
                        {isOnline(conversation.id) && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {conversation.firstName} {conversation.lastName}
                          </p>
                          <span className="text-xs text-gray-500">
                            {conversation.lastMessageTime
                              ? new Date(conversation.lastMessageTime).toLocaleDateString()
                              : ''}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          {conversation.jobTitle || 'Team Member'}
                        </p>
                        <p className="text-xs text-gray-400 truncate mt-1">
                          {conversation.lastMessage || 'No messages yet'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
            </>
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
                      src={activeConversation.avatar || '/placeholder.svg?height=40&width=40'}
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={createVideoCall}
                    className="p-2 text-gray-400 hover:text-gray-600"
                    title="Start video call"
                  >
                    <Video className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-2 text-gray-400 hover:text-gray-600"
                  >
                    <Phone className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-2 text-gray-400 hover:text-gray-600"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-gray-500">
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                </div>
              ) : (
                messages.map((message, index) => (
                  <MessageComponent
                    key={message.id}
                    message={message}
                    isOwnMessage={message.senderId === user?.id}
                    showAvatar={index === 0 || messages[index - 1]?.senderId !== message.senderId}
                  />
                ))
              )}

              {/* Typing Indicators */}
              {typingUsers.length > 0 && (
                <div className="flex items-center space-x-2">
                  <img
                    src={activeConversation.avatar || '/placeholder.svg?height=24&width=24'}
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-gray-400 hover:text-gray-600"
                  title="Attach file"
                >
                  <Paperclip className="w-5 h-5" />
                </Button>

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

                <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                  <Send className="w-5 h-5" />
                </Button>
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

      {/* Member Selection Modal */}
      <Dialog open={showMemberModal} onOpenChange={setShowMemberModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Start New Conversation</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search workspace members..."
                value={memberSearchQuery}
                onChange={e => setMemberSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Members List */}
            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredWorkspaceMembers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {memberSearchQuery ? 'No members found' : 'Loading workspace members...'}
                </div>
              ) : (
                filteredWorkspaceMembers
                  .filter(member => member.id !== user?.id) // ✅ Don't show current user
                  .filter(member => !conversations.some(conv => conv.id === member.id)) // ✅ Don't show existing conversations
                  .map(member => (
                    <div
                      key={member.id} // ✅ Use User.id
                      onClick={() => startConversation(member)}
                      className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer border border-transparent hover:border-gray-200"
                    >
                      <div className="relative">
                        <img
                          src={member.avatar || '/placeholder.svg?height=40&width=40'}
                          alt={`${member.firstName} ${member.lastName}`}
                          className="w-10 h-10 rounded-full"
                        />
                        {isOnline(member.id) && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {member.firstName} {member.lastName}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{member.role?.name}</p>
                        {member.email && (
                          <p className="text-xs text-gray-400 truncate">{member.email}</p>
                        )}
                      </div>
                      {isOnline(member.id) && (
                        <span className="text-xs text-green-600 font-medium">Online</span>
                      )}
                    </div>
                  ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Video Call Interface */}
      <VideoCallInterface
        isOpen={showVideoCall}
        onClose={() => setShowVideoCall(false)}
        meetingData={currentVideoCall}
        isHost={currentVideoCall?.host?.id === user?.id}
        onCallEnd={handleCallEnd}
      />
    </div>
  )
}
