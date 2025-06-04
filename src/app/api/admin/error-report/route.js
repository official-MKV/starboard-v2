import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { apiResponse, apiError } from '@/lib/api-utils'

export async function POST(request) {
  try {
    const session = await auth()
    const body = await request.json()

    const { error, errorInfo, context, url, userAgent, timestamp } = body

    // Create detailed error log entry
    const errorReport = {
      timestamp: timestamp || new Date().toISOString(),
      userId: session?.user?.id || 'anonymous',
      userEmail: session?.user?.email || null,
      error: {
        message: error?.message || 'Unknown error',
        stack: error?.stack || null,
        name: error?.name || 'Error',
      },
      context: {
        url: url || 'unknown',
        userAgent: userAgent || 'unknown',
        componentStack: errorInfo?.componentStack || null,
        ...context,
      },
      severity: 'high',
      source: 'client_error_boundary',
    }

    // Log the error with enhanced metadata
    logger.error('Client-side error reported', {
      type: 'client_error',
      userId: errorReport.userId,
      error: errorReport.error.message,
      stack: errorReport.error.stack,
      url: errorReport.context.url,
      userAgent: errorReport.context.userAgent,
      componentStack: errorReport.context.componentStack,
      severity: errorReport.severity,
      timestamp: errorReport.timestamp,
    })

    // In production, you might want to:
    // 1. Store in database for analysis
    // 2. Send to external error tracking service (Sentry, Bugsnag, etc.)
    // 3. Send alerts for critical errors
    // 4. Rate limit error reports per user

    // For now, we'll just acknowledge the report
    return apiResponse({
      message: 'Error report received',
      reportId: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'logged',
    })
  } catch (error) {
    console.error('Error processing error report:', error)

    // Log this meta-error
    logger.error('Failed to process error report', {
      type: 'meta_error',
      error: error.message,
      stack: error.stack,
    })

    return apiError('Failed to process error report', 500)
  }
}

// Optional: GET endpoint to retrieve error reports for admin dashboard
export async function GET(request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return apiError('Authentication required', 401)
    }

    // Check if user is admin
    const isAdmin =
      session.user.email === 'admin@starboard.com' ||
      session.user.workspaces?.some(ws => ws.role === 'admin')

    if (!isAdmin) {
      return apiError('Admin access required', 403)
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const since = searchParams.get('since') // ISO timestamp

    // For now, return empty array - in production you'd query your error storage
    const errorReports = []

    return apiResponse({
      errors: errorReports,
      total: errorReports.length,
      message: 'Error reports retrieved successfully',
    })
  } catch (error) {
    console.error('Error retrieving error reports:', error)
    return apiError('Failed to retrieve error reports', 500)
  }
}
