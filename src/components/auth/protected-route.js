'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'

export function ProtectedRoute({
  children,
  redirectTo = '/auth/login',
  requiredPermission = null,
  workspaceId = null,
  fallback = null,
}) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return // Still loading

    if (!session) {
      // Not authenticated, redirect to login
      const currentPath = window.location.pathname
      const redirectUrl = `${redirectTo}?callbackUrl=${encodeURIComponent(currentPath)}`
      router.push(redirectUrl)
      return
    }

    // Check permission if required
    if (requiredPermission && workspaceId) {
      const workspace = session.user.workspaces?.find(w => w.id === workspaceId)
      if (!workspace) {
        router.push('/dashboard?error=workspace_not_found')
        return
      }

      try {
        const permissions =
          typeof workspace.permissions === 'string'
            ? JSON.parse(workspace.permissions)
            : workspace.permissions

        if (!Array.isArray(permissions) || !permissions.includes(requiredPermission)) {
          router.push('/dashboard?error=insufficient_permissions')
          return
        }
      } catch (error) {
        console.error('Error checking permissions:', error)
        router.push('/dashboard?error=permission_check_failed')
        return
      }
    }
  }, [session, status, redirectTo, requiredPermission, workspaceId, router])

  // Show loading state
  if (status === 'loading') {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center bg-snow-100">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-slate-gray-600">Loading...</p>
          </div>
        </div>
      )
    )
  }

  // Not authenticated
  if (!session) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center bg-snow-100">
          <div className="text-center">
            <p className="text-slate-gray-600">Redirecting to login...</p>
          </div>
        </div>
      )
    )
  }

  // Permission check failed
  if (requiredPermission && workspaceId) {
    const workspace = session.user.workspaces?.find(w => w.id === workspaceId)
    if (!workspace) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-snow-100">
          <div className="text-center">
            <p className="text-red-600">Workspace not found</p>
          </div>
        </div>
      )
    }

    try {
      const permissions =
        typeof workspace.permissions === 'string'
          ? JSON.parse(workspace.permissions)
          : workspace.permissions

      if (!Array.isArray(permissions) || !permissions.includes(requiredPermission)) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-snow-100">
            <div className="text-center">
              <p className="text-red-600">Insufficient permissions</p>
            </div>
          </div>
        )
      }
    } catch {
      return (
        <div className="min-h-screen flex items-center justify-center bg-snow-100">
          <div className="text-center">
            <p className="text-red-600">Permission check failed</p>
          </div>
        </div>
      )
    }
  }

  // All checks passed, render children
  return children
}

// Higher-order component version
export function withAuth(Component, options = {}) {
  const AuthenticatedComponent = props => {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    )
  }

  AuthenticatedComponent.displayName = `withAuth(${Component.displayName || Component.name})`

  return AuthenticatedComponent
}

// Role-based protection
export function ProtectedByRole({ children, allowedRoles = [], workspaceId = null }) {
  const { data: session } = useSession()

  if (!session?.user?.workspaces) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Access denied: No workspace access</p>
      </div>
    )
  }

  let hasAccess = false

  if (workspaceId) {
    // Check role in specific workspace
    const workspace = session.user.workspaces.find(w => w.id === workspaceId)
    hasAccess = workspace && allowedRoles.includes(workspace.role?.toLowerCase())
  } else {
    // Check role in any workspace
    hasAccess = session.user.workspaces.some(workspace =>
      allowedRoles.includes(workspace.role?.toLowerCase())
    )
  }

  if (!hasAccess) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Access denied: Required roles: {allowedRoles.join(', ')}</p>
      </div>
    )
  }

  return children
}

// Permission-based protection
export function ProtectedByPermission({ children, permission, workspaceId }) {
  return (
    <ProtectedRoute requiredPermission={permission} workspaceId={workspaceId}>
      {children}
    </ProtectedRoute>
  )
}
