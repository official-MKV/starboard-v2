import { NextResponse } from 'next/server'
import { prisma } from '@/lib/database'
import { handleDatabaseError } from '@/lib/database'
import { validateRequest, apiResponse, apiError, handleApiError } from '@/lib/api-utils'
import { logger, createRequestTimer } from '@/lib/logger'
import { z } from 'zod'

const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
})

export async function POST(request) {
  const timer = createRequestTimer()

  try {
    logger.apiRequest('POST', '/api/auth/verify-email')

    const validation = await validateRequest(request, verifyEmailSchema)

    if (!validation.success) {
      timer.log('POST', '/api/auth/verify-email', 400)
      return apiError('Validation failed', 400, 'VALIDATION_ERROR')
    }

    const { token } = validation.data

    // Find user by verification token
    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
      },
    })

    if (!user) {
      logger.warn('Email verification attempted with invalid token', {
        token: token.substring(0, 8) + '...',
      })
      timer.log('POST', '/api/auth/verify-email', 400)
      return apiError('Invalid or expired verification token', 400, 'TOKEN_EXPIRED')
    }

    if (user.isVerified) {
      logger.info('Email verification attempted for already verified user', {
        userId: user.id,
      })
      timer.log('POST', '/api/auth/verify-email', 200, user.id)
      return apiResponse({
        message: 'Email is already verified',
      })
    }

    // Update user as verified
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        emailVerifiedAt: new Date(),
        emailVerificationToken: null, // Clear the token
      },
    })

    

    timer.log('POST', '/api/auth/verify-email', 200, user.id)

    return apiResponse({
      message: 'Email verified successfully',
    })
  } catch (error) {
    logger.apiError('POST', '/api/auth/verify-email', error)
    timer.log('POST', '/api/auth/verify-email', 500)
    return handleApiError(error)
  }
}
