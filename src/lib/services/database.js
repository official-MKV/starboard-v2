import { prisma, handleDatabaseError, createWorkspaceContext } from '../database.js'
import bcrypt from 'bcryptjs'
import { generateId } from '../utils.js'
import logger from '../logger.js'

// ===== USER SERVICES =====

export const userService = {
  async create(userData) {
    try {
      const hashedPassword = userData.password ? await bcrypt.hash(userData.password, 12) : null

      return await prisma.user.create({
        data: {
          ...userData,
          password: hashedPassword,
          emailVerificationToken: generateId(32),
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatar: true,
          isActive: true,
          isVerified: true,
          createdAt: true,
        },
      })
    } catch (error) {
      throw handleDatabaseError(error)
    }
  },

  async findByEmail(email) {
    try {
      return await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        include: {
          workspaceMembers: {
            include: {
              workspace: true,
              role: true,
            },
          },
        },
      })
    } catch (error) {
      throw handleDatabaseError(error)
    }
  },

  async findById(id) {
    try {
      return await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatar: true,
          isActive: true,
          isVerified: true,
          lastLoginAt: true,
          createdAt: true,
        },
      })
    } catch (error) {
      throw handleDatabaseError(error)
    }
  },

  async updateLastLogin(id) {
    try {
      return await prisma.user.update({
        where: { id },
        data: { lastLoginAt: new Date() },
      })
    } catch (error) {
      throw handleDatabaseError(error)
    }
  },

  async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword)
  },

  async updatePassword(id, newPassword) {
    try {
      const hashedPassword = await bcrypt.hash(newPassword, 12)
      return await prisma.user.update({
        where: { id },
        data: {
          password: hashedPassword,
          passwordResetToken: null,
          passwordResetExpiresAt: null,
        },
      })
    } catch (error) {
      throw handleDatabaseError(error)
    }
  },

  /**
   * Set password reset token for a user
   * @param {string} email - User email
   * @param {string} token - Reset token
   * @param {Date} expiresAt - Token expiration date
   * @returns {Object} - Updated user
   */
  async setPasswordResetToken(email, token, expiresAt) {
    try {
      const user = await prisma.user.update({
        where: { email: email.toLowerCase() },
        data: {
          passwordResetToken: token,
          passwordResetExpiresAt: expiresAt,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      })

      logger.info('Password reset token set', {
        userId: user.id,
        email: user.email,
      })

      return user
    } catch (error) {
      throw handleDatabaseError(error)
    }
  },

  /**
   * Find user by password reset token
   * @param {string} token - Reset token
   * @returns {Object|null} - User if token valid, null otherwise
   */
  async findByPasswordResetToken(token) {
    try {
      return await prisma.user.findFirst({
        where: {
          passwordResetToken: token,
          passwordResetExpiresAt: {
            gt: new Date(), // Token must not be expired
          },
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          passwordResetToken: true,
          passwordResetExpiresAt: true,
        },
      })
    } catch (error) {
      throw handleDatabaseError(error)
    }
  },

  /**
   * Verify email with verification token
   * @param {string} token - Email verification token
   * @returns {Object|null} - User if token valid, null otherwise
   */
  async verifyEmailToken(token) {
    try {
      const user = await prisma.user.findFirst({
        where: {
          emailVerificationToken: token,
          isVerified: false,
        },
      })

      if (user) {
        // Mark user as verified and clear token
        await prisma.user.update({
          where: { id: user.id },
          data: {
            isVerified: true,
            emailVerificationToken: null,
            emailVerifiedAt: new Date(),
          },
        })

        logger.info('Email verified successfully', {
          userId: user.id,
          email: user.email,
        })
      }

      return user
    } catch (error) {
      throw handleDatabaseError(error)
    }
  },

  /**
   * Update user profile
   * @param {string} id - User ID
   * @param {Object} updateData - Data to update
   * @returns {Object} - Updated user
   */
  async updateProfile(id, updateData) {
    try {
      // Remove sensitive fields from update data
      const { password, passwordResetToken, emailVerificationToken, ...safeUpdateData } = updateData

      return await prisma.user.update({
        where: { id },
        data: safeUpdateData,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatar: true,
          bio: true,
          phone: true,
          location: true,
          website: true,
          linkedIn: true,
          twitter: true,
          timezone: true,
          language: true,
          isActive: true,
          isVerified: true,
          lastLoginAt: true,
          updatedAt: true,
        },
      })
    } catch (error) {
      throw handleDatabaseError(error)
    }
  },

  /**
   * Soft delete user account
   * @param {string} id - User ID
   * @returns {Object} - Updated user
   */
  async deactivateAccount(id) {
    try {
      return await prisma.user.update({
        where: { id },
        data: {
          isActive: false,
          deactivatedAt: new Date(),
        },
        select: {
          id: true,
          email: true,
          isActive: true,
          deactivatedAt: true,
        },
      })
    } catch (error) {
      throw handleDatabaseError(error)
    }
  },

  /**
   * Reactivate user account
   * @param {string} id - User ID
   * @returns {Object} - Updated user
   */
  async reactivateAccount(id) {
    try {
      return await prisma.user.update({
        where: { id },
        data: {
          isActive: true,
          deactivatedAt: null,
        },
        select: {
          id: true,
          email: true,
          isActive: true,
        },
      })
    } catch (error) {
      throw handleDatabaseError(error)
    }
  },
}

// ===== WORKSPACE SERVICES =====

export const workspaceService = {
  async create(workspaceData, creatorId) {
    try {
      return await prisma.$transaction(async tx => {
        // Create workspace
        const workspace = await tx.workspace.create({
          data: {
            ...workspaceData,
            slug: workspaceData.slug.toLowerCase(),
            creatorId,
          },
        })

        // Create default roles
        const adminRole = await tx.role.create({
          data: {
            workspaceId: workspace.id,
            name: 'Admin',
            description: 'Full access to workspace',
            isSystem: true,
            permissions: JSON.stringify([
              'workspace.manage',
              'users.manage',
              'applications.manage',
              'events.manage',
              'resources.manage',
            ]),
          },
        })

        const memberRole = await tx.role.create({
          data: {
            workspaceId: workspace.id,
            name: 'Member',
            description: 'Basic workspace access',
            isSystem: true,
            permissions: JSON.stringify(['applications.view', 'events.view', 'resources.view']),
          },
        })

        // Add creator as admin
        await tx.workspaceMember.create({
          data: {
            workspaceId: workspace.id,
            userId: creatorId,
            roleId: adminRole.id,
          },
        })

        return { workspace, adminRole, memberRole }
      })
    } catch (error) {
      throw handleDatabaseError(error)
    }
  },

  async findBySlug(slug) {
    try {
      return await prisma.workspace.findUnique({
        where: { slug: slug.toLowerCase() },
        include: {
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          _count: {
            select: {
              members: true,
              applications: true,
              events: true,
            },
          },
        },
      })
    } catch (error) {
      throw handleDatabaseError(error)
    }
  },

  async getUserWorkspaces(userId) {
    try {
      return await prisma.workspaceMember.findMany({
        where: { userId, isActive: true },
        include: {
          workspace: {
            include: {
              _count: {
                select: {
                  members: true,
                  applications: true,
                },
              },
            },
          },
          role: true,
        },
        orderBy: {
          joinedAt: 'desc',
        },
      })
    } catch (error) {
      throw handleDatabaseError(error)
    }
  },

  async addMember(workspaceId, userId, roleId) {
    try {
      return await prisma.workspaceMember.create({
        data: {
          workspaceId,
          userId,
          roleId,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatar: true,
            },
          },
          role: true,
        },
      })
    } catch (error) {
      throw handleDatabaseError(error)
    }
  },

  async getMembers(workspaceId, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit

      const [members, total] = await Promise.all([
        prisma.workspaceMember.findMany({
          where: { workspaceId, isActive: true },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatar: true,
                lastLoginAt: true,
              },
            },
            role: true,
          },
          skip,
          take: limit,
          orderBy: { joinedAt: 'desc' },
        }),
        prisma.workspaceMember.count({
          where: { workspaceId, isActive: true },
        }),
      ])

      return {
        members,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      }
    } catch (error) {
      throw handleDatabaseError(error)
    }
  },
}

// ===== APPLICATION SERVICES =====

export const applicationService = {
  async create(applicationData, workspaceId) {
    try {
      const ctx = createWorkspaceContext(workspaceId)
      return await ctx.applications.create(applicationData)
    } catch (error) {
      throw handleDatabaseError(error)
    }
  },

  async findMany(workspaceId, filters = {}) {
    try {
      const ctx = createWorkspaceContext(workspaceId)
      const where = {}

      if (filters.isPublic !== undefined) where.isPublic = filters.isPublic
      if (filters.isActive !== undefined) where.isActive = filters.isActive
      if (filters.search) {
        where.OR = [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ]
      }

      return await ctx.applications.findMany({
        where,
        include: {
          _count: {
            select: { submissions: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
    } catch (error) {
      throw handleDatabaseError(error)
    }
  },

  async submitApplication(applicationId, applicantData, responses) {
    try {
      return await prisma.applicationSubmission.create({
        data: {
          applicationId,
          applicantEmail: applicantData.email.toLowerCase(),
          applicantFirstName: applicantData.firstName,
          applicantLastName: applicantData.lastName,
          applicantPhone: applicantData.phone,
          companyName: applicantData.companyName,
          responses,
          progress: 100,
          status: 'SUBMITTED',
          submittedAt: new Date(),
        },
      })
    } catch (error) {
      throw handleDatabaseError(error)
    }
  },

  async linkApplicationToUser(submissionId, userId) {
    try {
      return await prisma.applicationSubmission.update({
        where: { id: submissionId },
        data: {
          userId,
          status: 'ONBOARDED',
        },
      })
    } catch (error) {
      throw handleDatabaseError(error)
    }
  },

  async inviteApplicant(submissionId, invitationToken) {
    try {
      return await prisma.applicationSubmission.update({
        where: { id: submissionId },
        data: {
          status: 'INVITED',
          invitationSent: true,
          invitationToken,
          invitedAt: new Date(),
        },
      })
    } catch (error) {
      throw handleDatabaseError(error)
    }
  },

  async getSubmissionByInvitationToken(token) {
    try {
      return await prisma.applicationSubmission.findUnique({
        where: { invitationToken: token },
        include: {
          application: {
            include: {
              workspace: true,
            },
          },
        },
      })
    } catch (error) {
      throw handleDatabaseError(error)
    }
  },
}

// ===== EVENT SERVICES =====

export const eventService = {
  async create(eventData, workspaceId, creatorId) {
    try {
      const ctx = createWorkspaceContext(workspaceId)
      return await ctx.events.create({
        ...eventData,
        creatorId,
      })
    } catch (error) {
      throw handleDatabaseError(error)
    }
  },

  async findUpcoming(workspaceId, limit = 10) {
    try {
      const ctx = createWorkspaceContext(workspaceId)
      return await ctx.events.findMany({
        where: {
          startDate: {
            gte: new Date(),
          },
          isPublic: true,
        },
        include: {
          creator: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          _count: {
            select: { registrations: true },
          },
        },
        orderBy: { startDate: 'asc' },
        take: limit,
      })
    } catch (error) {
      throw handleDatabaseError(error)
    }
  },

  async register(eventId, userId) {
    try {
      return await prisma.eventRegistration.create({
        data: {
          eventId,
          userId,
          status: 'REGISTERED',
        },
      })
    } catch (error) {
      throw handleDatabaseError(error)
    }
  },
}

// ===== NOTIFICATION SERVICES =====

export const notificationService = {
  async create(notificationData, workspaceId) {
    try {
      const ctx = createWorkspaceContext(workspaceId)
      return await ctx.notifications.create(notificationData)
    } catch (error) {
      throw handleDatabaseError(error)
    }
  },

  async getUserNotifications(userId, workspaceId, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit
      const ctx = createWorkspaceContext(workspaceId)

      const [notifications, total] = await Promise.all([
        ctx.notifications.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.notification.count({
          where: { userId, workspaceId },
        }),
      ])

      return {
        notifications,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      }
    } catch (error) {
      throw handleDatabaseError(error)
    }
  },

  async markAsRead(notificationId, userId) {
    try {
      return await prisma.notification.updateMany({
        where: {
          id: notificationId,
          userId,
        },
        data: { isRead: true },
      })
    } catch (error) {
      throw handleDatabaseError(error)
    }
  },
}
