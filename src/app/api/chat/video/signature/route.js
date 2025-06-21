// /api/chat/video/signature/route.js

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import crypto from 'crypto'

export async function POST(request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { meetingNumber, role } = await request.json()

    if (!meetingNumber) {
      return NextResponse.json({ error: 'Meeting number required' }, { status: 400 })
    }

    // Zoom SDK credentials from environment variables
    const sdkKey = process.env.ZOOM_SDK_KEY
    const sdkSecret = process.env.ZOOM_SDK_SECRET

    if (!sdkKey || !sdkSecret) {
      console.error('❌ Missing Zoom SDK credentials')
      return NextResponse.json({ error: 'Zoom SDK not configured' }, { status: 500 })
    }

    // Generate timestamp
    const timestamp = new Date().getTime() - 30000 // 30 seconds ago to account for clock skew
    const msg = Buffer.from(sdkKey + meetingNumber + timestamp + role).toString('base64')
    const hash = crypto.createHmac('sha256', sdkSecret).update(msg).digest('base64')
    const signature = Buffer.from(
      `${sdkKey}.${meetingNumber}.${timestamp}.${role}.${hash}`
    ).toString('base64')

    console.log('✅ Generated Zoom SDK signature for meeting:', meetingNumber)

    return NextResponse.json({
      signature,
      sdkKey,
      meetingNumber,
      role,
      timestamp,
    })
  } catch (error) {
    console.error('❌ Error generating Zoom signature:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate signature',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    )
  }
}
