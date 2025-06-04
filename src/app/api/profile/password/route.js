import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { userService } from '@/lib/services/database'
import { validateRequest, apiResponse, apiError, handleApiError } from '@/lib/api-utils'
import { logger, createRequestTimer } from '@/lib/logger'
import { z } from 'zod'

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
})

export async function PUT(request) {
  const timer = createRequestTimer()

  try {
    const session = await auth()

    if (!session?.user?.id) {
      timer.log('PUT', '/api/profile/password', 401)
      return apiError('Authentication required', 401)
    }

    logger.apiRequest('PUT', '/api/profile/password', session.user.id)

    const validation = await validateRequest(request, updatePasswordSchema)

    if (!validation.success) {
      timer.log('PUT', '/api/profile/password', 400, session.user.id)
      return apiError('Validation failed', 400, 'VALIDATION_ERROR')
    }

    const { currentPassword, newPassword } = validation.data

    // Get user with password for verification
    const user = await userService.findByEmail(session.user.email)

    if (!user || !user.password) {
      timer.log('PUT', '/api/profile/password', 404, session.user.id)
      return apiError('User not found', 404)
    }

    // Verify current password
    const isCurrentPasswordValid = await userService.verifyPassword(currentPassword, user.password)

    if (!isCurrentPasswordValid) {
      logger.authEvent('password_change_failed', session.user.id, {
        reason: 'invalid_current_password',
      })
      timer.log('PUT', '/api/profile/password', 400, session.user.id)
      return apiError('Current password is incorrect', 400, 'INVALID_PASSWORD')
    }

    // Update password
    await userService.updatePassword(session.user.id, newPassword)

    logger.authEvent('password_changed', session.user.id)

    timer.log('PUT', '/api/profile/password', 200, session.user.id)

    return apiResponse({
      message: 'Password updated successfully',
    })
  } catch (error) {
    logger.apiError('PUT', '/api/profile/password', error, session?.user?.id)
    timer.log('PUT', '/api/profile/password', 500, session?.user?.id)
    return handleApiError(error)
  }
}
