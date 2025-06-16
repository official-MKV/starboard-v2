// app/api/zoom/webhook/route.js
import { NextResponse } from 'next/server'
import { ZoomService } from '@/lib/services/zoom-service'
import { logger } from '@/lib/logger'

/**
 * POST /api/zoom/webhook
 * Handle Zoom webhook events
 */
export async function POST(request) {
  try {
    // Get headers for signature validation
    const signature = request.headers.get('authorization')
    const timestamp = request.headers.get('x-zm-request-timestamp')

    if (!signature || !timestamp) {
      logger.warn('Zoom webhook missing required headers', {
        hasSignature: !!signature,
        hasTimestamp: !!timestamp,
      })
      return NextResponse.json({ error: { message: 'Missing required headers' } }, { status: 400 })
    }

    // Get raw body for signature validation
    const rawBody = await request.text()

    if (!rawBody) {
      logger.warn('Zoom webhook missing body')
      return NextResponse.json({ error: { message: 'Missing request body' } }, { status: 400 })
    }

    // Validate webhook signature
    const isValidSignature = ZoomService.validateWebhookSignature(rawBody, signature, timestamp)

    if (!isValidSignature) {
      logger.error('Invalid Zoom webhook signature', {
        signature: signature.substring(0, 20) + '...',
        timestamp,
      })
      return NextResponse.json({ error: { message: 'Invalid signature' } }, { status: 401 })
    }

    // Parse the webhook payload
    let event
    try {
      event = JSON.parse(rawBody)
    } catch (parseError) {
      logger.error('Failed to parse Zoom webhook payload', {
        error: parseError.message,
        bodyPreview: rawBody.substring(0, 200),
      })
      return NextResponse.json({ error: { message: 'Invalid JSON payload' } }, { status: 400 })
    }

    // Handle URL verification challenge (required by Zoom)
    if (event.event === 'endpoint.url_validation') {
      const { challenge } = event.payload

      logger.info('Zoom webhook URL validation', { challenge })

      return NextResponse.json({
        plainToken: challenge,
      })
    }

    // Log the webhook event
    logger.info('Zoom webhook received', {
      event: event.event,
      meetingId: event.payload?.object?.id,
      participantId: event.payload?.object?.participant?.id,
      timestamp,
    })

    // Process the webhook event
    await ZoomService.processWebhookEvent(event)

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
    })
  } catch (error) {
    logger.error('Error processing Zoom webhook', {
      error: error.message,
      stack: error.stack,
    })

    // Return success even on error to prevent Zoom from retrying
    // We'll handle the error internally
    return NextResponse.json({
      success: true,
      message: 'Webhook received',
    })
  }
}

/**
 * GET /api/zoom/webhook
 * Handle webhook verification (if needed)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const challenge = searchParams.get('challenge')

    if (challenge) {
      logger.info('Zoom webhook verification', { challenge })
      return new Response(challenge, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Zoom webhook endpoint',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Error handling Zoom webhook verification', { error: error.message })
    return NextResponse.json({ error: { message: 'Webhook verification failed' } }, { status: 500 })
  }
}
