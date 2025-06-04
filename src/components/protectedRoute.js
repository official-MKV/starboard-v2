import { usePermissions } from '@/hooks/usePermissions'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'

export const ProtectedRoute = ({
  children,
  permission,
  permissions,
  requireAll = false,
  redirectTo = '/unauthorized',
  fallback,
}) => {
  const { user, hasPermission, hasAnyPermission, hasAllPermissions, isLoading } = usePermissions()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && user) {
      let hasAccess = true

      if (permission) {
        hasAccess = hasPermission(permission)
      } else if (permissions && Array.isArray(permissions)) {
        hasAccess = requireAll ? hasAllPermissions(permissions) : hasAnyPermission(permissions)
      }

      if (!hasAccess) {
        router.push(redirectTo)
      }
    }
  }, [
    isLoading,
    user,
    permission,
    permissions,
    requireAll,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    router,
    redirectTo,
  ])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!user) {
    return fallback || null
  }

  let hasAccess = true
  if (permission) {
    hasAccess = hasPermission(permission)
  } else if (permissions && Array.isArray(permissions)) {
    hasAccess = requireAll ? hasAllPermissions(permissions) : hasAnyPermission(permissions)
  }

  if (!hasAccess) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
            <p className="text-gray-600">You don't have permission to access this page.</p>
          </div>
        </div>
      )
    )
  }

  return children
}
