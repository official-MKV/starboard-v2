'use client'

import { Button } from '@/components/ui/button'
import { Bell, Search, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'

export function DashboardHeader({ title, description, actions }) {
  return (
    <header className="bg-white border-b border-neutral-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Title Section */}
        <div>
          <h1 className="text-2xl font-bold text-charcoal-900">{title}</h1>
          {description && <p className="text-slate-gray-600 mt-1">{description}</p>}
        </div>

        {/* Actions Section */}
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-gray-400"
              size={16}
            />
            <Input placeholder="Search..." className="pl-10 w-64 starboard-input" />
          </div>

          {/* Notifications */}
          <Button variant="ghost" size="sm" className="relative">
            <Bell size={20} />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-xs"></span>
          </Button>

          {/* Custom Actions */}
          {actions}
        </div>
      </div>
    </header>
  )
}
