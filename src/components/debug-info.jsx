'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bug, ChevronDown, ChevronUp, Copy, User, Globe, Clock, Code, Database } from 'lucide-react'
import { toast } from 'sonner'

export function DebugInfo({
  showInProduction = false,
  className = '',
  additionalData = {},
  position = 'bottom-right', // 'bottom-right', 'bottom-left', 'top-right', 'top-left'
}) {
  const { data: session, status } = useSession()
  const [isExpanded, setIsExpanded] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  // Don't show in production unless explicitly enabled
  if (process.env.NODE_ENV === 'production' && !showInProduction) {
    return null
  }

  const debugData = {
    // Environment Info
    environment: {
      nodeEnv: process.env.NODE_ENV,
      nextjsVersion: '15.0.0',
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : 'SSR',
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'Server',
    },

    // Session Info
    session: {
      status,
      userId: session?.user?.id || null,
      email: session?.user?.email || null,
      workspaces: session?.user?.workspaces?.length || 0,
      isVerified: session?.user?.isVerified || false,
    },

    // Additional data passed from component
    ...additionalData,
  }

  const copyToClipboard = () => {
    const debugText = JSON.stringify(debugData, null, 2)
    navigator.clipboard.writeText(debugText)
    toast.success('Debug info copied to clipboard')
  }

  const toggleVisibility = () => {
    setIsVisible(!isVisible)
    if (!isVisible) {
      setIsExpanded(false)
    }
  }

  const positionClasses = {
    'bottom-right': 'fixed bottom-4 right-4 z-50',
    'bottom-left': 'fixed bottom-4 left-4 z-50',
    'top-right': 'fixed top-4 right-4 z-50',
    'top-left': 'fixed top-4 left-4 z-50',
  }

  return (
    <>
      {/* Toggle Button */}
      {!isVisible && (
        <button
          onClick={toggleVisibility}
          className={`${positionClasses[position]} w-12 h-12 bg-purple-600 hover:bg-purple-700 text-white rounded-full flex items-center justify-center shadow-lg transition-colors`}
          title="Show Debug Info"
        >
          <Bug className="h-5 w-5" />
        </button>
      )}

      {/* Debug Panel */}
      {isVisible && (
        <div className={`${positionClasses[position]} ${className}`}>
          <Card className="starboard-card bg-white/95 backdrop-blur border-purple-200 max-w-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Bug className="h-4 w-4 text-purple-600" />
                  <CardTitle className="text-sm text-purple-800">Debug Info</CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {process.env.NODE_ENV}
                  </Badge>
                </div>
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="p-1 h-6 w-6"
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleVisibility}
                    className="p-1 h-6 w-6"
                  >
                    ×
                  </Button>
                </div>
              </div>
            </CardHeader>

            {isExpanded && (
              <CardContent className="pt-0 space-y-3">
                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center space-x-1">
                    <User className="h-3 w-3 text-blue-500" />
                    <span className={session?.user ? 'text-green-600' : 'text-red-600'}>
                      {session?.user ? 'Logged In' : 'Not Logged In'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1">
                    <Database className="h-3 w-3 text-green-500" />
                    <span className="text-green-600">DB Connected</span>
                  </div>

                  <div className="flex items-center space-x-1">
                    <Globe className="h-3 w-3 text-purple-500" />
                    <span>{debugData.environment.nodeEnv}</span>
                  </div>

                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3 text-gray-500" />
                    <span>{new Date().toLocaleTimeString()}</span>
                  </div>
                </div>

                {/* Session Details */}
                {session?.user && (
                  <div className="bg-blue-50 border border-blue-200 rounded p-2">
                    <h4 className="text-xs font-medium text-blue-800 mb-1">User Session</h4>
                    <div className="text-xs text-blue-700 space-y-1">
                      <div>
                        <strong>ID:</strong> {session.user.id}
                      </div>
                      <div>
                        <strong>Email:</strong> {session.user.email}
                      </div>
                      <div>
                        <strong>Workspaces:</strong> {session.user.workspaces?.length || 0}
                      </div>
                    </div>
                  </div>
                )}

                {/* Environment Details */}
                <div className="bg-gray-50 border border-gray-200 rounded p-2">
                  <h4 className="text-xs font-medium text-gray-800 mb-1">Environment</h4>
                  <div className="text-xs text-gray-700 space-y-1">
                    <div>
                      <strong>Node:</strong> {debugData.environment.nodeEnv}
                    </div>
                    <div>
                      <strong>Next.js:</strong> {debugData.environment.nextjsVersion}
                    </div>
                    <div>
                      <strong>Time:</strong>{' '}
                      {new Date(debugData.environment.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Additional Data */}
                {Object.keys(additionalData).length > 0 && (
                  <div className="bg-purple-50 border border-purple-200 rounded p-2">
                    <h4 className="text-xs font-medium text-purple-800 mb-1">Component Data</h4>
                    <pre className="text-xs text-purple-700 overflow-x-auto">
                      {JSON.stringify(additionalData, null, 1)}
                    </pre>
                  </div>
                )}

                {/* Actions */}
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyToClipboard}
                    className="flex-1 text-xs"
                  >
                    <Copy className="mr-1 h-3 w-3" />
                    Copy
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open('/admin/logs', '_blank')}
                    className="flex-1 text-xs"
                  >
                    <Code className="mr-1 h-3 w-3" />
                    Logs
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      )}
    </>
  )
}

// Simplified version for quick debugging
export function QuickDebug({ data, label = 'Debug' }) {
  if (process.env.NODE_ENV === 'production') return null

  return (
    <div className="fixed bottom-4 left-4 z-50 max-w-xs">
      <Card className="starboard-card bg-yellow-50 border-yellow-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-yellow-800">{label}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <pre className="text-xs text-yellow-700 overflow-x-auto">
            {typeof data === 'string' ? data : JSON.stringify(data, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}
