'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Shield,
  Activity,
  Users,
  Settings,
  Database,
  FileText,
  BarChart3,
  AlertTriangle,
} from 'lucide-react'

const adminNavItems = [
  {
    name: 'Overview',
    href: '/admin',
    icon: BarChart3,
    description: 'System overview and metrics',
  },
  {
    name: 'System Logs',
    href: '/admin/logs',
    icon: Activity,
    description: 'Monitor application logs and errors',
  },
  {
    name: 'Users',
    href: '/admin/users',
    icon: Users,
    description: 'Manage user accounts and permissions',
  },
  {
    name: 'Workspaces',
    href: '/admin/workspaces',
    icon: Shield,
    description: 'Manage workspaces and access control',
  },
  {
    name: 'Database',
    href: '/admin/database',
    icon: Database,
    description: 'Database management and monitoring',
  },
  {
    name: 'Settings',
    href: '/admin/settings',
    icon: Settings,
    description: 'System configuration and settings',
  },
]

export function AdminNav({ className = '' }) {
  const pathname = usePathname()

  return (
    <nav className={`space-y-2 ${className}`}>
      <div className="px-3 py-2">
        <h2 className="mb-2 px-2 text-lg font-semibold text-charcoal-800">Admin Panel</h2>
      </div>

      <div className="space-y-1">
        {adminNavItems.map(item => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors
                ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-slate-gray-700 hover:bg-slate-gray-100 hover:text-slate-gray-900'
                }
              `}
            >
              <Icon className="mr-3 h-4 w-4" />
              <div>
                <div className="font-medium">{item.name}</div>
                <div className="text-xs text-slate-gray-500">{item.description}</div>
              </div>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export function AdminNavSidebar({ user }) {
  return (
    <div className="fixed left-0 top-0 z-50 h-screen w-64 border-r border-neutral-200 bg-white">
      <div className="flex h-16 items-center border-b border-neutral-200 px-6">
        <Link href="/admin" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-lg font-semibold text-charcoal-900">Admin</p>
            <p className="text-xs text-slate-gray-500">System Management</p>
          </div>
        </Link>
      </div>

      <div className="flex h-[calc(100vh-4rem)] flex-col">
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <AdminNav />
        </div>

        <div className="border-t border-neutral-200 p-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-slate-gray-200 rounded-full flex items-center justify-center">
              <span className="text-xs font-medium text-slate-gray-600">
                {user?.firstName?.[0]}
                {user?.lastName?.[0]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-charcoal-900 truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-slate-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
