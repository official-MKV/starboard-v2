import { prisma, handleDatabaseError } from '../database.js'
import { logger } from '../logger.js'
import { generateId } from '../utils.js'
import { EmailTemplateService } from './email-template-service.js'
import { EmailVariableParser } from '../utils/email-variables.js'
import bcrypt from 'bcryptjs'
import EmailService from './email-service.js'

export class InvitationService {
  static async create(workspaceId, invitationData, invitedBy) {
    try {
      if (!invitationData.email || !invitationData.roleId) {
        throw new Error('Email and role are required')
      }

      const existingInvitation = await prisma.userInvitation.findFirst({
        where: {
          workspaceId,
          email: invitationData.email.toLowerCase(),
          isAccepted: false,
          expiresAt: { gt: new Date() },
        },
      })

      if (existingInvitation) {
        throw new Error('User already has a pending invitation')
      }

      const existingMember = await prisma.user.findUnique({
        where: { email: invitationData.email.toLowerCase() },
        include: {
          workspaceMembers: {
            where: { workspaceId, isActive: true },
          },
        },
      })

      if (existingMember?.workspaceMembers?.length > 0) {
        throw new Error('User is already a member of this workspace')
      }

      const role = await prisma.role.findUnique({
        where: { id: invitationData.roleId },
        include: {
          onboarding: true,
          workspace: true,
        },
      })

      if (!role) {
        throw new Error('Role not found')
      }

      let emailTemplate = await prisma.emailTemplate.findFirst({
        where: {
          workspaceId,
          type: 'INVITATION',
          isActive: true,
          name: { contains: role.name },
        },
        orderBy: { createdAt: 'desc' },
      })

      if (!emailTemplate) {
        emailTemplate = await prisma.emailTemplate.findFirst({
          where: {
            workspaceId,
            type: 'INVITATION',
            isActive: true,
            isDefault: true,
          },
        })
      }

      const inviter = await prisma.user.findUnique({
        where: { id: invitedBy },
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      })

      if (!inviter) {
        throw new Error('Inviter not found')
      }

      const token = generateId(32)
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      const invitation = await prisma.userInvitation.create({
        data: {
          workspaceId,
          email: invitationData.email.toLowerCase(),
          roleId: invitationData.roleId,
          templateId: emailTemplate?.id || null,
          token,
          expiresAt,
          variableData: invitationData.variableData || {},
          personalMessage: invitationData.personalMessage || null,
          createdBy: invitedBy,
          onboardingFlowId: role.onboardingId || null,
        },
        include: {
          workspace: true,
          role: {
            include: {
              onboarding: true,
            },
          },
          template: true,
        },
      })

      await this.sendInvitationEmail(invitation, inviter, invitationData.variableData || {})

      logger.info('Workspace invitation created', {
        invitationId: invitation.id,
        email: invitation.email,
        roleId: invitation.roleId,
        templateId: invitation.templateId,
        workspaceId,
        invitedBy,
        hasOnboarding: !!invitation.onboardingFlowId,
      })

      return {
        ...invitation,
        inviter,
      }
    } catch (error) {
      throw handleDatabaseError(error)
    }
  }

  static async validateBulkInvitation(workspaceId, emails, roleId) {
    const results = {
      valid: [],
      invalid: []
    }

    for (const email of emails) {
      try {
        const existingMember = await prisma.workspaceMember.findFirst({
          where: {
            workspaceId,
            user: { email: email.toLowerCase() }
          },
          include: {
            user: { select: { firstName: true, lastName: true } },
            role: { select: { name: true } }
          }
        })

        if (existingMember) {
          results.invalid.push({
            email,
            error: 'USER_EXISTS',
            message: `${existingMember.user.firstName} ${existingMember.user.lastName} is already a member with role "${existingMember.role.name}"`
          })
          continue
        }

        const existingInvitation = await prisma.userInvitation.findFirst({
          where: {
            workspaceId,
            email: email.toLowerCase(),
            isAccepted: false,
            expiresAt: { gt: new Date() }
          },
          include: { role: { select: { name: true } } }
        })

        if (existingInvitation) {
          results.invalid.push({
            email,
            error: 'INVITATION_EXISTS', 
            message: `Active invitation already exists for "${existingInvitation.role.name}" role`
          })
          continue
        }

        results.valid.push(email)
      } catch (error) {
        results.invalid.push({
          email,
          error: 'VALIDATION_ERROR',
          message: error.message
        })
      }
    }

    return results
  }

  static async findByToken(token) {
    try {
      const invitation = await prisma.userInvitation.findUnique({
        where: { token },
        include: {
          workspace: {
            select: {
              id: true,
              name: true,
              slug: true,
              description: true,
              logo: true,
            },
          },
          role: {
            select: {
              id: true,
              name: true,
              description: true,
              color: true,
              requiresOnboarding: true,
              onboardingForm: true,
            },
          },
          onboardingFlow: {
            select: {
              id: true,
              name: true,
              description: true,
              customFields: true,
              requireTermsAccept: true,
              termsAndConditions: true,
              settings: true,
            },
          },
          template: {
            select: {
              id: true,
              name: true,
              subject: true,
            },
          },
        },
      })

      if (!invitation) {
        return null
      }

      let onboardingForm = null

      if (invitation.onboardingFlow && invitation.onboardingFlow.customFields) {
        onboardingForm = {
          fields: invitation.onboardingFlow.customFields,
          settings: invitation.onboardingFlow.settings || {},
          requireTermsAccept: invitation.onboardingFlow.requireTermsAccept,
          termsAndConditions: invitation.onboardingFlow.termsAndConditions,
        }
      } else if (invitation.role.onboardingForm && invitation.role.onboardingForm.fields) {
        onboardingForm = invitation.role.onboardingForm
      }

      return {
        ...invitation,
        requiresOnboarding: invitation.role.requiresOnboarding,
        onboardingForm,
      }
    } catch (error) {
      throw handleDatabaseError(error)
    }
  }

  static async sendInvitationEmail(invitation, inviter, variableData = {}) {
    try {
      let template = invitation.template

      if (!template) {
        template = {
          subject: "You're invited to join {{workspace_name}}",
          content: `Hello {{first_name}},

{{inviter_name}} has invited you to join {{workspace_name}} as a {{role_name}}.

{{personal_message}}

Click the link below to accept your invitation:
{{invitation_link}}

This invitation expires on {{expiry_date}}.

Best regards,
The {{workspace_name}} Team`,
          requiredVariables: ['first_name', 'workspace_name', 'inviter_name', 'invitation_link'],
          optionalVariables: ['role_name', 'personal_message', 'expiry_date'],
        }
      }

      const templateVariables = {
        first_name: invitation.email.split('@')[0],
        last_name: '',
        email: invitation.email,
        workspace_name: invitation.workspace.name,
        workspace_logo: invitation.workspace.logo || '',
        role_name: invitation.role.name,
        inviter_name: `${inviter.firstName} ${inviter.lastName}`,
        invitation_link: `${process.env.NEXTAUTH_URL}/invitations/accept/${invitation.token}`,
        expiry_date: invitation.expiresAt.toLocaleDateString(),
        personal_message: invitation.personalMessage || '',
        ...variableData,
      }

      try {
        await EmailService.sendTemplatedEmail(template, templateVariables, invitation.email)

        logger.info('Invitation email sent successfully', {
          invitationId: invitation.id,
          email: invitation.email,
          templateId: template.id || 'system',
          templateName: template.name || 'Default',
        })

        return true
      } catch (emailError) {
        logger.error('Failed to send invitation email', {
          invitationId: invitation.id,
          email: invitation.email,
          error: emailError.message,
        })
        throw emailError
      }
    } catch (error) {
      logger.error('Error in sendInvitationEmail', {
        invitationId: invitation.id,
        error: error.message,
      })
      throw error
    }
  }

  static async countByWorkspace(workspaceId, options = {}) {
    try {
      const { status = 'all', roleId = null, search = '' } = options

      const where = {
        workspaceId,
        ...(roleId && { roleId }),
        ...(search && {
          email: {
            contains: search,
            mode: 'insensitive',
          },
        }),
      }

      if (status === 'PENDING') {
        where.isAccepted = false
        where.expiresAt = { gt: new Date() }
      } else if (status === 'ACCEPTED') {
        where.isAccepted = true
      } else if (status === 'EXPIRED') {
        where.isAccepted = false
        where.expiresAt = { lte: new Date() }
      }

      const count = await prisma.userInvitation.count({ where })
      return count
    } catch (error) {
      throw handleDatabaseError(error)
    }
  }

  static async bulkCreate(options) {
    try {
      const {
        workspaceId,
        emails,
        roleId,
        inviterId,
        message,
        expiresAt,
        sendEmail = true,
      } = options

      const results = {
        successful: [],
        failed: [],
      }

      for (const email of emails) {
        try {
          const invitation = await this.create(
            workspaceId,
            {
              email,
              roleId,
              personalMessage: message,
              variableData: {},
            },
            inviterId
          )

          results.successful.push({
            email,
            invitationId: invitation.id,
            token: invitation.token,
          })
        } catch (error) {
          results.failed.push({
            email,
            error: error.message,
          })
        }
      }

      return results
    } catch (error) {
      throw handleDatabaseError(error)
    }
  }

  static async findByWorkspace(workspaceId, options = {}) {
    try {
      const { status = 'all', roleId = null, search = '', limit = 50, offset = 0 } = options

      const where = {
        workspaceId,
        ...(roleId && { roleId }),
        ...(search && {
          email: {
            contains: search,
            mode: 'insensitive',
          },
        }),
      }

      if (status === 'PENDING') {
        where.isAccepted = false
        where.expiresAt = { gt: new Date() }
      } else if (status === 'ACCEPTED') {
        where.isAccepted = true
      } else if (status === 'EXPIRED') {
        where.isAccepted = false
        where.expiresAt = { lte: new Date() }
      }

      const invitations = await prisma.userInvitation.findMany({
        where,
        include: {
          role: {
            select: {
              name: true,
              color: true,
            },
          },
          workspace: {
            select: {
              name: true,
            },
          },
          sender: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { sentAt: 'desc' },
        skip: offset,
        take: limit,
      })

      return invitations
    } catch (error) {
      throw handleDatabaseError(error)
    }
  }

  static async accept(token, userData) {
    try {
      const invitation = await this.findByToken(token)

      if (!invitation) {
        throw new Error('Invalid invitation token')
      }

      if (invitation.isAccepted) {
        throw new Error('Invitation already accepted')
      }

      if (invitation.expiresAt < new Date()) {
        throw new Error('Invitation has expired')
      }

      let user = await prisma.user.findUnique({
        where: { email: invitation.email },
      })

      if (!user) {
        const hashedPassword = userData.password ? await bcrypt.hash(userData.password, 12) : null

        user = await prisma.user.create({
          data: {
            email: invitation.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            avatar: userData.avatar,
            password: hashedPassword,
            isActive: true,
            isVerified: true,
            isOnboardingCompleted: !invitation.role.requiresOnboarding,
          },
        })
      }

      await prisma.$transaction(async tx => {
        await tx.workspaceMember.create({
          data: {
            workspaceId: invitation.workspaceId,
            userId: user.id,
            roleId: invitation.roleId,
            onboardingRequired: invitation.role.requiresOnboarding,
            invitedBy: invitation.createdBy,
            invitedAt: invitation.sentAt,
          },
        })

        await tx.userInvitation.update({
          where: { id: invitation.id },
          data: {
            isAccepted: true,
            acceptedAt: new Date(),
          },
        })

        if (invitation.role.requiresOnboarding && invitation.onboardingFlowId) {
          await tx.onboardingCompletion.create({
            data: {
              userId: user.id,
              onboardingId: invitation.onboardingFlowId,
              workspaceId: invitation.workspaceId,
              currentStep: 0,
              totalSteps: invitation.onboardingFlow?.customFields?.length || 0,
              isCompleted: false,
            },
          })
        }
      })

      logger.info('Invitation accepted', {
        invitationId: invitation.id,
        userId: user.id,
        email: user.email,
        workspaceId: invitation.workspaceId,
        requiresOnboarding: invitation.role.requiresOnboarding,
      })

      return {
        user,
        invitation,
        requiresOnboarding: invitation.role.requiresOnboarding,
        onboardingFlow: invitation.onboardingFlow,
      }
    } catch (error) {
      throw handleDatabaseError(error)
    }
  }

  static async getRequiredVariables(roleId) {
    try {
      const role = await prisma.role.findUnique({
        where: { id: roleId },
        include: {
          workspace: {
            include: {
              emailTemplates: {
                where: {
                  type: 'INVITATION',
                  isActive: true,
                },
                orderBy: { isDefault: 'desc' },
                take: 1,
              },
            },
          },
        },
      })

      if (!role) {
        throw new Error('Role not found')
      }

      let template = role.workspace.emailTemplates[0]

      if (!template) {
        return [
          { name: 'first_name', required: true, label: 'First Name', type: 'text' },
          { name: 'inviter_name', required: true, label: 'Your Name', type: 'text' },
        ]
      }

      const requiredVars = template.requiredVariables || []
      const optionalVars = template.optionalVariables || []

      return [
        ...requiredVars.map(name => ({
          name,
          required: true,
          label: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          type: 'text',
        })),
        ...optionalVars.map(name => ({
          name,
          required: false,
          label: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          type: 'text',
        })),
      ]
    } catch (error) {
      throw handleDatabaseError(error)
    }
  }

  static async resend(invitationId, options = {}) {
    try {
      const { extendExpiry = false, resentBy } = options

      const invitation = await prisma.userInvitation.findUnique({
        where: { id: invitationId },
        include: {
          workspace: true,
          role: true,
          template: true,
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      })

      if (!invitation) {
        throw new Error('Invitation not found')
      }

      if (invitation.isAccepted) {
        throw new Error('Cannot resend accepted invitation')
      }

      let newExpiresAt = invitation.expiresAt
      const isExpired = new Date() > new Date(invitation.expiresAt)

      if (extendExpiry || isExpired) {
        newExpiresAt = new Date()
        newExpiresAt.setDate(newExpiresAt.getDate() + 7)
      }

      let emailSender = invitation.sender
      if (resentBy && resentBy !== invitation.sender?.id) {
        const resender = await prisma.user.findUnique({
          where: { id: resentBy },
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        })
        if (resender) {
          emailSender = resender
        }
      }

      const updatedInvitation = await prisma.userInvitation.update({
        where: { id: invitationId },
        data: {
          expiresAt: newExpiresAt,
          sentAt: new Date(),
        },
        include: {
          workspace: true,
          role: true,
          template: true,
        },
      })

      await this.sendInvitationEmail(
        updatedInvitation,
        emailSender,
        invitation.variableData || {}
      )

      return updatedInvitation
    } catch (error) {
      throw handleDatabaseError(error)
    }
  }

  static async findById(invitationId, options = {}) {
    try {
      const { includeWorkspace = true, includeRole = true, includeSender = true } = options

      const include = {}

      if (includeWorkspace) {
        include.workspace = {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            logo: true,
          },
        }
      }

      if (includeRole) {
        include.role = {
          select: {
            id: true,
            name: true,
            description: true,
            color: true,
            requiresOnboarding: true,
            onboardingForm: true,
          },
          include: {
            onboarding: {
              select: {
                id: true,
                name: true,
                description: true,
                customFields: true,
                requireTermsAccept: true,
                termsAndConditions: true,
                settings: true,
              },
            },
          },
        }
      }

      if (includeSender) {
        include.sender = {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        }
      }

      include.onboardingFlow = {
        select: {
          id: true,
          name: true,
          description: true,
          customFields: true,
          requireTermsAccept: true,
          termsAndConditions: true,
          settings: true,
        },
      }

      const invitation = await prisma.userInvitation.findUnique({
        where: { id: invitationId },
        include,
      })

      if (!invitation) {
        return null
      }

      const now = new Date()
      const isExpired = invitation.expiresAt < now
      const isPending = !invitation.isAccepted && !isExpired
      const status = invitation.isAccepted ? 'ACCEPTED' : isExpired ? 'EXPIRED' : 'PENDING'

      return {
        ...invitation,
        status,
        isExpired,
        isPending,
        daysUntilExpiry: isExpired
          ? 0
          : Math.ceil((invitation.expiresAt - now) / (1000 * 60 * 60 * 24)),
      }
    } catch (error) {
      throw handleDatabaseError(error)
    }
  }

  static async validateInvitation(invitationId) {
    try {
      const invitation = await this.findById(invitationId, {
        includeWorkspace: false,
        includeRole: false,
        includeSender: false,
      })

      if (!invitation) {
        return {
          valid: false,
          error: 'Invitation not found',
          code: 'NOT_FOUND',
        }
      }

      if (invitation.isAccepted) {
        return {
          valid: false,
          error: 'Invitation already accepted',
          code: 'ALREADY_ACCEPTED',
          invitation,
        }
      }

      if (invitation.isExpired) {
        return {
          valid: false,
          error: 'Invitation has expired',
          code: 'EXPIRED',
          invitation,
        }
      }

      return {
        valid: true,
        invitation,
      }
    } catch (error) {
      return {
        valid: false,
        error: error.message,
        code: 'ERROR',
      }
    }
  }

  static async findByIdForAdmin(invitationId) {
    try {
      const invitation = await this.findById(invitationId, {
        includeWorkspace: true,
        includeRole: true,
        includeSender: true,
      })

      if (!invitation) {
        return null
      }

      const [memberExists, relatedInvitations] = await Promise.all([
        prisma.user.findUnique({
          where: { email: invitation.email },
          include: {
            workspaceMembers: {
              where: {
                workspaceId: invitation.workspaceId,
                isActive: true,
              },
              include: {
                role: {
                  select: {
                    name: true,
                    color: true,
                  },
                },
              },
            },
          },
        }),
        prisma.userInvitation.findMany({
          where: {
            workspaceId: invitation.workspaceId,
            email: invitation.email,
            id: { not: invitationId },
          },
          select: {
            id: true,
            isAccepted: true,
            expiresAt: true,
            sentAt: true,
            acceptedAt: true,
          },
          orderBy: { sentAt: 'desc' },
          take: 5,
        }),
      ])

      return {
        ...invitation,
        userAlreadyMember: memberExists?.workspaceMembers?.length > 0,
        existingMembership: memberExists?.workspaceMembers?.[0] || null,
        relatedInvitations,
        canResend: invitation.isPending,
        canCancel: invitation.isPending,
      }
    } catch (error) {
      throw handleDatabaseError(error)
    }
  }

  static async updateById(invitationId, updateData) {
    try {
      const { personalMessage, variableData, expiresAt } = updateData

      const validation = await this.validateInvitation(invitationId)
      if (!validation.valid) {
        throw new Error(validation.error)
      }

      const updateFields = {}

      if (personalMessage !== undefined) {
        updateFields.personalMessage = personalMessage
      }

      if (variableData !== undefined) {
        updateFields.variableData = variableData
      }

      if (expiresAt !== undefined) {
        updateFields.expiresAt = new Date(expiresAt)
      }

      const updatedInvitation = await prisma.userInvitation.update({
        where: { id: invitationId },
        data: updateFields,
        include: {
          workspace: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          role: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
          sender: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      })

      logger.info('Invitation updated', {
        invitationId,
        updatedFields: Object.keys(updateFields),
        email: updatedInvitation.email,
      })

      return updatedInvitation
    } catch (error) {
      throw handleDatabaseError(error)
    }
  }

  static async cancel(invitationId) {
    try {
      const invitation = await prisma.userInvitation.findUnique({
        where: { id: invitationId },
        select: { isAccepted: true, email: true },
      })

      if (!invitation) {
        throw new Error('Invitation not found')
      }

      if (invitation.isAccepted) {
        throw new Error('Cannot cancel accepted invitation')
      }

      await prisma.userInvitation.delete({
        where: { id: invitationId },
      })

      logger.info('Invitation cancelled', {
        invitationId,
        email: invitation.email,
      })

      return true
    } catch (error) {
      throw handleDatabaseError(error)
    }
  }

  static async getStatistics(workspaceId) {
    try {
      const now = new Date()

      const [total, active, accepted, expired] = await Promise.all([
        prisma.userInvitation.count({
          where: { workspaceId },
        }),
        prisma.userInvitation.count({
          where: {
            workspaceId,
            isAccepted: false,
            expiresAt: { gt: now },
          },
        }),
        prisma.userInvitation.count({
          where: {
            workspaceId,
            isAccepted: true,
          },
        }),
        prisma.userInvitation.count({
          where: {
            workspaceId,
            isAccepted: false,
            expiresAt: { lte: now },
          },
        }),
      ])

      return {
        totalInvitations: total,
        activeInvitations: active,
        acceptedInvitations: accepted,
        expiredInvitations: expired,
      }
    } catch (error) {
      throw handleDatabaseError(error)
    }
  }
}

export const {
  create,
  findById,
  findByIdForAdmin,
  validateInvitation,
  updateById,
  validateBulkInvitation,
  findByWorkspace,
  findByToken,
  accept,
  resend,
  cancel,
  getRequiredVariables,
  sendInvitationEmail,
  bulkCreate,
  getStatistics,
  countByWorkspace,
} = InvitationService

export default InvitationService