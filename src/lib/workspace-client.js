// lib/workspace-client.js - Client-side workspace utilities
const WORKSPACE_COOKIE_NAME = 'starboard-workspace'
const WORKSPACE_COOKIE_MAX_AGE = 30 * 24 * 60 * 60 // 30 days in seconds

/**
 * Client-side workspace utilities
 * Only works in browser environment
 */
export class WorkspaceClient {
  /**
   * Set workspace cookie from client-side
   * @param {string} workspaceId - Workspace ID
   */
  static setWorkspace(workspaceId) {
    if (typeof document === 'undefined') return

    document.cookie = [
      `${WORKSPACE_COOKIE_NAME}=${workspaceId}`,
      `max-age=${WORKSPACE_COOKIE_MAX_AGE}`,
      'path=/',
      'samesite=lax',
    ].join('; ')
  }

  /**
   * Get workspace cookie from client-side
   * @returns {string|null} - Workspace ID
   */
  static getWorkspace() {
    if (typeof document === 'undefined') return null

    const cookies = document.cookie.split(';')
    console.log(
      'Workspace cookie:',
      document.cookie.split(';').find(c => c.includes('starboard-workspace'))
    )
    console.log(cookies)
    const workspaceCookie = cookies.find(cookie =>
      cookie.trim().startsWith(`${WORKSPACE_COOKIE_NAME}=`)
    )

    return workspaceCookie ? workspaceCookie.split('=')[1] : null
  }

  /**
   * Clear workspace cookie from client-side
   */
  static clearWorkspace() {
    if (typeof document === 'undefined') return

    document.cookie = `${WORKSPACE_COOKIE_NAME}=; max-age=0; path=/`
  }

  /**
   * Get current workspace via API
   * @returns {Promise<Object|null>} - Workspace context
   */
  static async getCurrentWorkspace() {
    try {
      const response = await fetch('/api/workspaces/current')
      if (response.ok) {
        const data = await response.json()
        return data.data.workspace
      }
      return null
    } catch (error) {
      console.error('Error fetching current workspace:', error)
      return null
    }
  }

  /**
   * Get all user workspaces via API
   * @returns {Promise<Array>} - User workspaces
   */
  static async getUserWorkspaces() {
    try {
      const response = await fetch('/api/workspaces')
      if (response.ok) {
        const data = await response.json()
        return data.data.workspaces
      }
      return []
    } catch (error) {
      console.error('Error fetching user workspaces:', error)
      return []
    }
  }

  /**
   * Switch workspace via API
   * @param {string} workspaceId - Workspace ID
   * @returns {Promise<boolean>} - Success status
   */
  static async switchWorkspace(workspaceId) {
    try {
      const response = await fetch('/api/workspaces/switch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ workspaceId }),
      })
      return response.ok
    } catch (error) {
      console.error('Error switching workspace:', error)
      return false
    }
  }

  /**
   * Clear workspace context via API
   * @returns {Promise<boolean>} - Success status
   */
  static async clearWorkspaceContext() {
    try {
      const response = await fetch('/api/workspaces/current', {
        method: 'DELETE',
      })
      return response.ok
    } catch (error) {
      console.error('Error clearing workspace context:', error)
      return false
    }
  }
}

export default WorkspaceClient
