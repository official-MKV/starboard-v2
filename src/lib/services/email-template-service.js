import { prisma, handleDatabaseError } from '../database.js'
import { logger } from '../logger.js'
import { EmailVariableParser } from '../utils/email-variables.js'

export class EmailTemplateService {
  static async create(workspaceId, templateData, creatorId) {
    try {
      const { required, optional } = EmailVariableParser.extractVariables(
        templateData.content || ''
      )

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

  static async getStatistics(workspaceId, options = {}) {
    try {
      const where = { workspaceId }

      const totalTemplates = await prisma.emailTemplate.count({ where })
      const activeTemplates = await prisma.emailTemplate.count({
        where: { ...where, isActive: true },
      })
      const inactiveTemplates = await prisma.emailTemplate.count({
        where: { ...where, isActive: false },
      })
      const defaultTemplates = await prisma.emailTemplate.count({
        where: { ...where, isDefault: true },
      })
      const customTemplates = await prisma.emailTemplate.count({
        where: { ...where, isDefault: false },
      })

      const templatesByType = await prisma.emailTemplate.groupBy({
        by: ['type'],
        where,
        _count: {
          id: true,
        },
      })

      const typeStats = templatesByType.reduce((acc, item) => {
        acc[item.type] = item._count.id
        return acc
      }, {})

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
        defaultTemplates,
        customTemplates,
        recentTemplates,
        templatesByType: typeStats,
        lastUpdatedTemplate,
        utilizationRate:
          totalTemplates > 0 ? Math.round((activeTemplates / totalTemplates) * 100) : 0,
      }
    } catch (error) {
      throw handleDatabaseError(error)
    }
  }

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

  static async update(templateId, updates) {
    try {
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

  static previewTemplate(template) {
    const sampleData = EmailVariableParser.generateSampleData(template.content)
    return this.renderTemplate(template, sampleData, false)
  }

  static validateTemplateVariables(template, variables) {
    return EmailVariableParser.validateRequiredVariables(template.content, variables)
  }

  static async getUsageStatistics(templateId, dateRange = {}) {
    try {
      const { startDate, endDate } = dateRange

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

      const lastInvitation = await prisma.userInvitation.findFirst({
        where: { templateId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      })

      return {
        totalSent: invitationCount,
        successRate: invitationCount > 0 ? 95 : 0,
        openRate: 0,
        clickRate: 0,
        lastUsed: lastInvitation?.createdAt || null,
        peakUsagePeriod: null,
      }
    } catch (error) {
      throw handleDatabaseError(error)
    }
  }

  static convertToHtml(text) {
    if (!text) return ''

    return text
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>')
  }

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
          isDefault: false,
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

  static async createDefaultTemplates(workspaceId, createdBy) {
    try {
      if (!workspaceId || !createdBy) {
        throw new Error('workspaceId and createdBy are required')
      }

      const templateTypes = this.getTemplateTypes()
      const createdTemplates = []

      for (const typeInfo of templateTypes) {
        if (typeInfo.type === 'CUSTOM') continue

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
              OR: [
                { name: `${role.name} Invitation` },
                { name: { contains: role.name } }
              ]
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

      const extractedVariables = EmailVariableParser.extractVariables(template.content)
      const variableInfo = EmailVariableParser.getVariableInfo(template.content)

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

  static async previewTemplateWithVariables(templateId, variableData = {}) {
    try {
      const template = await this.findById(templateId)
      if (!template) {
        throw new Error('Template not found')
      }

      const sampleVariables = {
        workspace_name: 'Acme Workspace',
        inviter_name: 'John Smith',
        invitation_link: 'https://example.com/invite/accept/token123',
        expiry_date: 'December 31, 2024',
        role_name: 'Team Member',
        first_name: 'Jane',
        last_name: 'Doe',
        email: 'jane@example.com',
        ...variableData,
      }

      const rendered = EmailVariableParser.replaceVariables(
        template.content,
        sampleVariables,
        false
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