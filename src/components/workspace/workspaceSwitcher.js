'use client'

import { useState } from 'react'
import { Check, ChevronDown, Building2, Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useWorkspaceContext, useUserWorkspaces, useWorkspaceSwitch } from '@/lib/hooks/auth'

export default function WorkspaceSwitcher({ className = '' }) {
  const { workspace: currentWorkspace, isLoading: contextLoading } = useWorkspaceContext()
  const { workspaces, isLoading: workspacesLoading } = useUserWorkspaces()
  const { switchWorkspace, isSwitching } = useWorkspaceSwitch()
  const [isOpen, setIsOpen] = useState(false)

  const isLoading = contextLoading || workspacesLoading

  const handleWorkspaceSwitch = async workspaceId => {
    if (workspaceId === currentWorkspace?.workspaceId) {
      setIsOpen(false)
      return
    }

    const success = await switchWorkspace(workspaceId)
    if (success) {
      setIsOpen(false)
    }
  }

  const getWorkspaceInitials = name => {
    return (
      name
        ?.split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || '?'
    )
  }

  if (isLoading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse" />
        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
      </div>
    )
  }

  if (!currentWorkspace && workspaces.length === 0) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
          <Building2 className="h-4 w-4 text-gray-400" />
        </div>
        <span className="text-sm text-gray-500">No workspace</span>
      </div>
    )
  }

  const displayWorkspace = currentWorkspace?.workspace || workspaces[0]

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={`w-full justify-between h-auto p-2 hover:bg-gray-50 ${className}`}
          disabled={isSwitching}
        >
          <div className="flex items-center space-x-3 min-w-0">
            {displayWorkspace?.logo ? (
              <Avatar className="w-8 h-8">
                <AvatarImage src={displayWorkspace.logo} alt={displayWorkspace.name} />
                <AvatarFallback className="text-xs">
                  {getWorkspaceInitials(displayWorkspace.name)}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-medium"
                style={{ backgroundColor: currentWorkspace?.role?.color || '#3b82f6' }}
              >
                {getWorkspaceInitials(displayWorkspace?.name)}
              </div>
            )}
            <div className="text-left min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">
                {displayWorkspace?.name || 'Select Workspace'}
              </p>
              {currentWorkspace?.role && (
                <p className="text-xs text-gray-500 truncate">{currentWorkspace.role.name}</p>
              )}
            </div>
          </div>
          {isSwitching ? (
            <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-64" align="start">
        <DropdownMenuLabel>Switch Workspace</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {workspaces.map(workspace => (
          <DropdownMenuItem
            key={workspace.id}
            onClick={() => handleWorkspaceSwitch(workspace.id)}
            className="flex items-center space-x-3 p-3 cursor-pointer"
          >
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              {workspace.logo ? (
                <Avatar className="w-8 h-8">
                  <AvatarImage src={workspace.logo} alt={workspace.name} />
                  <AvatarFallback className="text-xs">
                    {getWorkspaceInitials(workspace.name)}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-medium"
                  style={{ backgroundColor: workspace.role?.color || '#3b82f6' }}
                >
                  {getWorkspaceInitials(workspace.name)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{workspace.name}</p>
                <p className="text-xs text-gray-500 truncate">{workspace.role?.name}</p>
              </div>
            </div>
            {currentWorkspace?.workspaceId === workspace.id && (
              <Check className="h-4 w-4 text-blue-600 flex-shrink-0" />
            )}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        <DropdownMenuItem className="flex items-center space-x-3 p-3 cursor-pointer text-gray-600">
          <div className="w-8 h-8 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
            <Plus className="h-4 w-4" />
          </div>
          <span className="text-sm">Create workspace</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Compact version for navigation bars
export function CompactWorkspaceSwitcher({ className = '' }) {
  const { workspace: currentWorkspace, isLoading } = useWorkspaceContext()
  const { workspaces } = useUserWorkspaces()
  const { switchWorkspace, isSwitching } = useWorkspaceSwitch()
  const [isOpen, setIsOpen] = useState(false)

  const handleWorkspaceSwitch = async workspaceId => {
    if (workspaceId === currentWorkspace?.workspaceId) {
      setIsOpen(false)
      return
    }

    const success = await switchWorkspace(workspaceId)
    if (success) {
      setIsOpen(false)
    }
  }

  const getWorkspaceInitials = name => {
    return (
      name
        ?.split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || '?'
    )
  }

  if (isLoading) {
    return <div className={`w-8 h-8 bg-gray-200 rounded-lg animate-pulse ${className}`} />
  }

  const displayWorkspace = currentWorkspace?.workspace || workspaces[0]

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`w-10 h-10 p-0 relative ${className}`}
          disabled={isSwitching}
        >
          {isSwitching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : displayWorkspace?.logo ? (
            <Avatar className="w-8 h-8">
              <AvatarImage src={displayWorkspace.logo} alt={displayWorkspace.name} />
              <AvatarFallback className="text-xs">
                {getWorkspaceInitials(displayWorkspace.name)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-medium"
              style={{ backgroundColor: currentWorkspace?.role?.color || '#3b82f6' }}
            >
              {getWorkspaceInitials(displayWorkspace?.name)}
            </div>
          )}
          <ChevronDown className="h-3 w-3 absolute -bottom-1 -right-1 bg-white rounded-full border shadow-sm" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-56" align="start">
        <DropdownMenuLabel className="px-3 py-2">{displayWorkspace?.name}</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {workspaces.map(workspace => (
          <DropdownMenuItem
            key={workspace.id}
            onClick={() => handleWorkspaceSwitch(workspace.id)}
            className="flex items-center space-x-2 px-3 py-2 cursor-pointer"
          >
            <div
              className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-medium"
              style={{ backgroundColor: workspace.role?.color || '#3b82f6' }}
            >
              {getWorkspaceInitials(workspace.name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{workspace.name}</p>
            </div>
            {currentWorkspace?.workspaceId === workspace.id && (
              <Check className="h-4 w-4 text-blue-600" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
