// app/api/auth/forgot-password/route.js
import { NextResponse } from 'next/server'
import { userService } from '@/lib/services/database'
import { EmailService } from '@/lib/services/email-service'
import { validateRequest, apiResponse, apiError, handleApiError } from '@/lib/api-utils'
import { logger, createRequestTimer } from '@/lib/logger'
import { generateId } from '@/lib/utils'
import { z } from 'zod'

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export async function POST(request) {
  const timer = createRequestTimer()

  try {
    logger.apiRequest('POST', '/api/auth/forgot-password')

    const validation = await validateRequest(request, forgotPasswordSchema)

    if (!validation.success) {
      timer.log('POST', '/api/auth/forgot-password', 400)
      return apiError('Validation failed', 400, 'VALIDATION_ERROR')
    }

    const { email } = validation.data

    // Find user by email
    const user = await userService.findByEmail(email)

    console.log(user)
    if (user) {
      if (!user.isActive) {
        logger.warn('Password reset requested for inactive user', {
          email: user.email,
          userId: user.id,
        })
        // Still return success for security, but don't send email
        timer.log('POST', '/api/auth/forgot-password', 200)
        return apiResponse({
          message: 'If an account with that email exists, we have sent a password reset link.',
        })
      }

      // Generate password reset token
      const resetToken = generateId(32)
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now

      // Save reset token to database
      await userService.setPasswordResetToken(email, resetToken, expiresAt)

      // Send password reset email
      try {
        await sendPasswordResetEmail(user.email, resetToken, user.firstName)
      } catch (emailError) {
        logger.error('Failed to send password reset email', {
          userId: user.id,
          email: user.email,
          error: emailError.message,
        })

        // Clear the token since email failed
        await userService.setPasswordResetToken(email, null, null)

        timer.log('POST', '/api/auth/forgot-password', 500)
        return apiError(
          'Failed to send password reset email. Please try again.',
          500,
          'EMAIL_SEND_ERROR'
        )
      }
    } else {
      logger.warn('Password reset requested for non-existent email', { email })
    }

    timer.log('POST', '/api/auth/forgot-password', 200)

    // Always return success response for security
    return apiResponse({
      message: 'If an account with that email exists, we have sent a password reset link.',
    })
  } catch (error) {
    logger.apiError('POST', '/api/auth/forgot-password', error)
    timer.log('POST', '/api/auth/forgot-password', 500)
    return handleApiError(error)
  }
}

/**
 * Send password reset email using EmailService
 * @param {string} email - User email
 * @param {string} token - Reset token
 * @param {string} firstName - User's first name
 */
async function sendPasswordResetEmail(email, token, firstName) {
  const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${token}`

  const passwordResetTemplate = {
    subject: 'Reset your password - {{workspace_name}}',
    content: `Hello {{first_name}},

We received a request to reset your password for your **{{workspace_name}}** account.

**[Reset Your Password]({{reset_url}})**

This link will expire in **1 hour** for security reasons.

**Important Security Information:**
- If you didn't request this password reset, please ignore this email
- Your password won't be changed until you click the link above and create a new one
- For security, this link can only be used once

If you're having trouble with the button above, copy and paste this URL into your browser:
{{reset_url}}

If you continue to have problems, please contact our support team at {{support_email}}.

Best regards,
The {{workspace_name}} Team`,
    requiredVariables: ['first_name', 'reset_url', 'workspace_name'],
    optionalVariables: ['support_email'],
    type: 'PASSWORD_RESET',
  }

  // Template variables
  const templateVariables = {
    first_name: firstName || 'User',
    reset_url: resetUrl,
    workspace_name: process.env.APP_NAME || 'Starboard',
    support_email: process.env.SUPPORT_EMAIL || process.env.EMAIL_FROM,
  }

  // Send email using EmailService
  const result = await EmailService.sendTemplatedEmail(
    passwordResetTemplate,
    templateVariables,
    email
  )

  logger.info('Password reset email sent successfully', {
    email,
    resetToken: token,
    firstName,
    messageId: result.messageId,
    provider: result.provider,
  })

  return result
}
