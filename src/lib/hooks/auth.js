'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { WorkspaceClient } from '@/lib/workspace-client'

// Hook to get current user session
export function useAuth() {
  const { data: session, status } = useSession()

  return {
    user: session?.user || null,
    isAuthenticated: !!session?.user,
    isLoading: status === 'loading',
    workspaces: session?.user?.workspaces || [], // Available workspaces from session
  }
}

// Hook to require authentication
export function useRequireAuth(redirectTo = '/auth/login') {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      router.push(redirectTo)
    }
  }, [user, isLoading, redirectTo, router])

  return { user, isLoading }
}

// Hook to redirect authenticated users away from auth pages
export function useRedirectIfAuthenticated(redirectTo = '/dashboard') {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && user) {
      router.push(redirectTo)
    }
  }, [user, isLoading, redirectTo, router])

  return { user, isLoading }
}

// Hook to get current workspace context (from API)
export function useWorkspaceContext() {
  const { user, isAuthenticated } = useAuth()
  const [workspace, setWorkspace] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchWorkspaceContext = useCallback(async () => {
    if (!isAuthenticated) {
      setWorkspace(null)
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const workspace = await WorkspaceClient.getCurrentWorkspace()
      setWorkspace(workspace)
    } catch (err) {
      console.error('Error fetching workspace context:', err)
      setError(err.message)
      setWorkspace(null)
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    fetchWorkspaceContext()
  }, [fetchWorkspaceContext])

  return {
    workspace,
    isLoading,
    error,
    refetch: fetchWorkspaceContext,
  }
}

// Hook for workspace switching
export function useWorkspaceSwitch() {
  const [isSwitching, setIsSwitching] = useState(false)
  const router = useRouter()

  const switchWorkspace = useCallback(
    async workspaceId => {
      if (!workspaceId) {
        toast.error('Workspace ID is required')
        return false
      }

      try {
        setIsSwitching(true)

        const success = await WorkspaceClient.switchWorkspace(workspaceId)

        if (success) {
          toast.success('Workspace switched successfully')
          // Refresh the page to update context everywhere
          router.refresh()
          return true
        } else {
          toast.error('Failed to switch workspace')
          return false
        }
      } catch (error) {
        console.error('Error switching workspace:', error)
        toast.error('An unexpected error occurred')
        return false
      } finally {
        setIsSwitching(false)
      }
    },
    [router]
  )

  return {
    switchWorkspace,
    isSwitching,
  }
}

// Hook to get all user workspaces
export function useUserWorkspaces() {
  const { isAuthenticated } = useAuth()
  const [workspaces, setWorkspaces] = useState([])
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchWorkspaces = useCallback(async () => {
    if (!isAuthenticated) {
      setWorkspaces([])
      setCurrentWorkspaceId(null)
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const workspaces = await WorkspaceClient.getUserWorkspaces()
      const currentId = WorkspaceClient.getWorkspace()

      setWorkspaces(workspaces)
      setCurrentWorkspaceId(currentId)
    } catch (err) {
      console.error('Error fetching workspaces:', err)
      setError(err.message)
      setWorkspaces([])
      setCurrentWorkspaceId(null)
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    fetchWorkspaces()
  }, [fetchWorkspaces])

  return {
    workspaces,
    currentWorkspaceId,
    isLoading,
    error,
    refetch: fetchWorkspaces,
  }
}

// Hook to require workspace context
export function useRequireWorkspace(redirectTo = '/workspaces') {
  const { user, isLoading: authLoading } = useAuth()
  const { workspace, isLoading: workspaceLoading, error } = useWorkspaceContext()
  const router = useRouter()

  const isLoading = authLoading || workspaceLoading

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/auth/login')
      } else if (!workspace && error) {
        // No workspace available or error fetching workspace
        router.push(redirectTo)
      }
    }
  }, [user, workspace, isLoading, error, redirectTo, router])

  return {
    user,
    workspace,
    isLoading,
    error,
  }
}

// Hook to check if user has specific permission in current workspace
export function usePermission(permission) {
  const { workspace } = useWorkspaceContext()

  if (!workspace || !permission) return false

  try {
    const permissions = Array.isArray(workspace.permissions)
      ? workspace.permissions
      : JSON.parse(workspace.permissions || '[]')

    return permissions.includes(permission)
  } catch {
    return false
  }
}

// Hook to check multiple permissions (user needs ANY of them)
export function useAnyPermission(permissions) {
  const { workspace } = useWorkspaceContext()

  if (!workspace || !permissions || !Array.isArray(permissions)) return false

  try {
    const userPermissions = Array.isArray(workspace.permissions)
      ? workspace.permissions
      : JSON.parse(workspace.permissions || '[]')

    return permissions.some(permission => userPermissions.includes(permission))
  } catch {
    return false
  }
}

// Hook to check multiple permissions (user needs ALL of them)
export function useAllPermissions(permissions) {
  const { workspace } = useWorkspaceContext()

  if (!workspace || !permissions || !Array.isArray(permissions)) return false

  try {
    const userPermissions = Array.isArray(workspace.permissions)
      ? workspace.permissions
      : JSON.parse(workspace.permissions || '[]')

    return permissions.every(permission => userPermissions.includes(permission))
  } catch {
    return false
  }
}

// Hook to check if user has admin role in current workspace
export function useIsAdmin() {
  const { workspace } = useWorkspaceContext()

  return (
    workspace?.role?.name?.toLowerCase() === 'admin' ||
    workspace?.role?.name?.toLowerCase() === 'administrator'
  )
}

// Hook to get current workspace role
export function useWorkspaceRole() {
  const { workspace } = useWorkspaceContext()

  return workspace?.role || null
}

// Hook for workspace management (clear context, etc.)
export function useWorkspaceManagement() {
  const router = useRouter()

  const clearWorkspaceContext = useCallback(async () => {
    try {
      const success = await WorkspaceClient.clearWorkspaceContext()

      if (success) {
        toast.success('Workspace context cleared')
        router.push('/workspaces')
        router.refresh()
      } else {
        toast.error('Failed to clear workspace context')
      }
    } catch (error) {
      console.error('Error clearing workspace context:', error)
      toast.error('An unexpected error occurred')
    }
  }, [router])

  return {
    clearWorkspaceContext,
  }
}

// Utility hook to get workspace from client-side cookie (for immediate access)
export function useWorkspaceCookie() {
  const [workspaceId, setWorkspaceId] = useState(null)

  useEffect(() => {
    setWorkspaceId(WorkspaceClient.getWorkspace())
  }, [])

  return workspaceId
}
