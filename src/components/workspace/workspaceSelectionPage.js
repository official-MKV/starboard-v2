'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Building2, Plus, Users, Calendar, Loader2, ArrowRight } from 'lucide-react'
import { useAuth, useUserWorkspaces, useWorkspaceSwitch } from '@/lib/hooks/auth'
import { toast } from 'sonner'

export default function WorkspaceSelectionPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const { workspaces, isLoading: workspacesLoading, refetch } = useUserWorkspaces()
  const { switchWorkspace, isSwitching } = useWorkspaceSwitch()
  const router = useRouter()
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(null)

  const isLoading = authLoading || workspacesLoading

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [isAuthenticated, authLoading, router])

  useEffect(() => {
    // Auto-select first workspace if only one available
    if (workspaces.length === 1) {
      setSelectedWorkspaceId(workspaces[0].id)
    }
  }, [workspaces])

  const handleWorkspaceSelect = async workspaceId => {
    if (!workspaceId) {
      toast.error('Please select a workspace')
      return
    }

    const success = await switchWorkspace(workspaceId)
    console.log(success)
    if (success) {
      toast.success('Workspace selected successfully')
      router.push('/dashboard')
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

  const getRoleColor = role => {
    return role?.color || '#3b82f6'
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-snow-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-slate-gray-600">Loading your workspaces...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-snow-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-charcoal-900 mb-2">
            Welcome back, {user?.firstName}!
          </h1>
          <p className="text-slate-gray-600">
            {workspaces.length > 0
              ? 'Select a workspace to continue'
              : "You don't have access to any workspaces yet"}
          </p>
        </div>

        {workspaces.length > 0 ? (
          <>
            {/* Workspace Selection */}
            <div className="space-y-4 mb-8">
              {workspaces.map(workspace => (
                <Card
                  key={workspace.id}
                  className={`starboard-card cursor-pointer transition-all hover:shadow-lg ${
                    selectedWorkspaceId === workspace.id
                      ? 'ring-2 ring-primary bg-blue-50'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedWorkspaceId(workspace.id)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      {/* Workspace Avatar */}
                      <div className="flex-shrink-0">
                        {workspace.logo ? (
                          <Avatar className="w-12 h-12">
                            <AvatarImage src={workspace.logo} alt={workspace.name} />
                            <AvatarFallback className="text-sm font-medium">
                              {getWorkspaceInitials(workspace.name)}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-medium"
                            style={{ backgroundColor: getRoleColor(workspace.role) }}
                          >
                            {getWorkspaceInitials(workspace.name)}
                          </div>
                        )}
                      </div>

                      {/* Workspace Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-charcoal-900 truncate">
                            {workspace.name}
                          </h3>
                          <Badge
                            className="text-xs"
                            style={{
                              backgroundColor: `${getRoleColor(workspace.role)}20`,
                              color: getRoleColor(workspace.role),
                              borderColor: getRoleColor(workspace.role),
                            }}
                          >
                            {workspace.role?.name}
                          </Badge>
                        </div>

                        {workspace.description && (
                          <p className="text-slate-gray-600 text-sm mb-3 line-clamp-2">
                            {workspace.description}
                          </p>
                        )}

                        <div className="flex items-center space-x-4 text-sm text-slate-gray-500">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>Joined {new Date(workspace.joinedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Selection Indicator */}
                      <div className="flex-shrink-0">
                        {selectedWorkspaceId === workspace.id ? (
                          <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                            <div className="w-3 h-3 bg-white rounded-full" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 border-2 border-gray-300 rounded-full" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => handleWorkspaceSelect(selectedWorkspaceId)}
                disabled={!selectedWorkspaceId || isSwitching}
                className="starboard-button"
                size="lg"
              >
                {isSwitching ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="mr-2 h-4 w-4" />
                )}
                Continue to Workspace
              </Button>

              <Button variant="outline" onClick={() => router.push('/workspaces/create')} size="lg">
                <Plus className="mr-2 h-4 w-4" />
                Create New Workspace
              </Button>
            </div>
          </>
        ) : (
          /* No Workspaces Available */
          <div className="text-center">
            <Card className="starboard-card max-w-md mx-auto">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Building2 className="h-8 w-8 text-gray-400" />
                </div>

                <h3 className="text-lg font-semibold text-charcoal-900 mb-2">
                  No Workspaces Available
                </h3>

                <p className="text-slate-gray-600 mb-6">
                  You haven't been added to any workspaces yet. Contact your administrator or create
                  a new workspace to get started.
                </p>

                <div className="space-y-3">
                  <Button
                    onClick={() => router.push('/workspaces/create')}
                    className="starboard-button w-full"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Workspace
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => {
                      refetch()
                      toast.info('Checking for new workspace invitations...')
                    }}
                    className="w-full"
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Check for Invitations
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-sm text-slate-gray-500">
            Need help? Contact{' '}
            <a href="mailto:support@starboard.com" className="text-primary hover:underline">
              support@starboard.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
