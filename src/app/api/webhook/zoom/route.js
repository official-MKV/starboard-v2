// app/api/webhooks/zoom/route.js
import { NextResponse } from 'next/server'
import { ZoomService } from '@/lib/services/zoom-service'
import { logger } from '@/lib/logger'

/**
 * POST /api/webhooks/zoom
 * Handle Zoom webhook events
 */
export async function POST(request) {
  try {
    // Get headers for signature verification
    const signature = request.headers.get('authorization')
    const timestamp = request.headers.get('x-zm-request-timestamp')

    // Get raw body for signature verification
    const body = await request.text()

    // Verify webhook signature
    if (!ZoomService.validateWebhookSignature(body, signature, timestamp)) {
      logger.warn('Invalid Zoom webhook signature', { signature, timestamp })
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // Parse JSON payload
    const payload = JSON.parse(body)

    logger.info('Zoom webhook received', {
      event: payload.event,
      account_id: payload.payload?.account_id,
    })

    // Process the webhook event
    await ZoomService.processWebhookEvent(payload)

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Error processing Zoom webhook', { error: error.message })
    return NextResponse.json({ error: { message: 'Failed to process webhook' } }, { status: 500 })
  }
}

/**
 * GET /api/webhooks/zoom
 * Webhook verification endpoint for Zoom
 */
export async function GET(request) {
  try {
    const url = new URL(request.url)
    const challenge = url.searchParams.get('challenge')

    if (challenge) {
      // Zoom webhook verification
      return new Response(challenge, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      })
    }

    return NextResponse.json({ status: 'Zoom webhook endpoint active' })
  } catch (error) {
    logger.error('Error handling Zoom webhook verification', { error: error.message })
    return NextResponse.json({ error: { message: 'Webhook verification failed' } }, { status: 500 })
  }
}
