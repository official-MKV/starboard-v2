// hooks/usePermissions.js - Fixed to handle double-encoded permissions
'use client'

import { useSession } from 'next-auth/react'
import { useWorkspaceCookie } from '@/lib/hooks/auth'

export function usePermissions() {
  const { data: session } = useSession()
  const currentWorkspaceId = useWorkspaceCookie() // Get current workspace from cookie

  console.log(session?.user)

  const getCurrentWorkspace = () => {
    if (!session?.user?.workspaces || !currentWorkspaceId) return null

    return (
      session.user.workspaces.find(ws => ws.id === currentWorkspaceId) || session.user.workspaces[0]
    ) // Fallback to first workspace
  }

  const currentWorkspace = getCurrentWorkspace()

  // Parse permissions properly to handle double-encoded JSON
  const parsePermissions = rawPermissions => {
    if (!rawPermissions || !Array.isArray(rawPermissions)) return []

    // If permissions is empty array, return empty array
    if (rawPermissions.length === 0) return []

    // Check if first element is a stringified JSON array
    const firstElement = rawPermissions[0]
    if (typeof firstElement === 'string' && firstElement.startsWith('[')) {
      try {
        // Parse the stringified JSON array
        return JSON.parse(firstElement)
      } catch (error) {
        console.error('Error parsing permissions:', error)
        return []
      }
    }

    // If it's already a proper array of strings, return as is
    return rawPermissions
  }

  const permissions = parsePermissions(currentWorkspace?.permissions || [])

  // Debug log to verify parsing
  console.log('Raw permissions:', currentWorkspace?.permissions)
  console.log('Parsed permissions:', permissions)

  return {
    // Check single permission
    hasPermission: permission => {
      return permissions.includes(permission)
    },

    // Check if user has ANY of the permissions (OR logic)
    hasAnyPermission: permissionArray => {
      if (!Array.isArray(permissionArray)) return false
      return permissionArray.some(permission => permissions.includes(permission))
    },

    // Check if user has ALL of the permissions (AND logic)
    hasAllPermissions: permissionArray => {
      if (!Array.isArray(permissionArray)) return false
      return permissionArray.every(permission => permissions.includes(permission))
    },

    // Get current role name
    getCurrentRole: () => {
      return currentWorkspace?.role || null
    },

    // Get current workspace
    getCurrentWorkspace: () => {
      return currentWorkspace
    },

    // Get all user permissions
    getAllPermissions: () => {
      return permissions
    },

    // Check if user is in a specific role
    hasRole: roleName => {
      return currentWorkspace?.role?.toLowerCase() === roleName.toLowerCase()
    },

    currentWorkspaceId,
    currentWorkspace,
    permissions,
    user: session?.user,
    isLoading: !session,
  }
}
