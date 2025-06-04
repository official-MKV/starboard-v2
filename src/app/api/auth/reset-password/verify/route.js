import { NextResponse } from 'next/server'
import { userService } from '@/lib/services/database'
import { apiResponse, apiError, handleApiError } from '@/lib/api-utils'
import { logger, createRequestTimer } from '@/lib/logger'

export async function GET(request) {
  const timer = createRequestTimer()

  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    logger.apiRequest('GET', '/api/auth/reset-password/verify')

    if (!token) {
      timer.log('GET', '/api/auth/reset-password/verify', 400)
      return apiError('Reset token is required', 400)
    }

    // Find user by reset token
    const user = await userService.findByPasswordResetToken(token)

    if (!user) {
      logger.warn('Token verification failed', { token: token.substring(0, 8) + '...' })
      timer.log('GET', '/api/auth/reset-password/verify', 400)
      return apiError('Invalid or expired reset token', 400, 'TOKEN_EXPIRED')
    }

    timer.log('GET', '/api/auth/reset-password/verify', 200)

    return apiResponse({
      valid: true,
      message: 'Reset token is valid',
    })
  } catch (error) {
    logger.apiError('GET', '/api/auth/reset-password/verify', error)
    timer.log('GET', '/api/auth/reset-password/verify', 500)
    return handleApiError(error)
  }
}
