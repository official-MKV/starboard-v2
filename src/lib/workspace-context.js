// lib/workspace-context.js - App Router Server-Side Only
const { cookies } = require('next/headers')
import { prisma } from './database.js'
import { logger } from './logger.js'

const WORKSPACE_COOKIE_NAME = 'starboard-workspace'
const WORKSPACE_COOKIE_MAX_AGE = 30 * 24 * 60 * 60 // 30 days in seconds

export class WorkspaceContext {
  /**
   * Get workspace cookie configuration
   * @returns {Object} - Cookie configuration object
   */
  static getCookieConfig() {
    return {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: WORKSPACE_COOKIE_MAX_AGE,
      path: '/',
    }
  }

  /**
   * Get current workspace ID from cookies (Server Components)
   * @returns {Promise<string|null>} - Workspace ID
   */
  static async getCurrentWorkspaceId() {
    try {
      const cookieStore = await cookies()
      const workspaceCookie = cookieStore.get(WORKSPACE_COOKIE_NAME)
      return workspaceCookie?.value || null
    } catch (error) {
      logger.error('Failed to get workspace from cookies', { error: error.message })
      return null
    }
  }

  /**
   * Get current workspace ID from request (API Routes)
   * @param {Request} request - Request object
   * @returns {string|null} - Workspace ID
   */
  static getCurrentWorkspaceIdFromRequest(request) {
    try {
      const workspaceCookie = request.cookies.get(WORKSPACE_COOKIE_NAME)
      return workspaceCookie?.value || null
    } catch (error) {
      logger.error('Failed to get workspace from request cookies', { error: error.message })
      return null
    }
  }

  /**
   * Set workspace cookie on response (API Routes)
   * @param {NextResponse} response - Response object
   * @param {string} workspaceId - Workspace ID
   */
  static setWorkspaceCookie(response, workspaceId) {
    try {
      response.cookies.set(WORKSPACE_COOKIE_NAME, workspaceId, this.getCookieConfig())
      console.log(workspaceId)
      logger.info('Workspace cookie set on response', { workspaceId })
    } catch (error) {
      logger.error('Failed to set workspace cookie on response', {
        workspaceId,
        error: error.message,
      })
      throw new Error('Failed to set workspace cookie')
    }
  }

  /**
   * Clear workspace cookie on response (API Routes)
   * @param {NextResponse} response - Response object
   */
  static clearWorkspaceCookie(response) {
    try {
      response.cookies.delete(WORKSPACE_COOKIE_NAME)
      logger.info('Workspace cookie cleared from response')
    } catch (error) {
      logger.error('Failed to clear workspace cookie from response', { error: error.message })
    }
  }

  /**
   * Set current workspace in cookies (Server Components)
   * @param {string} workspaceId - Workspace ID
   * @param {Object} options - Cookie options
   */
  static async setCurrentWorkspace(workspaceId, options = {}) {
    try {
      const cookieStore = await cookies()
      cookieStore.set(WORKSPACE_COOKIE_NAME, workspaceId, {
        ...this.getCookieConfig(),
        ...options,
      })

      logger.info('Workspace set in cookies', { workspaceId })
    } catch (error) {
      logger.error('Failed to set workspace cookie', { workspaceId, error: error.message })
      throw new Error('Failed to set workspace')
    }
  }

  /**
   * Clear workspace from cookies (Server Components)
   */
  static async clearCurrentWorkspace() {
    try {
      const cookieStore = await cookies()
      cookieStore.delete(WORKSPACE_COOKIE_NAME)
      logger.info('Workspace cleared from cookies')
    } catch (error) {
      logger.error('Failed to clear workspace cookie', { error: error.message })
    }
  }

  /**
   * Get user's accessible workspaces
   * @param {string} userId - User ID
   * @returns {Array} - Array of workspace objects
   */
  static async getUserWorkspaces(userId) {
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
              slug: true,
              logo: true,
              description: true,
              isActive: true,
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
          slug: member.workspace.slug,
          logo: member.workspace.logo,
          description: member.workspace.description,
          role: member.role,
          joinedAt: member.joinedAt,
        }))
    } catch (error) {
      logger.error('Failed to get user workspaces', { userId, error: error.message })
      throw new Error('Failed to get user workspaces')
    }
  }

  /**
   * Check if user has access to workspace
   * @param {string} userId - User ID
   * @param {string} workspaceId - Workspace ID
   * @returns {Object|null} - Workspace member info or null
   */
  static async checkWorkspaceAccess(userId, workspaceId) {
    try {
      const member = await prisma.workspaceMember.findFirst({
        where: {
          userId,
          workspaceId,
          isActive: true,
        },
        include: {
          workspace: {
            select: {
              id: true,
              name: true,
              slug: true,
              isActive: true,
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

      if (!member || !member.workspace.isActive) {
        return null
      }

      return {
        workspace: member.workspace,
        role: member.role,
        joinedAt: member.joinedAt,
        permissions: member.role.permissions || [],
      }
    } catch (error) {
      logger.error('Failed to check workspace access', {
        userId,
        workspaceId,
        error: error.message,
      })
      return null
    }
  }

  /**
   * Switch user's current workspace and get context
   * @param {string} userId - User ID
   * @param {string} newWorkspaceId - New workspace ID
   * @returns {Object} - Workspace context
   */
  static async switchWorkspace(userId, newWorkspaceId) {
    try {
      const access = await this.checkWorkspaceAccess(userId, newWorkspaceId)
      if (!access) {
        throw new Error('No access to workspace')
      }

      logger.info('Workspace switch validated', {
        userId,
        to: newWorkspaceId,
        workspaceName: access.workspace.name,
      })

      return {
        workspaceId: newWorkspaceId,
        workspace: access.workspace,
        role: access.role,
        permissions: access.permissions,
      }
    } catch (error) {
      logger.error('Workspace switch failed', { userId, newWorkspaceId, error: error.message })
      throw new Error('Failed to switch workspace: ' + error.message)
    }
  }

  /**
   * Get workspace context for API requests with automatic fallback
   * @param {Request} request - Next.js request object
   * @param {string} userId - User ID
   * @returns {Object|null} - Workspace context
   */
  static async getWorkspaceContext(request, userId) {
    try {
      // Try to get workspace from cookie
      let workspaceId = this.getCurrentWorkspaceIdFromRequest(request)

      // If no workspace in cookie, get user's first workspace
      if (!workspaceId && userId) {
        const userWorkspaces = await this.getUserWorkspaces(userId)
        if (userWorkspaces.length > 0) {
          workspaceId = userWorkspaces[0].id
          // Cookie will be set by calling code if needed
        }
      }

      if (!workspaceId) {
        return null
      }

      // Verify access and get context
      const access = await this.checkWorkspaceAccess(userId, workspaceId)
      if (!access) {
        return null
      }

      return {
        workspaceId,
        workspace: access.workspace,
        role: access.role,
        permissions: access.permissions,
      }
    } catch (error) {
      logger.error('Failed to get workspace context', { userId, error: error.message })
      return null
    }
  }

  /**
   * Check if user has specific permission in current workspace
   * @param {string} userId - User ID
   * @param {string} workspaceId - Workspace ID
   * @param {string} permission - Permission to check
   * @returns {boolean} - Has permission
   */
  static async hasPermission(userId, workspaceId, permission) {
    try {
      const access = await this.checkWorkspaceAccess(userId, workspaceId)
      if (!access) return false

      return access.permissions.includes(permission)
    } catch (error) {
      logger.error('Permission check failed', {
        userId,
        workspaceId,
        permission,
        error: error.message,
      })
      return false
    }
  }

  /**
   * Check multiple permissions (user needs ALL of them)
   * @param {string} userId - User ID
   * @param {string} workspaceId - Workspace ID
   * @param {Array} permissions - Permissions to check
   * @returns {boolean} - Has all permissions
   */
  static async hasAllPermissions(userId, workspaceId, permissions) {
    try {
      const access = await this.checkWorkspaceAccess(userId, workspaceId)
      if (!access) return false

      return permissions.every(permission => access.permissions.includes(permission))
    } catch (error) {
      logger.error('Multiple permission check failed', {
        userId,
        workspaceId,
        permissions,
        error: error.message,
      })
      return false
    }
  }

  /**
   * Check if user has any of the specified permissions
   * @param {string} userId - User ID
   * @param {string} workspaceId - Workspace ID
   * @param {Array} permissions - Permissions to check
   * @returns {boolean} - Has any permission
   */
  static async hasAnyPermission(userId, workspaceId, permissions) {
    try {
      const access = await this.checkWorkspaceAccess(userId, workspaceId)
      if (!access) return false

      return permissions.some(permission => access.permissions.includes(permission))
    } catch (error) {
      logger.error('Any permission check failed', {
        userId,
        workspaceId,
        permissions,
        error: error.message,
      })
      return false
    }
  }

  /**
   * Get workspace settings and configuration
   * @param {string} workspaceId - Workspace ID
   * @returns {Object} - Workspace configuration
   */
  static async getWorkspaceConfig(workspaceId) {
    try {
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          description: true,
          website: true,
          settings: true,
          isActive: true,
        },
      })

      if (!workspace || !workspace.isActive) {
        return null
      }

      return workspace
    } catch (error) {
      logger.error('Failed to get workspace config', { workspaceId, error: error.message })
      return null
    }
  }
}

// Export convenience functions
export const {
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,

  getWorkspaceConfig,
  getCurrentWorkspaceId,
  getCurrentWorkspaceIdFromRequest,
  setWorkspaceCookie,
  clearWorkspaceCookie,
  setCurrentWorkspace,
  clearCurrentWorkspace,
  getUserWorkspaces,
  checkWorkspaceAccess,
  switchWorkspace,
  getWorkspaceContext,
} = WorkspaceContext

export default WorkspaceContext
