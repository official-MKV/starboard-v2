'use client'

import { useState, useEffect } from 'react'
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
  Menu,
  Trophy, 
  X,
} from 'lucide-react'
import { getInitials } from '@/lib/utils'
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar'

// Navigation items with their required permissions
const navigationItems = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: Home,
    alwaysShow: true,
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
    href: '/chat',
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
  <div className={`flex items-center px-3 py-3 ${isCollapsed ? 'justify-center' : ''}`}>
    <div className="w-6 h-6 bg-slate-gray-200 rounded animate-pulse" />
    {!isCollapsed && <div className="ml-3 w-20 h-4 bg-slate-gray-200 rounded animate-pulse" />}
  </div>
)

const SkeletonHeader = ({ isCollapsed }) => (
  <div className="p-4 border-b border-neutral-200">
    <div className="flex items-center justify-between">
      {!isCollapsed && (
        <div className="flex items-center">
          <div className="w-10 h-10 bg-slate-gray-200 rounded-lg animate-pulse" />
          <div className="ml-3 w-24 h-6 bg-slate-gray-200 rounded animate-pulse" />
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
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-slate-gray-200 rounded-full animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="w-28 h-4 bg-slate-gray-200 rounded animate-pulse" />
            <div className="w-36 h-3 bg-slate-gray-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="flex space-x-2">
          <div className="flex-1 h-9 bg-slate-gray-200 rounded animate-pulse" />
          <div className="w-9 h-9 bg-slate-gray-200 rounded animate-pulse" />
        </div>
      </div>
    ) : (
      <div className="space-y-2">
        <div className="w-full h-9 bg-slate-gray-200 rounded animate-pulse" />
        <div className="w-full h-9 bg-slate-gray-200 rounded animate-pulse" />
      </div>
    )}
  </div>
)

export function DashboardNav({ user }) {
  const { hasAnyPermission, isLoading } = usePermissions()
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  // Emit sidebar state changes for layout coordination
  useEffect(() => {
    const event = new CustomEvent('sidebarToggle', {
      detail: { isCollapsed },
    })
    window.dispatchEvent(event)
  }, [isCollapsed])

  // Handle mobile screen size detection
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileOpen(false)
  }, [pathname])

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' })
  }

  // Filter navigation items based on permissions
  const visibleNavigationItems = navigationItems.filter(item => {
    if (item.alwaysShow) return true
    if (!item.permissions || item.permissions.length === 0) return true
    return hasAnyPermission(item.permissions)
  })

  const sidebarContent = (
    <>
      {/* Header */}
      <div className="p-4 border-b border-neutral-200">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center">
              <img
                src="/logo-1.svg"
                alt="Logo"
                className="w-10 h-10 lg:w-12 lg:h-12 transform group-hover:scale-105 transition-all duration-300"
              />
              <span className="ml-3 text-lg lg:text-xl font-semibold text-charcoal-800">
                Starboard
              </span>
            </div>
          )}

          {/* Desktop collapse button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex p-1"
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </Button>

          {/* Mobile close button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-1"
          >
            <X size={20} />
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {isLoading
          ? Array.from({ length: 5 }, (_, i) => (
              <SkeletonNavItem key={i} isCollapsed={isCollapsed} />
            ))
          : visibleNavigationItems.map(item => {
              const Icon = item.icon
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'text-slate-gray-700 hover:bg-slate-gray-50 hover:text-slate-gray-900'
                  } ${isCollapsed ? 'justify-center' : ''}`}
                >
                  <Icon size={22} strokeWidth={1.5} />
                  {!isCollapsed && <span className="ml-3">{item.name}</span>}
                </Link>
              )
            })}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-neutral-200">
        {!user ? (
          <SkeletonUserSection isCollapsed={isCollapsed} />
        ) : !isCollapsed ? (
          <div className="space-y-3">
            {/* User Info */}
            <div className="flex items-center space-x-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={user.avatar} alt={`${user.firstName} ${user.lastName}`} />
                <AvatarFallback className="text-white text-sm font-medium bg-primary">
                  {getInitials(`${user.firstName} ${user.lastName}`)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-charcoal-800 truncate">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-slate-gray-600 truncate">{user.email}</p>
              </div>
            </div>

            {/* User Actions */}
            <div className="flex space-x-2">
              <Button variant="ghost" size="sm" className="flex-1 justify-start" asChild>
                <Link href="/profile">
                  <Settings size={18} strokeWidth={1.5} />
                  <span className="ml-2">Settings</span>
                </Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="px-2">
                <LogOut size={18} strokeWidth={1.5} />
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Button variant="ghost" size="sm" className="w-full p-2" asChild>
              <Link href="/profile">
                <Settings size={20} strokeWidth={1.5} />
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="w-full p-2" onClick={handleSignOut}>
              <LogOut size={20} strokeWidth={1.5} />
            </Button>
          </div>
        )}
      </div>
    </>
  )

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsMobileOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-white shadow-soft border border-neutral-200"
      >
        <Menu size={20} />
      </Button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Desktop Sidebar */}
      <div
        className={`hidden lg:fixed lg:flex lg:flex-col left-0 top-0 h-full bg-white border-r border-neutral-200 transition-all duration-300 z-30 ${
          isCollapsed ? 'w-20' : 'w-72'
        }`}
      >
        {sidebarContent}
      </div>

      {/* Mobile Sidebar */}
      <div
        className={`fixed left-0 top-0 h-full bg-white border-r border-neutral-200 transform transition-transform duration-300 z-50 w-72 lg:hidden ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        } flex flex-col`}
      >
        {sidebarContent}
      </div>
    </>
  )
}
