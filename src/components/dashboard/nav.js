'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { usePermissions } from '@/lib/hooks/usePermissions'
import { PERMISSIONS } from '@/lib/utils/permissions'
import {
  Home,
  Building2,
  FileText,
  Calendar,
  MessageCircle,
  FolderOpen,
  Users,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { getInitials } from '@/lib/utils'

// Navigation items with their required permissions
const navigationItems = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: Home,
    alwaysShow: true, // Dashboard is always visible
  },
  {
    name: 'Applications',
    href: '/applications',
    icon: FileText,
    permissions: [PERMISSIONS.APPLICATIONS_VIEW, PERMISSIONS.APPLICATIONS_MANAGE],
  },
  {
    name: 'Events',
    href: '/events',
    icon: Calendar,
    permissions: [PERMISSIONS.EVENTS_VIEW, PERMISSIONS.EVENTS_MANAGE],
  },
  {
    name: 'Resources',
    href: '/resources',
    icon: FolderOpen,
    permissions: [PERMISSIONS.RESOURCES_VIEW, PERMISSIONS.RESOURCES_MANAGE],
  },
  {
    name: 'Messages',
    href: '/messages',
    icon: MessageCircle,
    permissions: [PERMISSIONS.CHAT_VIEW, PERMISSIONS.CHAT_MANAGE],
  },
  {
    name: 'Workspace',
    href: '/workspaces',
    icon: Building2,
    permissions: [PERMISSIONS.WORKSPACE_VIEW, PERMISSIONS.WORKSPACE_MANAGE],
  },
  {
    name: 'Users',
    href: '/users',
    icon: Users,
    permissions: [PERMISSIONS.USERS_VIEW, PERMISSIONS.USERS_MANAGE],
  },
]

// Skeleton components
const SkeletonNavItem = ({ isCollapsed }) => (
  <div className={`flex items-center px-3 py-2 ${isCollapsed ? 'justify-center' : ''}`}>
    <div className="w-5 h-5 bg-slate-gray-200 rounded animate-pulse" />
    {!isCollapsed && <div className="ml-3 w-20 h-4 bg-slate-gray-200 rounded animate-pulse" />}
  </div>
)

const SkeletonHeader = ({ isCollapsed }) => (
  <div className="p-4 border-b border-neutral-200">
    <div className="flex items-center justify-between">
      {!isCollapsed && (
        <div className="flex items-center">
          <div className="w-8 h-8 bg-slate-gray-200 rounded-lg animate-pulse" />
          <div className="ml-2 w-20 h-6 bg-slate-gray-200 rounded animate-pulse" />
        </div>
      )}
      <div className="w-8 h-8 bg-slate-gray-200 rounded animate-pulse" />
    </div>
  </div>
)

const SkeletonUserSection = ({ isCollapsed }) => (
  <div className="p-4 border-t border-neutral-200">
    {!isCollapsed ? (
      <div className="space-y-3">
        {/* User Info Skeleton */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-slate-gray-200 rounded-full animate-pulse" />
          <div className="flex-1 space-y-1">
            <div className="w-24 h-4 bg-slate-gray-200 rounded animate-pulse" />
            <div className="w-32 h-3 bg-slate-gray-200 rounded animate-pulse" />
          </div>
        </div>

        {/* User Actions Skeleton */}
        <div className="flex space-x-1">
          <div className="flex-1 h-8 bg-slate-gray-200 rounded animate-pulse" />
          <div className="w-8 h-8 bg-slate-gray-200 rounded animate-pulse" />
        </div>
      </div>
    ) : (
      <div className="space-y-2">
        <div className="w-full h-8 bg-slate-gray-200 rounded animate-pulse" />
        <div className="w-full h-8 bg-slate-gray-200 rounded animate-pulse" />
      </div>
    )}
  </div>
)

export function DashboardNav() {
  const { user, hasAnyPermission, isLoading } = usePermissions()
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' })
  }

  // Filter navigation items based on permissions
  const visibleNavigationItems = navigationItems.filter(item => {
    if (item.alwaysShow) return true
    if (!item.permissions || item.permissions.length === 0) return true
    return hasAnyPermission(item.permissions)
  })

  // Show skeleton loading state if session is loading
  if (isLoading || !user) {
    return (
      <div
        className={`fixed left-0 top-0 h-full bg-white border-r border-neutral-200 transition-all duration-300 ${
          isCollapsed ? 'w-16' : 'w-64'
        } flex flex-col`}
      >
        {/* Header Skeleton */}
        <SkeletonHeader isCollapsed={isCollapsed} />

        {/* Navigation Skeleton */}
        <nav className="flex-1 p-4 space-y-2">
          {Array.from({ length: 5 }, (_, i) => (
            <SkeletonNavItem key={i} isCollapsed={isCollapsed} />
          ))}
        </nav>

        {/* User Section Skeleton */}
        <SkeletonUserSection isCollapsed={isCollapsed} />

        {/* Collapse Toggle (still functional during loading) */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute top-4 right-4 p-1 z-10"
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </Button>
      </div>
    )
  }

  return (
    <div
      className={`fixed left-0 top-0 h-full bg-white border-r border-neutral-200 transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-64'
      } flex flex-col`}
    >
      {/* Header */}
      <div className="p-4 border-b border-neutral-200">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <span className="ml-2 text-xl font-semibold text-charcoal-800">Starboard</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1"
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {visibleNavigationItems.map(item => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-slate-gray-700 hover:bg-slate-gray-100 hover:text-slate-gray-900'
              } ${isCollapsed ? 'justify-center' : ''}`}
            >
              <Icon size={20} />
              {!isCollapsed && <span className="ml-3">{item.name}</span>}
            </Link>
          )
        })}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-neutral-200">
        {!isCollapsed ? (
          <div className="space-y-3">
            {/* User Info */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {getInitials(`${user.firstName} ${user.lastName}`)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-charcoal-800 truncate">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-slate-gray-600 truncate">{user.email}</p>
              </div>
            </div>

            {/* User Actions */}
            <div className="flex space-x-1">
              <Button variant="ghost" size="sm" className="flex-1" asChild>
                <Link href="/profile">
                  <Settings size={16} />
                  <span className="ml-2">Settings</span>
                </Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut size={16} />
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Button variant="ghost" size="sm" className="w-full p-2" asChild>
              <Link href="/profile">
                <Settings size={16} />
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="w-full p-2" onClick={handleSignOut}>
              <LogOut size={16} />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
