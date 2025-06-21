'use client'

import { Paperclip, Video, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function MessageComponent({ message, isOwnMessage, showAvatar }) {
  const formatTime = date => {
    const now = new Date()
    const messageDate = new Date(date)
    const diffInHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60)

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

  const formatFileSize = bytes => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const renderMessageContent = () => {
    switch (message.type) {
      case 'IMAGE':
        return (
          <div className="mt-2">
            <img
              src={message.thumbnailUrl || message.fileUrl}
              alt={message.fileName || 'Image'}
              className="max-w-sm rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => window.open(message.fileUrl, '_blank')}
            />
            {message.fileName && <p className="text-xs text-gray-500 mt-1">{message.fileName}</p>}
          </div>
        )

      case 'FILE':
        return (
          <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200 max-w-sm">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <Paperclip className="w-5 h-5 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {message.fileName || 'Unknown file'}
                </p>
                {message.fileSize && (
                  <p className="text-xs text-gray-500">{formatFileSize(message.fileSize)}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(message.fileUrl, '_blank')}
                className="flex-shrink-0 text-blue-500 hover:text-blue-700"
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )

      case 'VIDEO_CALL': // ✅ FIXED: Changed from ZOOM_LINK to VIDEO_CALL
        return (
          <div className="mt-2 p-4 bg-blue-50 border border-blue-200 rounded-lg max-w-sm">
            <div className="flex items-center space-x-3 mb-3">
              <Video className="w-6 h-6 text-blue-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-blue-900">Video Call</p>
                <p className="text-sm text-blue-700">Click to join the call</p>
              </div>
            </div>

            {message.metadata?.password && (
              <div className="mb-3 p-2 bg-blue-100 rounded text-xs">
                <span className="text-blue-800">
                  Password: <span className="font-mono">{message.metadata.password}</span>
                </span>
              </div>
            )}

            <Button
              onClick={() => window.open(message.metadata?.joinUrl, '_blank')}
              className="w-full bg-blue-500 text-white hover:bg-blue-600"
              size="sm"
            >
              <Video className="w-4 h-4 mr-2" />
              Join Call
            </Button>
          </div>
        )

      case 'TEXT':
      default:
        return (
          <div
            className={`inline-block px-4 py-2 rounded-2xl max-w-xs lg:max-w-md break-words ${
              isOwnMessage ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-900'
            }`}
          >
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
        )
    }
  }

  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`flex space-x-2 max-w-xl ${isOwnMessage ? 'flex-row-reverse space-x-reverse' : ''}`}
      >
        {showAvatar && !isOwnMessage && (
          <div className="flex-shrink-0">
            <img
              src={message.sender?.avatar || '/placeholder.svg?height=32&width=32'}
              alt={`${message.sender?.firstName || 'User'} ${message.sender?.lastName || ''}`}
              className="w-8 h-8 rounded-full"
            />
          </div>
        )}

        <div
          className={`${showAvatar && !isOwnMessage ? '' : 'ml-10'} ${isOwnMessage ? 'mr-10' : ''}`}
        >
          {showAvatar && !isOwnMessage && message.sender && (
            <p className="text-xs text-gray-500 mb-1 ml-1">
              {message.sender.firstName} {message.sender.lastName}
            </p>
          )}

          {renderMessageContent()}

          <p className={`text-xs text-gray-500 mt-1 ${isOwnMessage ? 'text-right' : 'text-left'}`}>
            {formatTime(message.createdAt)}
            {message.isEdited && <span className="ml-1 italic">(edited)</span>}
          </p>
        </div>
      </div>
    </div>
  )
}
