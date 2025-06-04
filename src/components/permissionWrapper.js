import { usePermissions } from '@/lib/hooks/usePermissions'

export const PermissionWrapper = ({
  permission,
  permissions,
  requireAll = false,
  fallback = null,
  children,
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions()

  let hasAccess = true

  if (permission) {
    hasAccess = hasPermission(permission)
  } else if (permissions && Array.isArray(permissions)) {
    hasAccess = requireAll ? hasAllPermissions(permissions) : hasAnyPermission(permissions)
  }

  if (!hasAccess) {
    return fallback
  }

  return children
}
