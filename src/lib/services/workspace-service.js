// lib/services/workspace-service.js
import { prisma } from '@/lib/database'
import { logger } from '@/lib/logger'

export class WorkspaceService {
  /**
   * Generate a URL-friendly slug from workspace name
   */
  static generateSlug(name) {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
  }

  /**
   * Generate a unique slug by appending numbers if needed
   */
  static async generateUniqueSlug(baseName) {
    const baseSlug = this.generateSlug(baseName)
    let slug = baseSlug
    let counter = 1

    // Check if slug exists and generate unique one
    while (await prisma.workspace.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`
      counter++
    }

    return slug
  }

  /**
   * Find workspaces by user ID
   * @param {string} userId - User ID
   * @returns {Array} - Array of user workspaces
   */
  static async findByUserId(userId) {
    try {
      const workspaces = await prisma.workspaceMember.findMany({
        where: {
          userId,
          isActive: true,
        },
        include: {
          workspace: {
            select: {
              id: true,
              name: true,
              description: true,
              logo: true,
              website: true,
              slug: true,
              isActive: true,
              createdAt: true,
            },
          },
          role: {
            select: {
              id: true,
              name: true,
              permissions: true,
              color: true,
            },
          },
        },
        orderBy: {
          joinedAt: 'desc',
        },
      })

      return workspaces
        .filter(member => member.workspace.isActive)
        .map(member => ({
          id: member.workspace.id,
          name: member.workspace.name,
          description: member.workspace.description,
          logo: member.workspace.logo,
          website: member.workspace.website,
          slug: member.workspace.slug,
          role: member.role,
          joinedAt: member.joinedAt,
          createdAt: member.workspace.createdAt,
        }))
    } catch (error) {
      logger.error('Failed to find workspaces by user ID', {
        userId,
        error: error.message,
      })
      throw new Error('Failed to fetch user workspaces')
    }
  }

  /**
   * Find workspace by ID
   * @param {string} workspaceId - Workspace ID
   * @returns {Object|null} - Workspace object or null
   */
  static async findById(workspaceId) {
    try {
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
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
              resources: true,
            },
          },
        },
      })

      return workspace
    } catch (error) {
      logger.error('Failed to find workspace by ID', {
        workspaceId,
        error: error.message,
      })
      throw new Error('Failed to fetch workspace')
    }
  }

  /**
   * Create a new workspace with slug generation
   * @param {Object} workspaceData - Workspace data
   * @param {string} creatorId - Creator user ID
   * @returns {Object} - Created workspace with membership
   */
  static async create(workspaceData, creatorId) {
    const { name, description, website, logo } = workspaceData

    try {
      // Validate required fields
      if (!name?.trim()) {
        throw new Error('Workspace name is required')
      }

      if (name.length < 2) {
        throw new Error('Workspace name must be at least 2 characters')
      }

      if (name.length > 100) {
        throw new Error('Workspace name must be less than 100 characters')
      }

      // Generate unique slug
      const slug = await this.generateUniqueSlug(name.trim())

      // Create workspace and membership in transaction
      const result = await prisma.$transaction(async tx => {
        // Create workspace
        const workspace = await tx.workspace.create({
          data: {
            name: name.trim(),
            slug,
            description: description?.trim() || null,
            website: website || null,
            logo: logo || null,
            creatorId,
            isActive: true,
          },
        })

        // Create default admin role
        const adminRole = await tx.role.create({
          data: {
            name: 'Admin',
            description: 'Full access to workspace',
            permissions: [
              'workspace.manage',
              'members.manage',
              'roles.manage',
              'applications.manage',
              'events.manage',
              'resources.manage',
              'messages.manage',
              'notifications.manage',
              'analytics.view',
              'settings.manage',
            ],
            color: '#dc2626',
            workspaceId: workspace.id,
          },
        })

        // Create default member role
        const memberRole = await tx.role.create({
          data: {
            name: 'Member',
            description: 'Standard workspace member',
            permissions: [
              'applications.view',
              'events.view',
              'resources.view',
              'messages.create',
              'profile.manage',
            ],
            color: '#3b82f6',
            workspaceId: workspace.id,
          },
        })

        // Create default viewer role
        const viewerRole = await tx.role.create({
          data: {
            name: 'Viewer',
            description: 'Read-only access to workspace',
            permissions: ['applications.view', 'events.view', 'resources.view'],
            color: '#6b7280',
            workspaceId: workspace.id,
          },
        })

        // Add creator as admin member (fix the Prisma relation issue)
        const workspaceMember = await tx.workspaceMember.create({
          data: {
            userId: creatorId,
            workspaceId: workspace.id,
            roleId: adminRole.id,
            isActive: true,
            joinedAt: new Date(),
          },
        })

        // Fetch the complete workspace with member data for response
        const completeWorkspace = await tx.workspace.findUnique({
          where: { id: workspace.id },
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    firstName: true,
                    avatar: true,
                  },
                },
                role: {
                  select: {
                    id: true,
                    name: true,
                    permissions: true,
                    color: true,
                  },
                },
              },
            },
            _count: {
              select: {
                members: true,
              },
            },
          },
        })

        return {
          workspace: completeWorkspace,
          roles: {
            admin: adminRole,
            member: memberRole,
            viewer: viewerRole,
          },
          membership: workspaceMember,
        }
      })

      logger.info('Workspace created successfully', {
        workspaceId: result.workspace.id,
        workspaceName: result.workspace.name,
        workspaceSlug: result.workspace.slug,
        creatorId,
        rolesCreated: 3,
      })

      return result
    } catch (error) {
      logger.error('Failed to create workspace', {
        workspaceName: name,
        creatorId,
        error: error.message,
        stack: error.stack,
      })

      // Handle Prisma unique constraint errors
      if (error.code === 'P2002') {
        if (error.meta?.target?.includes('slug')) {
          throw new Error('A workspace with this name already exists')
        }
      }

      throw error
    }
  }

  /**
   * Update workspace
   * @param {string} workspaceId - Workspace ID
   * @param {Object} updateData - Update data
   * @param {string} updatedById - User ID making the update
   * @returns {Object} - Updated workspace
   */
  static async update(workspaceId, updateData, updatedById) {
    try {
      // If name is being updated, regenerate slug
      if (updateData.name) {
        updateData.slug = await this.generateUniqueSlug(updateData.name)
      }

      const workspace = await prisma.workspace.update({
        where: { id: workspaceId },
        data: {
          ...updateData,
          updatedAt: new Date(),
        },
      })

      logger.info('Workspace updated successfully', {
        workspaceId,
        updatedById,
        updatedFields: Object.keys(updateData),
      })

      return workspace
    } catch (error) {
      logger.error('Failed to update workspace', {
        workspaceId,
        updatedById,
        error: error.message,
      })
      throw new Error('Failed to update workspace')
    }
  }

  /**
   * Delete workspace (soft delete by setting isActive to false)
   * @param {string} workspaceId - Workspace ID
   * @param {string} deletedById - User ID making the deletion
   * @returns {Object} - Deleted workspace
   */
  static async delete(workspaceId, deletedById) {
    try {
      const workspace = await prisma.workspace.update({
        where: { id: workspaceId },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      })

      logger.info('Workspace deleted successfully', {
        workspaceId,
        deletedById,
        workspaceName: workspace.name,
      })

      return workspace
    } catch (error) {
      logger.error('Failed to delete workspace', {
        workspaceId,
        deletedById,
        error: error.message,
      })
      throw new Error('Failed to delete workspace')
    }
  }

  /**
   * Get workspace members
   * @param {string} workspaceId - Workspace ID
   * @returns {Array} - Array of workspace members
   */
  static async getMembers(workspaceId) {
    try {
      const members = await prisma.workspaceMember.findMany({
        where: {
          workspaceId,
          isActive: true,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatar: true,
              isVerified: true,
            },
          },
          role: {
            select: {
              id: true,
              name: true,
              permissions: true,
              color: true,
            },
          },
        },
        orderBy: {
          joinedAt: 'asc',
        },
      })

      return members.map(member => ({
        id: member.id,
        user: member.user,
        role: member.role,
        joinedAt: member.joinedAt,
        isActive: member.isActive,
      }))
    } catch (error) {
      logger.error('Failed to get workspace members', {
        workspaceId,
        error: error.message,
      })
      throw new Error('Failed to fetch workspace members')
    }
  }

  /**
   * Add member to workspace
   * @param {string} workspaceId - Workspace ID
   * @param {string} userId - User ID to add
   * @param {string} roleId - Role ID to assign
   * @param {string} addedById - User ID adding the member
   * @returns {Object} - Created workspace member
   */
  static async addMember(workspaceId, userId, roleId, addedById) {
    try {
      // Check if user is already a member
      const existingMember = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId,
          userId,
        },
      })

      if (existingMember) {
        if (existingMember.isActive) {
          throw new Error('User is already a member of this workspace')
        } else {
          // Reactivate existing member
          const member = await prisma.workspaceMember.update({
            where: { id: existingMember.id },
            data: {
              roleId,
              isActive: true,
              joinedAt: new Date(),
            },
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
              role: {
                select: {
                  id: true,
                  name: true,
                  permissions: true,
                  color: true,
                },
              },
            },
          })

          logger.info('Workspace member reactivated', {
            workspaceId,
            userId,
            roleId,
            addedById,
          })

          return member
        }
      }

      // Create new member
      const member = await prisma.workspaceMember.create({
        data: {
          workspaceId,
          userId,
          roleId,
          joinedAt: new Date(),
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          role: {
            select: {
              id: true,
              name: true,
              permissions: true,
              color: true,
            },
          },
        },
      })

      logger.info('Workspace member added', {
        workspaceId,
        userId,
        roleId,
        addedById,
      })

      return member
    } catch (error) {
      logger.error('Failed to add workspace member', {
        workspaceId,
        userId,
        roleId,
        addedById,
        error: error.message,
      })
      throw error
    }
  }

  /**
   * Remove member from workspace
   * @param {string} workspaceId - Workspace ID
   * @param {string} userId - User ID to remove
   * @param {string} removedById - User ID removing the member
   * @returns {Object} - Updated workspace member
   */
  static async removeMember(workspaceId, userId, removedById) {
    try {
      const member = await prisma.workspaceMember.updateMany({
        where: {
          workspaceId,
          userId,
          isActive: true,
        },
        data: {
          isActive: false,
        },
      })

      if (member.count === 0) {
        throw new Error('Member not found in workspace')
      }

      logger.info('Workspace member removed', {
        workspaceId,
        userId,
        removedById,
      })

      return member
    } catch (error) {
      logger.error('Failed to remove workspace member', {
        workspaceId,
        userId,
        removedById,
        error: error.message,
      })
      throw error
    }
  }

  /**
   * Get workspace statistics
   * @param {string} workspaceId - Workspace ID
   * @returns {Object} - Workspace statistics
   */
  static async getStats(workspaceId) {
    try {
      const stats = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: {
          _count: {
            select: {
              members: {
                where: { isActive: true },
              },
              applications: {
                where: { isActive: true },
              },
              events: {
                where: { isActive: true },
              },
              resources: {
                where: { isActive: true },
              },
              messages: true,
              notifications: true,
            },
          },
        },
      })

      return stats?._count || {}
    } catch (error) {
      logger.error('Failed to get workspace stats', {
        workspaceId,
        error: error.message,
      })
      throw new Error('Failed to fetch workspace statistics')
    }
  }
}
