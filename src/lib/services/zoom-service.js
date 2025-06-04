// lib/services/zoom-service.js
import { logger } from '@/lib/logger'

export class ZoomService {
  static baseUrl = 'https://api.zoom.us/v2'
  static token = null
  static tokenExpiry = null

  /**
   * Get or refresh access token
   */
  static async getAccessToken() {
    try {
      // Check if token is still valid
      if (this.token && this.tokenExpiry && new Date() < this.tokenExpiry) {
        return this.token
      }

      const accountId = process.env.ZOOM_ACCOUNT_ID
      const clientId = process.env.ZOOM_CLIENT_ID
      const clientSecret = process.env.ZOOM_CLIENT_SECRET

      if (!accountId || !clientId || !clientSecret) {
        throw new Error('Zoom credentials not configured')
      }

      const response = await fetch(`https://zoom.us/oauth/token`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'account_credentials',
          account_id: accountId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Zoom auth failed: ${errorData.error_description || response.statusText}`)
      }

      const data = await response.json()

      this.token = data.access_token
      this.tokenExpiry = new Date(Date.now() + (data.expires_in - 60) * 1000) // Refresh 1 min early

      logger.info('Zoom access token refreshed')

      return this.token
    } catch (error) {
      logger.error('Failed to get Zoom access token', { error: error.message })
      throw new Error('Failed to authenticate with Zoom')
    }
  }

  /**
   * Make authenticated request to Zoom API
   */
  static async makeRequest(endpoint, options = {}) {
    try {
      const token = await this.getAccessToken()

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Zoom API error: ${errorData.message || response.statusText}`)
      }

      return response.json()
    } catch (error) {
      logger.error('Zoom API request failed', {
        endpoint,
        method: options.method || 'GET',
        error: error.message,
      })
      throw error
    }
  }

  /**
   * Create a new Zoom meeting
   */
  static async createMeeting(meetingData) {
    try {
      const {
        topic,
        start_time,
        duration = 60,
        timezone = 'UTC',
        password,
        settings = {},
      } = meetingData

      // Default meeting settings
      const defaultSettings = {
        host_video: true,
        participant_video: true,
        cn_meeting: false,
        in_meeting: false,
        join_before_host: false,
        jbh_time: 0,
        mute_upon_entry: true,
        watermark: false,
        use_pmi: false,
        approval_type: 2,
        audio: 'both',
        auto_recording: 'none',
        enforce_login: false,
        enforce_login_domains: '',
        alternative_hosts: '',
        close_registration: false,
        show_share_button: true,
        allow_multiple_devices: true,
        registrants_confirmation_email: true,
        waiting_room: true,
        request_permission_to_unmute_participants: false,
        meeting_authentication: false,
        ...settings,
      }

      const payload = {
        topic,
        type: 2, // Scheduled meeting
        start_time: new Date(start_time).toISOString(),
        duration,
        timezone,
        password,
        settings: defaultSettings,
      }

      const meeting = await this.makeRequest('/users/me/meetings', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      logger.info('Zoom meeting created', {
        meetingId: meeting.id,
        topic: meeting.topic,
        joinUrl: meeting.join_url,
      })

      return {
        id: meeting.id.toString(),
        uuid: meeting.uuid,
        host_id: meeting.host_id,
        topic: meeting.topic,
        join_url: meeting.join_url,
        start_url: meeting.start_url,
        password: meeting.password,
        h323_password: meeting.h323_password,
        pstn_password: meeting.pstn_password,
        encrypted_password: meeting.encrypted_password,
        start_time: meeting.start_time,
        duration: meeting.duration,
        timezone: meeting.timezone,
        created_at: meeting.created_at,
        settings: meeting.settings,
      }
    } catch (error) {
      logger.error('Failed to create Zoom meeting', { error: error.message, meetingData })
      throw new Error('Failed to create Zoom meeting')
    }
  }

  /**
   * Update an existing Zoom meeting
   */
  static async updateMeeting(meetingId, updateData) {
    try {
      const { topic, start_time, duration, timezone = 'UTC', password, settings = {} } = updateData

      const payload = {
        ...(topic && { topic }),
        ...(start_time && { start_time: new Date(start_time).toISOString() }),
        ...(duration && { duration }),
        timezone,
        ...(password && { password }),
        ...(Object.keys(settings).length > 0 && { settings }),
      }

      await this.makeRequest(`/meetings/${meetingId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })

      logger.info('Zoom meeting updated', { meetingId, updateData })

      return { success: true }
    } catch (error) {
      logger.error('Failed to update Zoom meeting', { meetingId, error: error.message })
      throw new Error('Failed to update Zoom meeting')
    }
  }

  /**
   * Delete a Zoom meeting
   */
  static async deleteMeeting(meetingId) {
    try {
      await this.makeRequest(`/meetings/${meetingId}`, {
        method: 'DELETE',
      })

      logger.info('Zoom meeting deleted', { meetingId })

      return { success: true }
    } catch (error) {
      logger.error('Failed to delete Zoom meeting', { meetingId, error: error.message })
      throw new Error('Failed to delete Zoom meeting')
    }
  }

  /**
   * Get meeting details
   */
  static async getMeeting(meetingId) {
    try {
      const meeting = await this.makeRequest(`/meetings/${meetingId}`)

      return {
        id: meeting.id.toString(),
        uuid: meeting.uuid,
        host_id: meeting.host_id,
        topic: meeting.topic,
        status: meeting.status,
        start_time: meeting.start_time,
        duration: meeting.duration,
        timezone: meeting.timezone,
        join_url: meeting.join_url,
        password: meeting.password,
        settings: meeting.settings,
        created_at: meeting.created_at,
      }
    } catch (error) {
      logger.error('Failed to get Zoom meeting', { meetingId, error: error.message })
      throw new Error('Failed to get Zoom meeting details')
    }
  }

  /**
   * List meeting recordings
   */
  static async getMeetingRecordings(meetingId) {
    try {
      const recordings = await this.makeRequest(`/meetings/${meetingId}/recordings`)

      return (
        recordings.recording_files?.map(file => ({
          id: file.id,
          meeting_id: file.meeting_id,
          recording_start: file.recording_start,
          recording_end: file.recording_end,
          file_type: file.file_type,
          file_size: file.file_size,
          play_url: file.play_url,
          download_url: file.download_url,
          status: file.status,
          recording_type: file.recording_type,
        })) || []
      )
    } catch (error) {
      logger.error('Failed to get meeting recordings', { meetingId, error: error.message })
      return []
    }
  }

  /**
   * Get meeting participants
   */
  static async getMeetingParticipants(meetingUuid) {
    try {
      // Note: UUID needs to be double URL encoded for past meetings
      const encodedUuid = encodeURIComponent(encodeURIComponent(meetingUuid))

      const participants = await this.makeRequest(`/past_meetings/${encodedUuid}/participants`)

      return (
        participants.participants?.map(participant => ({
          id: participant.id,
          user_id: participant.user_id,
          name: participant.name,
          user_email: participant.user_email,
          join_time: participant.join_time,
          leave_time: participant.leave_time,
          duration: participant.duration,
          status: participant.status,
        })) || []
      )
    } catch (error) {
      logger.error('Failed to get meeting participants', { meetingUuid, error: error.message })
      return []
    }
  }

  /**
   * Create meeting invitation with custom naming convention
   */
  static async createMeetingInvitation(meeting, eventData, userRole, startupName = null) {
    try {
      // Format participant name according to convention: Full Name(Role) or Full Name(Startup Name)
      const participantName = startupName
        ? `${eventData.participantName}(${startupName})`
        : `${eventData.participantName}(${userRole})`

      // Custom join URL with participant name
      const customJoinUrl = `${meeting.join_url}&uname=${encodeURIComponent(participantName)}`

      // Create calendar event data
      const calendarEvent = {
        summary: meeting.topic,
        description: `Join Zoom Meeting: ${customJoinUrl}\n\nMeeting ID: ${meeting.id}\nPassword: ${meeting.password}`,
        start: {
          dateTime: meeting.start_time,
          timeZone: meeting.timezone,
        },
        end: {
          dateTime: new Date(
            new Date(meeting.start_time).getTime() + meeting.duration * 60000
          ).toISOString(),
          timeZone: meeting.timezone,
        },
        location: 'Zoom Meeting',
      }

      return {
        meeting,
        customJoinUrl,
        participantName,
        calendarEvent,
        instructions: this.getMeetingInstructions(meeting, participantName),
      }
    } catch (error) {
      logger.error('Failed to create meeting invitation', { error: error.message })
      throw new Error('Failed to create meeting invitation')
    }
  }

  /**
   * Get meeting join instructions
   */
  static getMeetingInstructions(meeting, participantName) {
    return {
      beforeMeeting: [
        'Test your audio and video before the meeting',
        'Ensure you have a stable internet connection',
        'Join the meeting 5 minutes early',
        'Have your questions ready',
      ],
      duringMeeting: [
        'Mute yourself when not speaking',
        'Use the chat for questions if needed',
        'Keep your video on when speaking',
        'Be respectful of other participants',
      ],
      technical: {
        joinUrl: meeting.join_url,
        meetingId: meeting.id,
        password: meeting.password,
        dialIn: meeting.settings?.global_dial_in_numbers?.[0],
        participantName,
      },
    }
  }

  /**
   * Validate Zoom webhook signature
   */
  static validateWebhookSignature(payload, signature, timestamp) {
    try {
      const webhookSecretToken = process.env.ZOOM_WEBHOOK_SECRET_TOKEN
      if (!webhookSecretToken) {
        throw new Error('Zoom webhook secret not configured')
      }

      const crypto = require('crypto')
      const message = `v0:${timestamp}:${payload}`
      const hashForVerify = crypto
        .createHmac('sha256', webhookSecretToken)
        .update(message, 'utf8')
        .digest('hex')

      const computedSignature = `v0=${hashForVerify}`

      return crypto.timingSafeEqual(
        Buffer.from(signature, 'utf8'),
        Buffer.from(computedSignature, 'utf8')
      )
    } catch (error) {
      logger.error('Failed to validate webhook signature', { error: error.message })
      return false
    }
  }

  /**
   * Process Zoom webhook events
   */
  static async processWebhookEvent(event) {
    try {
      const { event: eventType, payload } = event

      switch (eventType) {
        case 'meeting.started':
          await this.handleMeetingStarted(payload)
          break
        case 'meeting.ended':
          await this.handleMeetingEnded(payload)
          break
        case 'meeting.participant_joined':
          await this.handleParticipantJoined(payload)
          break
        case 'meeting.participant_left':
          await this.handleParticipantLeft(payload)
          break
        case 'recording.completed':
          await this.handleRecordingCompleted(payload)
          break
        default:
          logger.info('Unhandled Zoom webhook event', { eventType })
      }

      return { success: true }
    } catch (error) {
      logger.error('Failed to process Zoom webhook event', { error: error.message, event })
      throw error
    }
  }

  /**
   * Handle meeting started webhook
   */
  static async handleMeetingStarted(payload) {
    try {
      const { object } = payload
      const meetingId = object.id.toString()

      // Update event status in database
      await prisma.event.updateMany({
        where: { zoomMeetingId: meetingId },
        data: {
          // Add any status tracking fields you need
        },
      })

      logger.info('Meeting started', { meetingId, topic: object.topic })
    } catch (error) {
      logger.error('Failed to handle meeting started', { error: error.message })
    }
  }

  /**
   * Handle meeting ended webhook
   */
  static async handleMeetingEnded(payload) {
    try {
      const { object } = payload
      const meetingId = object.id.toString()

      // Update event and participant records
      await prisma.event.updateMany({
        where: { zoomMeetingId: meetingId },
        data: {
          // Add any cleanup or status fields
        },
      })

      logger.info('Meeting ended', { meetingId, duration: object.duration })
    } catch (error) {
      logger.error('Failed to handle meeting ended', { error: error.message })
    }
  }

  /**
   * Handle participant joined webhook
   */
  static async handleParticipantJoined(payload) {
    try {
      const { object } = payload
      const meetingId = object.id.toString()
      const participant = object.participant

      // Track attendance
      await prisma.eventRegistration.updateMany({
        where: {
          event: { zoomMeetingId: meetingId },
          user: { email: participant.email },
        },
        data: {
          checkedInAt: new Date(),
          status: 'ATTENDED',
        },
      })

      logger.info('Participant joined', {
        meetingId,
        participantName: participant.user_name,
        participantEmail: participant.email,
      })
    } catch (error) {
      logger.error('Failed to handle participant joined', { error: error.message })
    }
  }

  /**
   * Handle participant left webhook
   */
  static async handleParticipantLeft(payload) {
    try {
      const { object } = payload
      const meetingId = object.id.toString()
      const participant = object.participant

      // Update checkout time
      await prisma.eventRegistration.updateMany({
        where: {
          event: { zoomMeetingId: meetingId },
          user: { email: participant.email },
        },
        data: {
          checkedOutAt: new Date(),
        },
      })

      logger.info('Participant left', {
        meetingId,
        participantName: participant.user_name,
        duration: participant.duration,
      })
    } catch (error) {
      logger.error('Failed to handle participant left', { error: error.message })
    }
  }

  /**
   * Handle recording completed webhook
   */
  static async handleRecordingCompleted(payload) {
    try {
      const { object } = payload
      const meetingId = object.id.toString()

      // Create recording records in database
      const recordingFiles = object.recording_files || []

      for (const file of recordingFiles) {
        if (file.file_type === 'MP4') {
          await prisma.eventRecording.create({
            data: {
              event: {
                connect: { zoomMeetingId: meetingId },
              },
              title: `${object.topic} - Recording`,
              recordingUrl: file.play_url,
              downloadUrl: file.download_url,
              duration: Math.floor(file.duration / 1000), // Convert to seconds
              fileSize: file.file_size,
              format: 'mp4',
              zoomRecordingId: file.id,
              isProcessed: true,
              processingStatus: 'COMPLETED',
            },
          })
        }
      }

      logger.info('Recording completed', {
        meetingId,
        topic: object.topic,
        fileCount: recordingFiles.length,
      })
    } catch (error) {
      logger.error('Failed to handle recording completed', { error: error.message })
    }
  }
}
