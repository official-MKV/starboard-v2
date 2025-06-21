'use client'

import { useState, useEffect, useRef } from 'react'
import { Video, VideoOff, Mic, MicOff, PhoneOff, Users, Maximize2, Minimize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export function VideoCallInterface({ isOpen, onClose, meetingData, isHost, onCallEnd }) {
  const [isVideoOn, setIsVideoOn] = useState(true)
  const [isAudioOn, setIsAudioOn] = useState(true)
  const [participants, setParticipants] = useState(1)
  const [callDuration, setCallDuration] = useState(0)
  const [callStarted, setCallStarted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [zoomClient, setZoomClient] = useState(null)
  const [isJoining, setIsJoining] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('disconnected') // disconnected, connecting, connected, error

  const zoomContainerRef = useRef(null)

  useEffect(() => {
    let interval
    if (callStarted) {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [callStarted])

  // Initialize Zoom Web SDK when component mounts
  useEffect(() => {
    if (isOpen && meetingData && !zoomClient) {
      initializeZoomSDK()
    }

    // Cleanup on unmount
    return () => {
      if (zoomClient) {
        zoomClient.leave().catch(console.error)
      }
    }
  }, [isOpen, meetingData])

  const initializeZoomSDK = async () => {
    try {
      console.log('🔌 Initializing Zoom Web SDK...')

      // Dynamically import Zoom Web SDK
      const { ZoomMtg } = await import('@zoomus/websdk')

      // Configure Zoom SDK
      ZoomMtg.setZoomJSLib('https://source.zoom.us/2.18.0/lib', '/av')
      ZoomMtg.preLoadWasm()
      ZoomMtg.prepareWebSDK()

      // Generate SDK signature (you'll need to implement this endpoint)
      const signatureResponse = await fetch('/api/chat/video/signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingNumber: meetingData.zoomMeetingId,
          role: isHost ? 1 : 0, // 1 for host, 0 for participant
        }),
      })

      const { signature } = await signatureResponse.json()

      setZoomClient(ZoomMtg)
      console.log('✅ Zoom SDK initialized')
    } catch (error) {
      console.error('❌ Failed to initialize Zoom SDK:', error)
      setConnectionStatus('error')
    }
  }

  const handleJoinCall = async () => {
    if (!zoomClient || !meetingData) return

    setIsJoining(true)
    setConnectionStatus('connecting')

    try {
      console.log('🎥 Joining Zoom meeting...')

      // Get signature for this meeting
      const signatureResponse = await fetch('/api/chat/video/signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingNumber: meetingData.zoomMeetingId,
          role: isHost ? 1 : 0,
        }),
      })

      const { signature } = await signatureResponse.json()

      // Initialize meeting in the container
      zoomClient.init({
        leaveUrl: window.location.origin,
        success: success => {
          console.log('✅ Zoom SDK initialized successfully')

          // Join the meeting
          zoomClient.join({
            signature: signature,
            meetingNumber: meetingData.zoomMeetingId,
            userName: `${meetingData.participant?.firstName || 'User'} ${meetingData.participant?.lastName || ''}`,
            apiKey: process.env.NEXT_PUBLIC_ZOOM_SDK_KEY,
            userEmail: meetingData.participant?.email || '',
            passWord: '', // No password required as per your requirement
            success: success => {
              console.log('✅ Successfully joined meeting')
              setCallStarted(true)
              setConnectionStatus('connected')
              setIsJoining(false)
            },
            error: error => {
              console.error('❌ Failed to join meeting:', error)
              setConnectionStatus('error')
              setIsJoining(false)
            },
          })
        },
        error: error => {
          console.error('❌ Failed to initialize Zoom SDK:', error)
          setConnectionStatus('error')
          setIsJoining(false)
        },
      })
    } catch (error) {
      console.error('❌ Error joining call:', error)
      setConnectionStatus('error')
      setIsJoining(false)
    }
  }

  const handleEndCall = async () => {
    try {
      if (zoomClient) {
        await zoomClient.leave()
      }
    } catch (error) {
      console.error('Error leaving Zoom meeting:', error)
    }

    setCallStarted(false)
    setCallDuration(0)
    setConnectionStatus('disconnected')

    // Mark call as ended in database
    if (meetingData?.id) {
      try {
        await fetch(`/api/chat/video/${meetingData.id}/end`, {
          method: 'POST',
        })
      } catch (error) {
        console.error('Failed to end call:', error)
      }
    }

    if (onCallEnd) {
      onCallEnd()
    }

    onClose()
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  const formatDuration = seconds => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  if (!meetingData) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`${isFullscreen ? 'max-w-full h-full' : 'max-w-6xl h-[700px]'} p-0`}
      >
        <div className="flex flex-col h-full bg-gray-900 text-white rounded-lg overflow-hidden">
          <DialogHeader className="p-4 bg-gray-800 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-white">Video Call</DialogTitle>
                <div className="flex items-center space-x-4 text-sm text-gray-300 mt-1">
                  <span>Meeting: {meetingData.zoomMeetingId || meetingData.id}</span>
                  {callStarted && <span>Duration: {formatDuration(callDuration)}</span>}
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        connectionStatus === 'connected'
                          ? 'bg-green-500'
                          : connectionStatus === 'connecting'
                            ? 'bg-yellow-500'
                            : connectionStatus === 'error'
                              ? 'bg-red-500'
                              : 'bg-gray-500'
                      }`}
                    ></div>
                    <span className="capitalize">{connectionStatus}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleFullscreen}
                  className="text-gray-400 hover:text-white"
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-4 h-4" />
                  ) : (
                    <Maximize2 className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 relative bg-gray-800">
            {!callStarted ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Video className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-xl font-semibold mb-2">Ready to join?</h3>
                  <p className="text-gray-400 mb-6">
                    {connectionStatus === 'error'
                      ? 'Failed to connect. Please try again.'
                      : 'Click "Join Call" to start your video call'}
                  </p>

                  {connectionStatus === 'error' && (
                    <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm">
                      Unable to connect to meeting. This might be due to:
                      <ul className="mt-2 text-left list-disc list-inside space-y-1">
                        <li>Meeting hasn't started yet</li>
                        <li>Invalid meeting credentials</li>
                        <li>Network connectivity issues</li>
                      </ul>
                    </div>
                  )}

                  <Button
                    onClick={handleJoinCall}
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={isJoining || connectionStatus === 'connecting'}
                  >
                    <Video className="w-4 h-4 mr-2" />
                    {isJoining ? 'Joining...' : 'Join Call'}
                  </Button>
                </div>
              </div>
            ) : (
              // Zoom SDK will render the meeting interface here
              <div
                ref={zoomContainerRef}
                id="zmmtg-root"
                className="w-full h-full"
                style={{ minHeight: '400px' }}
              >
                {/* Zoom Web SDK will inject the meeting interface here */}
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-32 h-32 bg-gray-700 rounded-full flex items-center justify-center mb-4 mx-auto">
                      <Users className="w-16 h-16 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Meeting in Progress</h3>
                    <p className="text-gray-400 mb-4">
                      The Zoom meeting interface will appear here once connected
                    </p>
                    <div className="flex items-center justify-center space-x-2 text-sm text-gray-300">
                      <Users className="w-4 h-4" />
                      <span>
                        {participants} participant{participants !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Custom Controls Overlay (when meeting is active) */}
            {callStarted && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-50">
                <div className="flex items-center space-x-3 bg-gray-900/90 backdrop-blur-sm rounded-full px-4 py-2 border border-gray-600">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsAudioOn(!isAudioOn)}
                    className={`rounded-full p-3 ${
                      isAudioOn ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'
                    }`}
                    title={isAudioOn ? 'Mute' : 'Unmute'}
                  >
                    {isAudioOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsVideoOn(!isVideoOn)}
                    className={`rounded-full p-3 ${
                      isVideoOn ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'
                    }`}
                    title={isVideoOn ? 'Stop Video' : 'Start Video'}
                  >
                    {isVideoOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleEndCall}
                    className="rounded-full p-3 bg-red-600 hover:bg-red-700"
                    title="End Call"
                  >
                    <PhoneOff className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 bg-gray-800 border-t border-gray-700">
            <div className="flex items-center justify-between text-sm text-gray-400">
              <div className="flex items-center space-x-4">
                <span>Powered by Zoom Web SDK</span>
                {isHost && <span className="text-blue-400">• You are the host</span>}
                {meetingData.isZoomMeeting && (
                  <span className="text-green-400">• Zoom Integration Active</span>
                )}
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-xs">Press F11 for browser fullscreen</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="text-gray-400 hover:text-white"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
