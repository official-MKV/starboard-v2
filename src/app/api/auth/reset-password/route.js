// app/api/auth/reset-password/route.js
import { NextResponse } from 'next/server'
import { PasswordResetService } from '@/lib/services/password-reset-service'
import { validateRequest, apiResponse, apiError, handleApiError } from '@/lib/api-utils'
import { logger, createRequestTimer } from '@/lib/logger'
import { z } from 'zod'

const resetPasswordSchema = z
  .object({
    token: z.string().min(32, 'Invalid reset token'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

export async function GET(request) {
  const timer = createRequestTimer()

  try {
    logger.apiRequest('GET', '/api/auth/reset-password')

    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      timer.log('GET', '/api/auth/reset-password', 400)
      return apiError('Reset token is required', 400, 'MISSING_TOKEN')
    }

    // Validate token using PasswordResetService
    const validation = await PasswordResetService.validateResetToken(token)

    if (!validation.valid) {
      timer.log('GET', '/api/auth/reset-password', 400)
      return apiError(validation.error, 400, 'INVALID_TOKEN')
    }

    timer.log('GET', '/api/auth/reset-password', 200)

    return apiResponse({
      valid: true,
      email: validation.user.email,
      firstName: validation.user.firstName,
      expiresAt: validation.user.expiresAt,
    })
  } catch (error) {
    logger.apiError('GET', '/api/auth/reset-password', error)
    timer.log('GET', '/api/auth/reset-password', 500)
    return handleApiError(error)
  }
}

export async function POST(request) {
  const timer = createRequestTimer()

  try {
    logger.apiRequest('POST', '/api/auth/reset-password')

    const validation = await validateRequest(request, resetPasswordSchema)
    console.log(validation)

    if (!validation.success) {
      timer.log('POST', '/api/auth/reset-password', 400)
      return apiError('Validation failed', 400, 'VALIDATION_ERROR', validation.errors)
    }

    const { token, password } = validation.data

    // Complete password reset using PasswordResetService
    const result = await PasswordResetService.completePasswordReset(token, password)

    if (!result.success) {
      timer.log('POST', '/api/auth/reset-password', 400)
      return apiError(result.error, 400, 'RESET_FAILED')
    }

    timer.log('POST', '/api/auth/reset-password', 200)

    return apiResponse({
      message: result.message,
      redirect: '/auth/login?message=password-reset-success',
    })
  } catch (error) {
    logger.apiError('POST', '/api/auth/reset-password', error)
    timer.log('POST', '/api/auth/reset-password', 500)
    return handleApiError(error)
  }
}
