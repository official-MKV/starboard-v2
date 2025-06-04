import { NextResponse } from 'next/server'
import { userService } from '@/lib/services/database'
import { validateRequest, apiResponse, apiError, handleApiError } from '@/lib/api-utils'
import { schemas } from '@/lib/api-utils'
import { logger, createRequestTimer } from '@/lib/logger'
import { generateId } from '@/lib/utils'
import { EmailService } from '@/lib/services/email-service'

export async function POST(request) {
  const timer = createRequestTimer()

  try {
    logger.apiRequest('POST', '/api/auth/register')

    // Validate request body
    const validation = await validateRequest(request, schemas.createUser)

    if (!validation.success) {
      return apiError('Validation failed', 400, 'VALIDATION_ERROR')
    }

    const { email, password, firstName, lastName } = validation.data

    // Check if user already exists
    const existingUser = await userService.findByEmail(email)

    if (existingUser) {
      logger.warn('Registration attempt with existing email', { email })
      timer.log('POST', '/api/auth/register', 409)
      return apiError('An account with this email already exists', 409, 'DUPLICATE_ENTRY')
    }

    // Generate verification token
    const emailVerificationToken = generateId(32)

    // Create new user
    const newUser = await userService.create({
      email: email.toLowerCase().trim(),
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      emailVerificationToken,
      isVerified: false, // Set to false until email is verified
    })

    // Send verification email
    try {
      await sendVerificationEmail(newUser.email, emailVerificationToken, {
        firstName: newUser.firstName,
        lastName: newUser.lastName,
      })

      logger.info('Verification email sent successfully', {
        email: newUser.email,
        userId: newUser.id,
      })
    } catch (emailError) {
      // Log email error but don't fail the registration
      logger.error('Failed to send verification email', {
        email: newUser.email,
        userId: newUser.id,
        error: emailError.message,
      })

      // Continue with registration even if email fails
      // You might want to set a flag to retry email sending later
    }

    timer.log('POST', '/api/auth/register', 201, newUser.id)

    return apiResponse(
      {
        message: 'Account created successfully. Please check your email to verify your account.',
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          isVerified: newUser.isVerified,
        },
        emailSent: true, // Indicate that verification email was attempted
      },
      201
    )
  } catch (error) {
    logger.apiError('POST', '/api/auth/register', error)
    timer.log('POST', '/api/auth/register', 500)
    return handleApiError(error)
  }
}

/**
 * Send verification email using EmailService
 * @param {string} email - User's email address
 * @param {string} token - Verification token
 * @param {Object} userData - User data for personalization
 */
async function sendVerificationEmail(email, token, userData = {}) {
  try {
    const verificationUrl = `${process.env.NEXTAUTH_URL}/auth/verify-email?token=${token}`

    // Create email template for verification
    const emailTemplate = {
      subject: 'Verify Your {{workspace_name}} Account',
      content: `Hi {{firstName}},

Welcome to **{{workspace_name}}**! 🎉

Thank you for creating your account. To get started, please verify your email address by clicking the button below:

[Verify Email Address]({{verification_url}})

**Why verify your email?**
- Secure your account
- Enable password reset functionality
- Receive important account notifications
- Complete your account setup

**Link not working?** Copy and paste this URL into your browser:
{{verification_url}}

This verification link will expire in **24 hours** for security reasons.

If you didn't create this account, please ignore this email.

Welcome aboard!

Best regards,
The {{workspace_name}} Team`,
      requiredVariables: ['firstName', 'verification_url', 'workspace_name'],
      optionalVariables: [],
    }

    // Prepare template variables
    const templateVariables = {
      firstName: userData.firstName || 'there',
      lastName: userData.lastName || '',
      verification_url: verificationUrl,
      workspace_name: process.env.WORKSPACE_NAME || 'Starboard',
      workspace_logo: process.env.WORKSPACE_LOGO || null,
    }

    // Send the templated email
    const result = await EmailService.sendTemplatedEmail(emailTemplate, templateVariables, email)

    logger.info('Verification email sent successfully', {
      email,
      messageId: result.messageId,
      provider: result.provider,
      verificationUrl, // For debugging (remove in production)
    })

    return result
  } catch (error) {
    logger.error('Failed to send verification email', {
      email,
      error: error.message,
      stack: error.stack,
    })

    // Re-throw the error so the caller can handle it
    throw new Error(`Email service failed: ${error.message}`)
  }
}

/**
 * Resend verification email endpoint (optional)
 * POST /api/auth/resend-verification
 */
export async function PATCH(request) {
  const timer = createRequestTimer()

  try {
    logger.apiRequest('PATCH', '/api/auth/resend-verification')

    const { email } = await request.json()

    if (!email) {
      return apiError('Email is required', 400, 'VALIDATION_ERROR')
    }

    // Find user by email
    const user = await userService.findByEmail(email.toLowerCase().trim())

    if (!user) {
      // Don't reveal if email exists or not for security
      return apiResponse({
        message: "If an account with this email exists, we've sent a verification email.",
      })
    }

    if (user.isVerified) {
      return apiError('Account is already verified', 400, 'ALREADY_VERIFIED')
    }

    // Generate new verification token
    const newVerificationToken = generateId(32)

    // Update user with new token
    await userService.update(user.id, {
      emailVerificationToken: newVerificationToken,
    })

    // Send new verification email
    try {
      await sendVerificationEmail(user.email, newVerificationToken, {
        firstName: user.firstName,
        lastName: user.lastName,
      })
    } catch (emailError) {
      logger.error('Failed to resend verification email', {
        email: user.email,
        userId: user.id,
        error: emailError.message,
      })

      return apiError('Failed to send verification email', 500, 'EMAIL_SEND_FAILED')
    }

    timer.log('PATCH', '/api/auth/resend-verification', 200, user.id)

    return apiResponse({
      message: 'Verification email sent successfully. Please check your inbox.',
    })
  } catch (error) {
    logger.apiError('PATCH', '/api/auth/resend-verification', error)
    timer.log('PATCH', '/api/auth/resend-verification', 500)
    return handleApiError(error)
  }
}
