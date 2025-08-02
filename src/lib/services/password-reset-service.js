// lib/services/password-reset-service.js
import { userService } from './database.js'
import { EmailService } from './email-service.js'
import { prisma } from '@/lib/database'
import { generateId } from '@/lib/utils'
import { logger } from '@/lib/logger'

/**
 * Password Reset Service
 * Handles password reset flow with email notifications
 */
export class PasswordResetService {
  /**
   * Initiate password reset process
   * @param {string} email - User email
   * @returns {Object} - Result object
   */
  static async initiatePasswordReset(email) {
    try {
      // Find user by email
      const user = await userService.findByEmail(email)

      if (!user) {
        logger.warn('Password reset requested for non-existent email', { email })
        return {
          success: true,
          message: 'If an account with that email exists, we have sent a password reset link.',
        }
      }

      // Check if user is active
      if (!user.isActive) {
        logger.warn('Password reset requested for inactive user', {
          email: user.email,
          userId: user.id,
        })
        return {
          success: true,
          message: 'If an account with that email exists, we have sent a password reset link.',
        }
      }

      // Generate password reset token
      const resetToken = generateId(32)
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now

      // Save reset token to database
      await userService.setPasswordResetToken(email, resetToken, expiresAt)

      // Send password reset email
      await this.sendPasswordResetEmail(user.email, resetToken, user.firstName)

      // logger.authEvent('password_reset_initiated', user.id, {
      //   email: user.email,
      //   tokenExpiresAt: expiresAt.toISOString(),
      // })

      return {
        success: true,
        message: 'Password reset email sent successfully.',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
        },
      }
    } catch (error) {
      logger.error('Failed to initiate password reset', {
        email,
        error: error.message,
      })
      throw error
    }
  }

  /**
   * Validate password reset token
   * @param {string} token - Reset token
   * @returns {Object} - Validation result
   */
  static async validateResetToken(token) {
    try {
      const user = await userService.findByPasswordResetToken(token)

      if (!user) {
        return {
          valid: false,
          error: 'Invalid or expired reset token',
        }
      }

      // Double-check user is still active
      const fullUser = await userService.findByEmail(user.email)
      if (!fullUser || !fullUser.isActive) {
        return {
          valid: false,
          error: 'Account is not active',
        }
      }

      return {
        valid: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          expiresAt: user.passwordResetExpiresAt,
        },
      }
    } catch (error) {
      logger.error('Failed to validate reset token', {
        token,
        error: error.message,
      })
      throw error
    }
  }

  /**
   * Complete password reset
   * @param {string} token - Reset token
   * @param {string} newPassword - New password
   * @returns {Object} - Reset result
   */
  static async completePasswordReset(token, newPassword) {
    try {
      // Validate token first
      const validation = await this.validateResetToken(token)

      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
        }
      }

      const { user } = validation

      // Update password and clear reset token
      await userService.updatePassword(user.id, newPassword)

      // logger.authEvent('password_reset_completed', user.id, {
      //   email: user.email,
      //   resetTokenUsed: token,
      // })

      // Send confirmation email
      try {
        await this.sendPasswordResetConfirmationEmail(user.email, user.firstName)
      } catch (emailError) {
        // Log error but don't fail the password reset
        logger.error('Failed to send password reset confirmation email', {
          userId: user.id,
          email: user.email,
          error: emailError.message,
        })
      }

      return {
        success: true,
        message: 'Password reset successful. You can now log in with your new password.',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
        },
      }
    } catch (error) {
      logger.error('Failed to complete password reset', {
        token,
        error: error.message,
      })
      throw error
    }
  }

  /**
   * Send password reset email
   * @param {string} email - User email
   * @param {string} token - Reset token
   * @param {string} firstName - User's first name
   */
  static async sendPasswordResetEmail(email, token, firstName) {
    const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${token}`

    // Create password reset email template
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

If you continue to have problems, please contact our support team.

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
      firstName,
      messageId: result.messageId,
      provider: result.provider,
    })

    return result
  }

  /**
   * Send password reset confirmation email
   * @param {string} email - User email
   * @param {string} firstName - User's first name
   */
  static async sendPasswordResetConfirmationEmail(email, firstName) {
    const loginUrl = `${process.env.NEXTAUTH_URL}/auth/login`

    // Create confirmation email template
    const confirmationTemplate = {
      subject: 'Password reset successful - {{workspace_name}}',
      content: `Hello {{first_name}},

Your password has been successfully reset for your **{{workspace_name}}** account.

**[Log In Now]({{login_url}})**

**Security Information:**
- Your password was changed on {{reset_date}} at {{reset_time}}
- If you didn't make this change, please contact our support team immediately
- We recommend using a strong, unique password for your account

You can now log in with your new password and continue using {{workspace_name}}.

Best regards,
The {{workspace_name}} Team`,
      requiredVariables: ['first_name', 'workspace_name', 'login_url', 'reset_date', 'reset_time'],
      optionalVariables: ['support_email'],
      type: 'PASSWORD_RESET_CONFIRMATION',
    }

    // Template variables
    const now = new Date()
    const templateVariables = {
      first_name: firstName || 'User',
      workspace_name: process.env.APP_NAME || 'Starboard',
      login_url: loginUrl,
      reset_date: now.toLocaleDateString(),
      reset_time: now.toLocaleTimeString(),
      support_email: process.env.SUPPORT_EMAIL || process.env.EMAIL_FROM,
    }

    // Send email using EmailService
    const result = await EmailService.sendTemplatedEmail(
      confirmationTemplate,
      templateVariables,
      email
    )

    logger.info('Password reset confirmation email sent', {
      email,
      firstName,
      messageId: result.messageId,
      provider: result.provider,
    })

    return result
  }

  /**
   * Clean up expired password reset tokens
   * @returns {number} - Number of tokens cleaned up
   */
  static async cleanupExpiredTokens() {
    try {
      const result = await prisma.user.updateMany({
        where: {
          passwordResetExpiresAt: {
            lt: new Date(),
          },
          passwordResetToken: {
            not: null,
          },
        },
        data: {
          passwordResetToken: null,
          passwordResetExpiresAt: null,
        },
      })

      logger.info('Cleaned up expired password reset tokens', {
        count: result.count,
      })

      return result.count
    } catch (error) {
      logger.error('Failed to cleanup expired password reset tokens', {
        error: error.message,
      })
      throw error
    }
  }
}
