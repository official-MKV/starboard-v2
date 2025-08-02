import { NextResponse } from 'next/server'
import { prisma } from '@/lib/database'
import { handleDatabaseError } from '@/lib/database'
import { validateRequest, apiResponse, apiError, handleApiError } from '@/lib/api-utils'
import { logger, createRequestTimer } from '@/lib/logger'
import { generateId } from '@/lib/utils'
import { z } from 'zod'

const resendVerificationSchema = z
  .object({
    email: z.string().email('Invalid email address').optional(),
    token: z.string().optional(),
  })
  .refine(data => data.email || data.token, {
    message: 'Either email or token must be provided',
  })

export async function POST(request) {
  const timer = createRequestTimer()

  try {
    logger.apiRequest('POST', '/api/auth/resend-verification')

    const validation = await validateRequest(request, resendVerificationSchema)

    if (!validation.success) {
      timer.log('POST', '/api/auth/resend-verification', 400)
      return apiError('Validation failed', 400, 'VALIDATION_ERROR')
    }

    const { email, token } = validation.data

    let user

    if (email) {
      // Find user by email
      user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      })
    } else if (token) {
      // Find user by existing verification token
      user = await prisma.user.findFirst({
        where: { emailVerificationToken: token },
      })
    }

    if (!user) {
      // For security, always return success even if user doesn't exist
      logger.warn('Verification resend requested for non-existent user', {
        email,
        hasToken: !!token,
      })
      timer.log('POST', '/api/auth/resend-verification', 200)
      return apiResponse({
        message:
          'If an account with that email exists and is unverified, we have sent a verification email.',
      })
    }

    if (user.isVerified) {
      logger.info('Verification resend requested for already verified user', {
        userId: user.id,
      })
      timer.log('POST', '/api/auth/resend-verification', 200, user.id)
      return apiResponse({
        message: 'Email is already verified',
      })
    }

    // Generate new verification token
    const newToken = generateId(32)

    // Update user with new token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: newToken,
      },
    })

    // TODO: Send verification email
    await sendVerificationEmail(user.email, newToken, user.firstName)

  

    timer.log('POST', '/api/auth/resend-verification', 200, user.id)

    return apiResponse({
      message: 'Verification email sent successfully',
    })
  } catch (error) {
    logger.apiError('POST', '/api/auth/resend-verification', error)
    timer.log('POST', '/api/auth/resend-verification', 500)
    return handleApiError(error)
  }
}

// Helper function to send verification email
async function sendVerificationEmail(email, token, firstName) {
  const verificationUrl = `${process.env.NEXTAUTH_URL}/auth/verify-email?token=${token}`

  console.log(`Verification email would be sent to ${email}`)
  console.log(`Verification URL: ${verificationUrl}`)
  console.log(`User: ${firstName}`)

  // TODO: Implement actual email sending
  // This would integrate with your email service

  /*
  const emailService = require('@/lib/email')

  await emailService.send({
    to: email,
    subject: 'Verify your Starboard account',
    template: 'verify-email',
    data: {
      firstName,
      verificationUrl
    }
  })
  */
}
