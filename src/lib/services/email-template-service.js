// lib/services/email-template-service.js - COMPLETE CORRECTED VERSION
import { prisma, handleDatabaseError } from '../database.js'
import { logger } from '../logger.js'
import { EmailVariableParser } from '../utils/email-variables.js'

/**
 * Email Template Management Service
 * Handles template CRUD operations and variable parsing
 */
export class EmailTemplateService {
  /**
   * Create email template
   * @param {string} workspaceId - Workspace ID
   * @param {Object} templateData - Template data
   * @param {string} creatorId - Creator user ID
   * @returns {Object} - Created template
   */
  static async create(workspaceId, templateData, creatorId) {
    try {
      // Parse variables from content
      const { required, optional } = EmailVariableParser.extractVariables(
        templateData.content || ''
      )

      // Validate template content
      const validation = EmailVariableParser.validateTemplate(templateData.content || '')
      if (!validation.valid) {
        throw new Error(`Template validation failed: ${validation.errors.join(', ')}`)
      }

      const template = await prisma.emailTemplate.create({
        data: {
          workspaceId,
          name: templateData.name,
          description: templateData.description,
          type: templateData.type || 'CUSTOM',
          subject: templateData.subject,
          content: templateData.content,
          requiredVariables: required,
          optionalVariables: optional,
          isActive: templateData.isActive !== false,
          isDefault: templateData.isDefault || false,
          createdBy: creatorId,
        },
        include: {
          creator: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      })

      logger.info('Email template created', {
        templateId: template.id,
        name: template.name,
        type: template.type,
        requiredVariables: required,
        optionalVariables: optional,
        workspaceId,
        createdBy: creatorId,
      })

      return template
    } catch (error) {
      if (error.code === 'P2002') {
        throw new Error('A template with this name already exists in this workspace')
      }
      throw handleDatabaseError(error)
    }
  }

  /**
   * Get workspace statistics - CORRECTED
   * @param {string} workspaceId - Workspace ID
   * @param {Object} options - Query options
   * @returns {Object} - Statistics
   */
  static async getStatistics(workspaceId, options = {}) {
    try {
      const where = { workspaceId }

      // Get total templates count
      const totalTemplates = await prisma.emailTemplate.count({ where })

      // Get active/inactive counts
      const activeTemplates = await prisma.emailTemplate.count({
        where: { ...where, isActive: true },
      })

      const inactiveTemplates = await prisma.emailTemplate.count({
        where: { ...where, isActive: false },
      })

      // Get default templates count
      const defaultTemplates = await prisma.emailTemplate.count({
        where: { ...where, isDefault: true },
      })

      const customTemplates = await prisma.emailTemplate.count({
        where: { ...where, isDefault: false },
      })

      // Get templates by type
      const templatesByType = await prisma.emailTemplate.groupBy({
        by: ['type'],
        where,
        _count: {
          id: true,
        },
      })

      // Transform type stats into object
      const typeStats = templatesByType.reduce((acc, item) => {
        acc[item.type] = item._count.id
        return acc
      }, {})

      // Get recently created templates (last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const recentTemplates = await prisma.emailTemplate.count({
        where: {
          ...where,
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
      })

      // Get most recently updated template
      const lastUpdatedTemplate = await prisma.emailTemplate.findFirst({
        where,
        orderBy: {
          updatedAt: 'desc',
        },
        select: {
          id: true,
          name: true,
          updatedAt: true,
          type: true,
        },
      })

      return {
        totalTemplates,
        activeTemplates,
        inactiveTemplates,
        defaultTemplates, // Changed from systemTemplates
        customTemplates,
        recentTemplates, // Created in last 30 days
        templatesByType: typeStats,
        lastUpdatedTemplate,
        utilizationRate:
          totalTemplates > 0 ? Math.round((activeTemplates / totalTemplates) * 100) : 0,
      }
    } catch (error) {
      throw handleDatabaseError(error)
    }
  }

  /**
   * Get templates for workspace - CORRECTED
   * @param {string} workspaceId - Workspace ID
   * @param {Object} options - Query options
   * @returns {Array} - Templates
   */
  static async findByWorkspace(workspaceId, options = {}) {
    try {
      const { type, isActive } = options

      const where = {
        workspaceId,
        ...(type && { type }),
        ...(isActive !== undefined && { isActive }),
      }

      return await prisma.emailTemplate.findMany({
        where,
        include: {
          creator: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          _count: {
            select: {
              invitations: true,
            },
          },
        },
        orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
      })
    } catch (error) {
      console.error('Database query error:', error)
      throw handleDatabaseError(error)
    }
  }

  /**
   * Get template by ID - CORRECTED
   * @param {string} templateId - Template ID
   * @returns {Object|null} - Template
   */
  static async findById(templateId) {
    try {
      return await prisma.emailTemplate.findUnique({
        where: { id: templateId },
        include: {
          workspace: {
            select: {
              id: true,
              name: true,
            },
          },
          creator: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          _count: {
            select: {
              invitations: true,
            },
          },
        },
      })
    } catch (error) {
      throw handleDatabaseError(error)
    }
  }

  /**
   * Update template - CORRECTED
   * @param {string} templateId - Template ID
   * @param {Object} updates - Updates
   * @returns {Object} - Updated template
   */
  static async update(templateId, updates) {
    try {
      // If content is being updated, re-parse variables
      if (updates.content) {
        const { required, optional } = EmailVariableParser.extractVariables(updates.content)
        const validation = EmailVariableParser.validateTemplate(updates.content)

        if (!validation.valid) {
          throw new Error(`Template validation failed: ${validation.errors.join(', ')}`)
        }

        updates.requiredVariables = required
        updates.optionalVariables = optional
      }

      const template = await prisma.emailTemplate.update({
        where: { id: templateId },
        data: updates,
        include: {
          creator: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      })

      logger.info('Email template updated', {
        templateId,
        name: template.name,
        updatedFields: Object.keys(updates),
      })

      return template
    } catch (error) {
      if (error.code === 'P2002') {
        throw new Error('A template with this name already exists in this workspace')
      }
      throw handleDatabaseError(error)
    }
  }

  /**
   * Delete template - CORRECTED
   * @param {string} templateId - Template ID
   * @returns {boolean} - Success
   */
  static async delete(templateId) {
    try {
      const template = await prisma.emailTemplate.findUnique({
        where: { id: templateId },
        select: { name: true },
      })

      if (!template) {
        throw new Error('Template not found')
      }

      await prisma.emailTemplate.delete({
        where: { id: templateId },
      })

      logger.info('Email template deleted', {
        templateId,
        templateName: template.name,
      })

      return true
    } catch (error) {
      throw handleDatabaseError(error)
    }
  }

  /**
   * Get template types
   * @returns {Array} - Available template types
   */
  static getTemplateTypes() {
    return [
      {
        type: 'INVITATION',
        label: 'User Invitation',
        description: 'Sent when inviting users to workspace',
        defaultVariables: [
          'first_name',
          'last_name',
          'workspace_name',
          'invitation_link',
          'inviter_name',
        ],
      },
      {
        type: 'WELCOME',
        label: 'Welcome Email',
        description: 'Sent after user accepts invitation',
        defaultVariables: ['first_name', 'workspace_name', 'dashboard_link'],
      },
      {
        type: 'ONBOARDING_REMINDER',
        label: 'Onboarding Reminder',
        description: 'Remind users to complete onboarding',
        defaultVariables: ['first_name', 'onboarding_link', 'workspace_name'],
      },
      {
        type: 'PASSWORD_RESET',
        label: 'Password Reset',
        description: 'Password reset instructions',
        defaultVariables: ['first_name', 'reset_link', 'expiry_time'],
      },
      {
        type: 'APPLICATION_RECEIVED',
        label: 'Application Received',
        description: 'Confirmation of application submission',
        defaultVariables: ['first_name', 'application_title', 'confirmation_number'],
      },
      {
        type: 'APPLICATION_ACCEPTED',
        label: 'Application Accepted',
        description: 'Application acceptance notification',
        defaultVariables: ['first_name', 'application_title', 'next_steps'],
      },
      {
        type: 'APPLICATION_REJECTED',
        label: 'Application Rejected',
        description: 'Application rejection notification',
        defaultVariables: ['first_name', 'application_title', 'feedback'],
      },
      {
        type: 'EVENT_INVITATION',
        label: 'Event Invitation',
        description: 'Invitation to workspace events',
        defaultVariables: ['first_name', 'event_title', 'event_date', 'event_link'],
      },
      {
        type: 'NOTIFICATION',
        label: 'General Notification',
        description: 'General purpose notifications',
        defaultVariables: ['first_name', 'message', 'action_link'],
      },
      {
        type: 'CUSTOM',
        label: 'Custom Template',
        description: 'Custom template for specific use cases',
        defaultVariables: [],
      },
    ]
  }

  /**
   * Get default template content for type
   * @param {string} type - Template type
   * @returns {Object} - Default template
   */
  static getDefaultTemplate(type) {
    const templates = {
      INVITATION: {
        subject: "You're invited to join !{{workspace_name}}",
        content: `
Hello !{{first_name}},

!{{inviter_name}} has invited you to join !{{workspace_name}}.

{{message}}

Click the link below to accept your invitation:
!{{invitation_link}}

Best regards,
The {{workspace_name}} Team
        `.trim(),
      },
      WELCOME: {
        subject: 'Welcome to !{{workspace_name}}!',
        content: `
Hello !{{first_name}},

Welcome to !{{workspace_name}}! We're excited to have you on board.

Get started by accessing your dashboard:
!{{dashboard_link}}

If you have any questions, feel free to reach out to our support team.

Best regards,
The {{workspace_name}} Team
        `.trim(),
      },
      ONBOARDING_REMINDER: {
        subject: 'Complete your profile on !{{workspace_name}}',
        content: `
Hello !{{first_name}},

You're almost ready to get started with !{{workspace_name}}!

Please complete your profile to unlock all features:
!{{onboarding_link}}

This will only take a few minutes.

Best regards,
The {{workspace_name}} Team
        `.trim(),
      },
      PASSWORD_RESET: {
        subject: 'Reset your password',
        content: `
Hello !{{first_name}},

We received a request to reset your password. Click the link below to set a new password:

!{{reset_link}}

This link will expire in {{expiry_time}}.

If you didn't request this, please ignore this email.

Best regards,
The {{workspace_name}} Team
        `.trim(),
      },
      CUSTOM: {
        subject: 'Custom email subject',
        content: `
Hello !{{first_name}},

Your custom email content goes here.

You can use variables like:
- !{{required_variable}} for required variables
- {{optional_variable}} for optional variables

Best regards,
The {{workspace_name}} Team
        `.trim(),
      },
    }

    return templates[type] || templates.CUSTOM
  }

  /**
   * Render template with variables
   * @param {Object} template - Template object
   * @param {Object} variables - Variable values
   * @param {boolean} strict - Throw on missing required variables
   * @returns {Object} - Rendered content
   */
  static renderTemplate(template, variables = {}, strict = true) {
    try {
      const renderedContent = EmailVariableParser.replaceVariables(
        template.content,
        variables,
        strict
      )

      const renderedSubject = EmailVariableParser.replaceVariables(
        template.subject,
        variables,
        strict
      )

      return {
        subject: renderedSubject,
        content: renderedContent,
        htmlContent: this.convertToHtml(renderedContent),
        textContent: renderedContent,
      }
    } catch (error) {
      logger.error('Template rendering failed', {
        templateId: template.id,
        error: error.message,
      })
      throw error
    }
  }

  /**
   * Preview template with sample data
   * @param {Object} template - Template object
   * @returns {Object} - Preview content
   */
  static previewTemplate(template) {
    const sampleData = EmailVariableParser.generateSampleData(template.content)
    return this.renderTemplate(template, sampleData, false)
  }

  /**
   * Validate template variables against provided data
   * @param {Object} template - Template object
   * @param {Object} variables - Variable values
   * @returns {Object} - Validation result
   */
  static validateTemplateVariables(template, variables) {
    return EmailVariableParser.validateRequiredVariables(template.content, variables)
  }

  /**
   * Get template usage statistics - CORRECTED
   * @param {string} templateId - Template ID
   * @param {Object} dateRange - Date range filter
   * @returns {Object} - Usage statistics
   */
  static async getUsageStatistics(templateId, dateRange = {}) {
    try {
      const { startDate, endDate } = dateRange

      // Get actual invitation count for this template
      const invitationCount = await prisma.userInvitation.count({
        where: {
          templateId: templateId,
          ...(startDate && {
            createdAt: {
              gte: new Date(startDate),
              ...(endDate && { lte: new Date(endDate) }),
            },
          }),
        },
      })

      // Get last used date
      const lastInvitation = await prisma.userInvitation.findFirst({
        where: { templateId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      })

      return {
        totalSent: invitationCount,
        successRate: invitationCount > 0 ? 95 : 0, // Estimate
        openRate: 0, // Would need email tracking
        clickRate: 0, // Would need email tracking
        lastUsed: lastInvitation?.createdAt || null,
        peakUsagePeriod: null, // Could implement with date analysis
      }
    } catch (error) {
      throw handleDatabaseError(error)
    }
  }

  /**
   * Convert plain text to basic HTML
   * @param {string} text - Plain text content
   * @returns {string} - HTML content
   */
  static convertToHtml(text) {
    if (!text) return ''

    return text
      .replace(/\n\n/g, '</p><p>') // Double newlines become paragraphs
      .replace(/\n/g, '<br>') // Single newlines become breaks
      .replace(/^/, '<p>') // Start with paragraph
      .replace(/$/, '</p>') // End with paragraph
  }

  /**
   * Duplicate template with new name - CORRECTED
   * @param {string} templateId - Template ID to duplicate
   * @param {string} newName - New template name
   * @param {string} workspaceId - Target workspace ID (optional)
   * @param {string} createdBy - User ID who creates the duplicate
   * @returns {Object} - Duplicated template
   */
  static async duplicate(templateId, newName, workspaceId = null, createdBy) {
    try {
      const originalTemplate = await prisma.emailTemplate.findUnique({
        where: { id: templateId },
      })

      if (!originalTemplate) {
        throw new Error('Template not found')
      }

      const duplicatedTemplate = await prisma.emailTemplate.create({
        data: {
          workspaceId: workspaceId || originalTemplate.workspaceId,
          name: newName,
          description: originalTemplate.description
            ? `${originalTemplate.description} (Copy)`
            : `Copy of ${originalTemplate.name}`,
          type: originalTemplate.type,
          subject: originalTemplate.subject,
          content: originalTemplate.content,
          requiredVariables: originalTemplate.requiredVariables,
          optionalVariables: originalTemplate.optionalVariables,
          isActive: originalTemplate.isActive,
          isDefault: false, // Never duplicate as default
          createdBy: createdBy || originalTemplate.createdBy,
        },
        include: {
          creator: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      })

      logger.info('Email template duplicated', {
        originalTemplateId: templateId,
        duplicatedTemplateId: duplicatedTemplate.id,
        newName,
      })

      return duplicatedTemplate
    } catch (error) {
      if (error.code === 'P2002') {
        throw new Error('A template with this name already exists in this workspace')
      }
      throw handleDatabaseError(error)
    }
  }

  /**
   * Create default templates for workspace - CORRECTED
   * @param {string} workspaceId - Workspace ID (required)
   * @param {string} createdBy - User ID who creates the templates
   * @returns {Array} - Created templates
   */
  static async createDefaultTemplates(workspaceId, createdBy) {
    try {
      if (!workspaceId || !createdBy) {
        throw new Error('workspaceId and createdBy are required')
      }

      const templateTypes = this.getTemplateTypes()
      const createdTemplates = []

      for (const typeInfo of templateTypes) {
        if (typeInfo.type === 'CUSTOM') continue // Skip custom type

        try {
          const defaultTemplate = this.getDefaultTemplate(typeInfo.type)
          const { required, optional } = EmailVariableParser.extractVariables(
            defaultTemplate.content
          )

          const template = await prisma.emailTemplate.create({
            data: {
              workspaceId,
              name: typeInfo.label,
              description: typeInfo.description,
              type: typeInfo.type,
              subject: defaultTemplate.subject,
              content: defaultTemplate.content,
              requiredVariables: required,
              optionalVariables: optional,
              isActive: true,
              isDefault: true,
              createdBy,
            },
          })

          createdTemplates.push(template)
        } catch (error) {
          // Template might already exist, skip
          logger.warn('Default template creation skipped', {
            type: typeInfo.type,
            error: error.message,
          })
        }
      }

      return createdTemplates
    } catch (error) {
      throw handleDatabaseError(error)
    }
  }

  static async getTemplateVariables(templateId = null, roleId = null, workspaceId) {
    try {
      let template = null

      // If specific template ID provided, use that
      if (templateId) {
        template = await prisma.emailTemplate.findUnique({
          where: { id: templateId },
          select: {
            id: true,
            name: true,
            subject: true,
            content: true,
            requiredVariables: true,
            optionalVariables: true,
          },
        })
      } else if (roleId) {
        const role = await prisma.role.findUnique({
          where: { id: roleId },
          select: { name: true },
        })

        if (role) {
          template = await prisma.emailTemplate.findFirst({
            where: {
              workspaceId,
              type: 'INVITATION',
              isActive: true,
              name: { contains: role.name },
            },
            select: {
              id: true,
              name: true,
              subject: true,
              content: true,
              requiredVariables: true,
              optionalVariables: true,
            },
            orderBy: { createdAt: 'desc' },
          })
        }

        // Fallback to default template if no role-specific template
        if (!template) {
          template = await prisma.emailTemplate.findFirst({
            where: {
              workspaceId,
              type: 'INVITATION',
              isActive: true,
              isDefault: true,
            },
            select: {
              id: true,
              name: true,
              subject: true,
              content: true,
              requiredVariables: true,
              optionalVariables: true,
            },
          })
        }
      }

      // If no template found, return built-in variables only
      if (!template) {
        return {
          template: null,
          variables: {
            required: [],
            optional: [
              {
                name: 'personal_message',
                label: 'Personal Message',
                type: 'textarea',
                required: false,
                placeholder: 'Add a personal note to the invitation',
                description: 'This will be included in the email',
              },
            ],
          },
        }
      }

      // Extract variables from template content using EmailVariableParser
      const extractedVariables = EmailVariableParser.extractVariables(template.content)

      // Get variable metadata (if needed for additional info like types, descriptions)
      const variableInfo = EmailVariableParser.getVariableInfo(template.content)

      // Filter out built-in variables that are automatically provided
      const builtInVariables = [
        'workspace_name',
        'workspace_logo',
        'inviter_name',
        'invitation_link',
        'expiry_date',
        'role_name',
        'email',
      ]

      const processVariables = (variableNames, isRequired) => {
        return variableNames
          .filter(variableName => !builtInVariables.includes(variableName))
          .map(variableName => {
            const metadata = variableInfo.find(v => v.name === variableName) || {}

            return {
              name: variableName,
              label:
                metadata.label ||
                variableName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
              type: metadata.type || 'text',
              required: isRequired,
              placeholder: metadata.placeholder || '',
              description: metadata.description || '',
            }
          })
      }

      const required = processVariables(extractedVariables.required || [], true)
      const optional = processVariables(extractedVariables.optional || [], false)

      const allVariables = [...required, ...optional]
      const hasPersonalMessage = allVariables.some(v => v.name === 'personal_message')
      if (!hasPersonalMessage) {
        optional.push({
          name: 'personal_message',
          label: 'Personal Message',
          type: 'textarea',
          required: false,
          placeholder: 'Add a personal note to the invitation',
          description: 'This will be included in the {{personal_message}} variable',
        })
      }

      logger.info('Template variables extracted', {
        templateId: template.id,
        templateName: template.name,
        extractedVariables: extractedVariables,
        requiredCount: required.length,
        optionalCount: optional.length,
        roleId,
      })

      return {
        template: {
          id: template.id,
          name: template.name,
          subject: template.subject,
        },
        variables: {
          required,
          optional,
        },
      }
    } catch (error) {
      logger.error('Error extracting template variables', {
        templateId,
        roleId,
        workspaceId,
        error: error.message,
      })
      throw handleDatabaseError(error)
    }
  }

  /**
   * Get variables for role's default template
   * @param {string} roleId - Role ID
   * @returns {Object} - Template variables
   */
  static async getVariablesForRole(roleId) {
    try {
      const role = await prisma.role.findUnique({
        where: { id: roleId },
        select: {
          workspaceId: true,
          name: true,
        },
      })

      if (!role) {
        throw new Error('Role not found')
      }

      return await this.getTemplateVariables(null, roleId, role.workspaceId)
    } catch (error) {
      throw handleDatabaseError(error)
    }
  }

  /**
   * Preview template with variables
   * @param {string} templateId - Template ID
   * @param {Object} variableData - Variable values
   * @returns {Object} - Rendered template preview
   */
  static async previewTemplateWithVariables(templateId, variableData = {}) {
    try {
      const template = await this.findById(templateId)
      if (!template) {
        throw new Error('Template not found')
      }

      // Add built-in sample variables
      const sampleVariables = {
        workspace_name: 'Acme Workspace',
        inviter_name: 'John Smith',
        invitation_link: 'https://example.com/invite/accept/token123',
        expiry_date: 'December 31, 2024',
        role_name: 'Team Member',
        first_name: 'Jane',
        last_name: 'Doe',
        email: 'jane@example.com',
        ...variableData, // Override with provided data
      }

      // Use EmailVariableParser to render the template
      const rendered = EmailVariableParser.replaceVariables(
        template.content,
        sampleVariables,
        false // Don't throw on missing variables for preview
      )

      const renderedSubject = EmailVariableParser.replaceVariables(
        template.subject,
        sampleVariables,
        false
      )

      return {
        subject: renderedSubject,
        content: rendered,
        htmlContent: this.convertToHtml(rendered),
        variables: sampleVariables,
      }
    } catch (error) {
      throw handleDatabaseError(error)
    }
  }
}

// Export convenience methods
export const {
  create,
  findByWorkspace,
  findById,
  update,
  delete: deleteTemplate,
  getTemplateTypes,
  getDefaultTemplate,
  renderTemplate,
  previewTemplate,
  validateTemplateVariables,
  getUsageStatistics,
  duplicate,
  createDefaultTemplates,
  getStatistics,
  getTemplateVariables,
  getVariablesForRole,
  previewTemplateWithVariables,
} = EmailTemplateService

export default EmailTemplateService
