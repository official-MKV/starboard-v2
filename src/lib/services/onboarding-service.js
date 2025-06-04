// lib/services/onboarding-service.js - ADD EMAIL INTEGRATION

import { EmailService } from './email-service.js'
import { prisma } from '../database.js'
import logger from '@/lib/logger'
// import { handleDatabaseError } from '@/lib/error-handler'

export class OnboardingService {
  static async completeOnboarding(userId, workspaceId, profileData) {
    try {
      const member = await prisma.workspaceMember.findFirst({
        where: { userId, workspaceId, isActive: true },
        include: {
          role: {
            select: {
              requiresOnboarding: true,
              onboardingForm: true,
            },
          },
          workspace: {
            select: {
              id: true,
              name: true,
              logo: true,
              settings: true,
            },
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              isOnboardingCompleted: true,
            },
          },
        },
      })

      if (!member) {
        throw new Error('User is not a member of this workspace')
      }

      if (!member.role.requiresOnboarding) {
        throw new Error('Onboarding not required for this role')
      }

      if (member.user.isOnboardingCompleted) {
        throw new Error('Onboarding already completed')
      }

      const validation = this.validateOnboardingData(member.role.onboardingForm, profileData)
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`)
      }

      const { profileFields, customFields } = this.categorizeFields(profileData)

      const updatedUser = await prisma.$transaction(async tx => {
        const user = await tx.user.update({
          where: { id: userId },
          data: {
            ...profileFields,
            profileData: customFields,
            isOnboardingCompleted: true,
            onboardingCompletedAt: new Date(),
          },
        })

        await tx.workspaceMember.updateMany({
          where: { userId, workspaceId },
          data: {
            onboardingRequired: false,
            onboardingCompletedAt: new Date(),
          },
        })

        return user
      })

      logger.info('Onboarding completed', {
        userId,
        workspaceId,
        profileFieldsUpdated: Object.keys(profileFields),
        customFieldsCount: Object.keys(customFields).length,
        hasFiles: this.hasUploadedFiles(profileData),
      })

      // Attempt to send welcome email
      try {
        const shouldSendWelcomeEmail = member.workspace.settings?.sendWelcomeEmail !== false

        if (shouldSendWelcomeEmail) {
          await this.sendWelcomeEmail(member.user, member.workspace)

          logger.info('Welcome email sent after onboarding completion', {
            userId,
            workspaceId,
            email: member.user.email,
          })
        }
      } catch (emailError) {
        logger.error('Failed to send welcome email after onboarding', {
          userId,
          workspaceId,
          error: emailError.message,
        })
      }

      return updatedUser
    } catch (error) {
      console.log(error)
      // throw handleDatabaseError(error)
    }
  }

  /**
   * Validate onboarding data against role requirements
   * @param {object} onboardingForm - Role's onboarding form schema
   * @param {object} profileData - Submitted profile data
   * @returns {object} - Validation result
   */
  static validateOnboardingData(onboardingForm, profileData) {
    const errors = []

    if (!onboardingForm?.fields) {
      return { valid: true, errors: [] }
    }

    const requiredFields = onboardingForm.fields.filter(field => field.required)

    for (const field of requiredFields) {
      const value = profileData[field.name]

      // Check for empty values
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        errors.push(`${field.label} is required`)
        continue
      }

      // Check for empty arrays (checkboxes, multi-select)
      if (field.type === 'checkbox' && Array.isArray(value) && value.length === 0) {
        errors.push(`${field.label} is required`)
        continue
      }

      // Check for file upload fields
      if (
        field.type === 'file_upload' ||
        field.type === 'multi_file' ||
        field.type === 'image_upload'
      ) {
        if (!value || (Array.isArray(value) && value.length === 0)) {
          errors.push(`${field.label} is required`)
          continue
        }

        // Validate file objects have required properties
        const files = Array.isArray(value) ? value : [value]
        for (const file of files) {
          if (!file.fileUrl || !file.originalName) {
            errors.push(`${field.label} has invalid file data`)
            break
          }
        }
      }

      // Field-specific validation
      if (field.validation) {
        const fieldErrors = this.validateFieldValue(field, value)
        errors.push(...fieldErrors)
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * Validate individual field value based on field configuration
   * @param {object} field - Field configuration
   * @param {any} value - Field value
   * @returns {array} - Array of error messages
   */
  static validateFieldValue(field, value) {
    const errors = []
    const { validation } = field

    if (!validation) return errors

    // String length validation
    if (validation.minLength && typeof value === 'string' && value.length < validation.minLength) {
      errors.push(`${field.label} must be at least ${validation.minLength} characters`)
    }

    if (validation.maxLength && typeof value === 'string' && value.length > validation.maxLength) {
      errors.push(`${field.label} cannot exceed ${validation.maxLength} characters`)
    }

    // Number validation
    if (validation.minValue && typeof value === 'number' && value < validation.minValue) {
      errors.push(`${field.label} must be at least ${validation.minValue}`)
    }

    if (validation.maxValue && typeof value === 'number' && value > validation.maxValue) {
      errors.push(`${field.label} cannot exceed ${validation.maxValue}`)
    }

    // Pattern validation
    if (validation.pattern && typeof value === 'string') {
      const regex = new RegExp(validation.pattern)
      if (!regex.test(value)) {
        errors.push(`${field.label} format is invalid`)
      }
    }

    // Email validation
    if (field.type === 'email' && typeof value === 'string') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(value)) {
        errors.push(`${field.label} must be a valid email address`)
      }
    }

    return errors
  }

  /**
   * Categorize profile data into core user fields and custom fields
   * @param {object} profileData - All profile data including files
   * @returns {object} - Separated profile and custom fields
   */
  static categorizeFields(profileData) {
    // Core user profile fields that map directly to User model
    const coreFields = [
      'firstName',
      'lastName',
      'phone',
      'bio',
      'location',
      'address',
      'company',
      'jobTitle',
      'website',
      'linkedIn',
      'twitter',
      'timezone',
      'language',
    ]

    const profileFields = {}
    const customFields = {}

    for (const [key, value] of Object.entries(profileData)) {
      if (coreFields.includes(key)) {
        profileFields[key] = value
      } else if (key === 'avatar' && value?.fileUrl) {
        // Handle avatar specially - goes to User.avatar field
        profileFields.avatar = value.fileUrl
        // Also store full file metadata in custom fields
        customFields.avatarMetadata = value
      } else {
        // Everything else goes to custom fields (including uploaded files)
        customFields[key] = value
      }
    }

    return { profileFields, customFields }
  }

  /**
   * Check if profile data contains uploaded files
   * @param {object} profileData - Profile data
   * @returns {boolean} - True if files are present
   */
  static hasUploadedFiles(profileData) {
    return Object.values(profileData).some(value => {
      if (Array.isArray(value)) {
        return value.some(item => item && typeof item === 'object' && item.fileUrl)
      }
      return value && typeof value === 'object' && value.fileUrl
    })
  }

  /**
   * Send welcome email after onboarding completion
   * @param {object} userData
   * @param {object} workspaceData
   * @returns {boolean}
   */
  static async sendWelcomeEmail(userData, workspaceData) {
    try {
      let template = await prisma.emailTemplate.findFirst({
        where: {
          workspaceId: workspaceData.id,
          type: 'WELCOME',
          isActive: true,
        },
        orderBy: { isDefault: 'desc' },
      })

      if (!template) {
        template = {
          subject: 'Welcome to {{workspace_name}}! 🎉',
          content: `Hello {{first_name}},

**Congratulations!** Your profile is now complete and you have full access to {{workspace_name}}.

Here's what you can do next:
- **[Explore your dashboard]({{dashboard_link}})** - Your personalized workspace
- **[Browse upcoming events]({{events_link}})** - Join workshops and networking sessions
- **[Access resources]({{resources_link}})** - Download guides and materials
- **[Connect with the community]({{community_link}})** - Meet other members

If you have any questions, feel free to reach out to our support team.

Best regards,
The {{workspace_name}} Team`,
          requiredVariables: ['first_name', 'workspace_name'],
          optionalVariables: ['dashboard_link', 'events_link', 'resources_link'],
        }
      }

      const templateVariables = {
        first_name: userData.firstName,
        last_name: userData.lastName,
        workspace_name: workspaceData.name,
        workspace_logo: workspaceData.logo || '',
        dashboard_link: `${process.env.NEXTAUTH_URL}/dashboard`,
        events_link: `${process.env.NEXTAUTH_URL}/events`,
        resources_link: `${process.env.NEXTAUTH_URL}/resources`,
        community_link: `${process.env.NEXTAUTH_URL}/community`,
        profile_link: `${process.env.NEXTAUTH_URL}/profile`,
      }

      await EmailService.sendTemplatedEmail(template, templateVariables, userData.email)

      logger.info('Welcome email sent', {
        userId: userData.id,
        workspaceId: workspaceData.id,
        email: userData.email,
      })

      return true
    } catch (error) {
      logger.error('Failed to send welcome email', {
        userId: userData.id,
        workspaceId: workspaceData.id,
        error: error.message,
      })
      throw error
    }
  }

  /**
   * Send onboarding reminder email
   * @param {string} userId
   * @param {string} workspaceId
   * @returns {boolean}
   */
  static async sendOnboardingReminder(userId, workspaceId) {
    try {
      const [user, workspace] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        }),
        prisma.workspace.findUnique({
          where: { id: workspaceId },
          select: {
            id: true,
            name: true,
            logo: true,
          },
        }),
      ])

      if (!user || !workspace) {
        throw new Error('User or workspace not found')
      }

      let template = await prisma.emailTemplate.findFirst({
        where: {
          workspaceId,
          type: 'ONBOARDING_REMINDER',
          isActive: true,
        },
      })

      if (!template) {
        template = {
          subject: 'Complete your profile on {{workspace_name}} 📝',
          content: `Hello {{first_name}},

We noticed you haven't completed your profile on **{{workspace_name}}**.

To get the most out of your membership, please take a few minutes to complete your profile setup:

**[Complete your profile now]({{onboarding_link}})**

Once you're done, you'll have access to:
- Exclusive member resources
- Event registrations
- Community features
- Personalized dashboard

If you need help, contact us at {{support_email}}.

Best regards,
The {{workspace_name}} Team`,
          requiredVariables: ['first_name', 'workspace_name', 'onboarding_link'],
          optionalVariables: ['support_email'],
        }
      }

      const templateVariables = {
        first_name: user.firstName,
        last_name: user.lastName,
        workspace_name: workspace.name,
        workspace_logo: workspace.logo || '',
        onboarding_link: `${process.env.NEXTAUTH_URL}/onboarding`,
        dashboard_link: `${process.env.NEXTAUTH_URL}/dashboard`,
        support_email: process.env.EMAIL_USER || 'support@mystarboard.ng',
      }

      await EmailService.sendTemplatedEmail(template, templateVariables, user.email)

      logger.info('Onboarding reminder email sent', {
        userId,
        workspaceId,
        email: user.email,
      })

      return true
    } catch (error) {
      logger.error('Failed to send onboarding reminder email', {
        userId,
        workspaceId,
        error: error.message,
      })
      throw error
    }
  }

  /**
   * Send bulk onboarding reminders
   * @param {string} workspaceId
   * @param {Array<string>} userIds
   * @returns {object}
   */
  static async sendBulkOnboardingReminders(workspaceId, userIds = null) {
    try {
      const whereClause = {
        workspaceId,
        isActive: true,
        onboardingRequired: true,
        role: { requiresOnboarding: true },
      }

      if (userIds && userIds.length > 0) {
        whereClause.userId = { in: userIds }
      }

      const pendingMembers = await prisma.workspaceMember.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      })

      const results = {
        successful: [],
        failed: [],
      }

      for (const member of pendingMembers) {
        try {
          await this.sendOnboardingReminder(member.user.id, workspaceId)
          results.successful.push({
            userId: member.user.id,
            email: member.user.email,
          })

          await new Promise(resolve => setTimeout(resolve, 500)) // Rate limit
        } catch (error) {
          results.failed.push({
            userId: member.user.id,
            email: member.user.email,
            error: error.message,
          })
        }
      }

      logger.info('Bulk onboarding reminders sent', {
        workspaceId,
        total: pendingMembers.length,
        successful: results.successful.length,
        failed: results.failed.length,
      })

      return results
    } catch (error) {
      logger.error('Failed to send bulk onboarding reminders', {
        workspaceId,
        error: error.message,
      })
      throw error
    }
  }
}
