'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Plus,
  Shield,
  Users,
  User,
  Settings,
  Edit,
  Copy,
  Trash2,
  MoreHorizontal,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  Star,
  StarOff,
  Eye,
  Mail,
  CheckCircle,
  AlertCircle,
  Loader2,
  Crown,
  UserPlus,
  Palette,
  FormInput,
  Save,
  X,
  GripVertical,
  Upload,
  Info,
} from 'lucide-react'

import OnboardingFormBuilder from './onboardingFormBuilder'

export default function RoleManagement() {
  const { data: session } = useSession()
  const [roles, setRoles] = useState([])
  const [permissions, setPermissions] = useState([])
  const [statistics, setStatistics] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState(null)
  const [isSaving, setIsSaving] = useState(false)

  const [filters, setFilters] = useState({
    search: '',
    type: 'all', // all, system, custom
  })

  const [roleForm, setRoleForm] = useState({
    name: '',
    description: '',
    color: '#3b82f6',
    permissions: [],
    requiresOnboarding: false,
    onboardingFields: [],
    createEmailTemplate: true,
    emailTemplate: {
      subject: '',
      content: '',
    },
    canMentor: false,
    canBeMentee: false,
  })

  const [duplicateName, setDuplicateName] = useState('')
  const [expandedCategories, setExpandedCategories] = useState({})

  useEffect(() => {
    fetchRoles()
    fetchPermissions()
    fetchStatistics()
  }, [])

  const fetchRoles = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/roles')
      if (response.ok) {
        const data = await response.json()
        setRoles(data.data.roles)
      }
    } catch (error) {
      console.error('Error fetching roles:', error)
      toast.error('Failed to load roles')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPermissions = async () => {
    try {
      const response = await fetch('/api/roles/permissions')
      if (response.ok) {
        const data = await response.json()
        setPermissions(data.data.permissions)

        // Initialize expanded categories
        const initialExpanded = {}
        data.data.permissions.forEach(category => {
          initialExpanded[category.category] = false
        })
        setExpandedCategories(initialExpanded)
      }
    } catch (error) {
      console.error('Error fetching permissions:', error)
    }
  }

  const fetchStatistics = async () => {
    try {
      const response = await fetch('/api/roles/statistics')
      if (response.ok) {
        const data = await response.json()
        setStatistics(data.data.statistics)
      }
    } catch (error) {
      console.error('Error fetching statistics:', error)
    }
  }

  const resetForm = () => {
    setRoleForm({
      name: '',
      description: '',
      color: '#3b82f6',
      permissions: [],
      requiresOnboarding: false,
      onboardingFields: [],
      createEmailTemplate: true,
      emailTemplate: {
        subject: '',
        content: '',
      },
      canMentor: false,
      canBeMentee: false,
    })
  }

  const validateMentorshipCapabilities = () => {
    // Optional: You might want to warn if a role has permissions for mentorship
    // but doesn't have the capabilities enabled
    const hasMentorshipPermissions = roleForm.permissions.some(
      permission => permission.includes('mentorship') || permission.includes('mentor')
    )

    if (hasMentorshipPermissions && !roleForm.canMentor && !roleForm.canBeMentee) {
      toast.warning('This role has mentorship permissions but no mentorship capabilities enabled')
    }
  }

  const handleCreateRole = async () => {
    if (!roleForm.name.trim()) {
      toast.error('Role name is required')
      return
    }

    if (roleForm.permissions.length === 0) {
      toast.error('At least one permission is required')
      return
    }

    validateMentorshipCapabilities()

    setIsSaving(true)
    try {
      const response = await fetch('/api/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...roleForm,
          onboardingForm: roleForm.requiresOnboarding
            ? {
                fields: roleForm.onboardingFields,
                settings: {
                  title: `Complete Your ${roleForm.name} Profile`,
                  description: `Please provide the required information for your ${roleForm.name} role.`,
                },
              }
            : null,
        }),
      })

      if (response.ok) {
        toast.success('Role created successfully')
        setIsCreateDialogOpen(false)
        resetForm()
        fetchRoles()
        fetchStatistics()
      } else {
        const error = await response.json()
        toast.error(error.error?.message || 'Failed to create role')
      }
    } catch (error) {
      console.error('Error creating role:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsSaving(false)
    }
  }

  const handleEditRole = async () => {
    if (!selectedRole || !roleForm.name.trim()) {
      toast.error('Role name is required')
      return
    }

    validateMentorshipCapabilities()

    setIsSaving(true)
    try {
      const response = await fetch(`/api/roles/${selectedRole.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...roleForm,
          onboardingForm: roleForm.requiresOnboarding
            ? {
                fields: roleForm.onboardingFields,
                settings: {
                  title: `Complete Your ${roleForm.name} Profile`,
                  description: `Please provide the required information for your ${roleForm.name} role.`,
                },
              }
            : null,
        }),
      })

      if (response.ok) {
        toast.success('Role updated successfully')
        setIsEditDialogOpen(false)
        setSelectedRole(null)
        resetForm()
        fetchRoles()
      } else {
        const error = await response.json()
        toast.error(error.error?.message || 'Failed to update role')
      }
    } catch (error) {
      console.error('Error updating role:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDuplicateRole = async () => {
    if (!selectedRole || !duplicateName.trim()) {
      toast.error('Please enter a name for the duplicated role')
      return
    }

    try {
      const response = await fetch(`/api/roles/${selectedRole.id}/duplicate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: duplicateName.trim(),
        }),
      })

      if (response.ok) {
        toast.success('Role duplicated successfully')
        setIsDuplicateDialogOpen(false)
        setSelectedRole(null)
        setDuplicateName('')
        fetchRoles()
        fetchStatistics()
      } else {
        const error = await response.json()
        toast.error(error.error?.message || 'Failed to duplicate role')
      }
    } catch (error) {
      console.error('Error duplicating role:', error)
      toast.error('An unexpected error occurred')
    }
  }

  const handleDeleteRole = async role => {
    if (
      !confirm(
        `Are you sure you want to delete the role "${role.name}"? This action cannot be undone.`
      )
    ) {
      return
    }

    if (role.isSystem) {
      toast.error('Cannot delete system role')
      return
    }

    if (role._count.members > 0) {
      toast.error('Cannot delete role with existing members. Please reassign members first.')
      return
    }

    try {
      const response = await fetch(`/api/roles/${role.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Role deleted successfully')
        fetchRoles()
        fetchStatistics()
      } else {
        const error = await response.json()
        toast.error(error.error?.message || 'Failed to delete role')
      }
    } catch (error) {
      console.error('Error deleting role:', error)
      toast.error('An unexpected error occurred')
    }
  }

  const openEditDialog = role => {
    setSelectedRole(role)
    setRoleForm({
      name: role.name,
      description: role.description || '',
      color: role.color,
      permissions: role.permissions,
      requiresOnboarding: role.requiresOnboarding,
      onboardingFields: role.onboardingForm?.fields || [],
      createEmailTemplate: false, // Don't auto-create on edit
      emailTemplate: {
        subject: role.emailTemplates?.[0]?.subject || '',
        content: '', // We'd need to fetch the full template
      },
      canMentor: role.canMentor || false,
      canBeMentee: role.canBeMentee || false,
    })
    setIsEditDialogOpen(true)
  }

  const handlePermissionToggle = permissionKey => {
    setRoleForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionKey)
        ? prev.permissions.filter(p => p !== permissionKey)
        : [...prev.permissions, permissionKey],
    }))
  }

  const toggleCategory = category => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category],
    }))
  }

  const getStatusBadge = role => {
    if (role.isSystem) {
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          System
        </Badge>
      )
    }
    if (role.isDefault) {
      return <Badge className="bg-yellow-100 text-yellow-800">Default</Badge>
    }
    return <Badge variant="outline">Custom</Badge>
  }

  const filteredRoles = roles.filter(role => {
    const matchesSearch =
      role.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      role.description?.toLowerCase().includes(filters.search.toLowerCase())
    const matchesType =
      filters.type === 'all' ||
      (filters.type === 'system' && role.isSystem) ||
      (filters.type === 'custom' && !role.isSystem)

    return matchesSearch && matchesType
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-snow-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-slate-gray-600">Loading roles...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-charcoal-900">Role Management</h2>
          <p className="text-slate-gray-600 mt-1">
            Manage workspace roles, permissions, and mentorship capabilities
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="starboard-button">
                <Shield className="mr-2 h-4 w-4" />
                Create Role
              </Button>
            </DialogTrigger>
            <DialogContent className="w-full max-w-[95vw] sm:max-w-2xl lg:max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Role</DialogTitle>
                <DialogDescription>
                  Set up a new role with permissions, mentorship capabilities, and onboarding
                  requirements
                </DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-1">
                  <TabsTrigger value="basic" className="text-xs sm:text-sm">
                    Basic Info
                  </TabsTrigger>
                  <TabsTrigger value="permissions" className="text-xs sm:text-sm">
                    Permissions
                  </TabsTrigger>
                  <TabsTrigger value="onboarding" className="text-xs sm:text-sm">
                    Onboarding
                  </TabsTrigger>
                  <TabsTrigger value="email" className="text-xs sm:text-sm">
                    Email Template
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4 mt-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="roleName">Role Name *</Label>
                      <Input
                        id="roleName"
                        value={roleForm.name}
                        onChange={e => setRoleForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., Team Lead"
                        className="starboard-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="roleColor">Role Color</Label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="color"
                          id="roleColor"
                          value={roleForm.color}
                          onChange={e => setRoleForm(prev => ({ ...prev, color: e.target.value }))}
                          className="w-12 h-10 rounded border border-gray-300 flex-shrink-0"
                        />
                        <Input
                          value={roleForm.color}
                          onChange={e => setRoleForm(prev => ({ ...prev, color: e.target.value }))}
                          placeholder="#3b82f6"
                          className="starboard-input flex-1 min-w-0"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="roleDescription">Description</Label>
                    <Textarea
                      id="roleDescription"
                      value={roleForm.description}
                      onChange={e =>
                        setRoleForm(prev => ({ ...prev, description: e.target.value }))
                      }
                      placeholder="Describe the role and its responsibilities..."
                      rows={3}
                      className="starboard-input resize-none"
                    />
                  </div>

                  {/* ✅ MENTORSHIP CAPABILITIES SECTION */}
                  <div className="space-y-4 border-t pt-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-3">
                        Mentorship Capabilities
                      </h4>
                      <p className="text-xs text-gray-500 mb-4">
                        Define what mentorship activities users with this role can participate in
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-3 p-3 border rounded-lg">
                        <Switch
                          id="canMentor"
                          checked={roleForm.canMentor}
                          onCheckedChange={checked =>
                            setRoleForm(prev => ({ ...prev, canMentor: checked }))
                          }
                        />
                        <div className="flex-1">
                          <Label htmlFor="canMentor" className="text-sm font-medium cursor-pointer">
                            Can Mentor
                          </Label>
                          <p className="text-xs text-gray-500">
                            Users with this role can be assigned as mentors to others
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 p-3 border rounded-lg">
                        <Switch
                          id="canBeMentee"
                          checked={roleForm.canBeMentee}
                          onCheckedChange={checked =>
                            setRoleForm(prev => ({ ...prev, canBeMentee: checked }))
                          }
                        />
                        <div className="flex-1">
                          <Label
                            htmlFor="canBeMentee"
                            className="text-sm font-medium cursor-pointer"
                          >
                            Can Be Mentee
                          </Label>
                          <p className="text-xs text-gray-500">
                            Users with this role can be assigned mentees and receive mentoring
                          </p>
                        </div>
                      </div>
                    </div>

                    {roleForm.canMentor && roleForm.canBeMentee && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <div className="flex items-start space-x-2">
                          <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div className="text-sm text-blue-800">
                            <p className="font-medium">Dual Role Capability</p>
                            <p>
                              Users with this role can both mentor others and be mentored
                              themselves. This is useful for mid-level roles where peer mentoring is
                              common.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {!roleForm.canMentor && !roleForm.canBeMentee && (
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                        <div className="flex items-start space-x-2">
                          <AlertCircle className="h-4 w-4 text-gray-600 mt-0.5 flex-shrink-0" />
                          <div className="text-sm text-gray-700">
                            <p className="font-medium">No Mentorship Capabilities</p>
                            <p>Users with this role will not participate in mentorship programs.</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="text-sm text-slate-gray-600">
                    <strong>Selected Permissions:</strong> {roleForm.permissions.length}
                  </div>
                </TabsContent>

                <TabsContent value="permissions" className="space-y-4 mt-6">
                  <div className="text-sm text-slate-gray-600 mb-4">
                    Select the permissions this role should have. You can expand categories to see
                    detailed permissions.
                  </div>

                  <div className="space-y-4 max-h-60 sm:max-h-96 overflow-y-auto">
                    {permissions.map(category => (
                      <div key={category.category} className="border rounded-lg">
                        <Collapsible
                          open={expandedCategories[category.category]}
                          onOpenChange={() => toggleCategory(category.category)}
                        >
                          <CollapsibleTrigger asChild>
                            <div className="flex items-center justify-between p-3 sm:p-4 hover:bg-gray-50 cursor-pointer">
                              <div className="flex items-center space-x-2 min-w-0 flex-1">
                                {expandedCategories[category.category] ? (
                                  <ChevronDown className="h-4 w-4 flex-shrink-0" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 flex-shrink-0" />
                                )}
                                <h4 className="font-medium text-sm sm:text-base truncate">
                                  {category.category}
                                </h4>
                                <Badge variant="outline" className="text-xs flex-shrink-0">
                                  {
                                    category.permissions.filter(p =>
                                      roleForm.permissions.includes(p.key)
                                    ).length
                                  }
                                  /{category.permissions.length}
                                </Badge>
                              </div>
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-3">
                              {category.permissions.map(permission => (
                                <div key={permission.key} className="flex items-start space-x-3">
                                  <Checkbox
                                    id={permission.key}
                                    checked={roleForm.permissions.includes(permission.key)}
                                    onCheckedChange={() => handlePermissionToggle(permission.key)}
                                    className="flex-shrink-0 mt-0.5"
                                  />
                                  <div className="grid gap-1.5 leading-none min-w-0 flex-1">
                                    <Label
                                      htmlFor={permission.key}
                                      className="text-sm font-medium leading-none cursor-pointer"
                                    >
                                      {permission.label}
                                    </Label>
                                    <p className="text-xs text-muted-foreground break-words">
                                      {permission.description}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="onboarding" className="space-y-4 mt-6">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="requiresOnboarding"
                      checked={roleForm.requiresOnboarding}
                      onCheckedChange={checked =>
                        setRoleForm(prev => ({ ...prev, requiresOnboarding: checked }))
                      }
                    />
                    <Label htmlFor="requiresOnboarding" className="text-sm">
                      Require onboarding for this role
                    </Label>
                  </div>

                  {roleForm.requiresOnboarding && (
                    <div className="w-full overflow-hidden">
                      <OnboardingFormBuilder roleForm={roleForm} setRoleForm={setRoleForm} />
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="email" className="space-y-4 mt-6">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="createEmailTemplate"
                      checked={roleForm.createEmailTemplate}
                      onCheckedChange={checked =>
                        setRoleForm(prev => ({ ...prev, createEmailTemplate: checked }))
                      }
                    />
                    <Label htmlFor="createEmailTemplate" className="text-sm">
                      Create custom invitation email template
                    </Label>
                  </div>

                  {roleForm.createEmailTemplate && (
                    <div className="space-y-4 p-3 sm:p-4 border rounded-lg bg-gray-50">
                      <div>
                        <Label htmlFor="emailSubject">Email Subject</Label>
                        <Input
                          id="emailSubject"
                          value={roleForm.emailTemplate.subject}
                          onChange={e =>
                            setRoleForm(prev => ({
                              ...prev,
                              emailTemplate: { ...prev.emailTemplate, subject: e.target.value },
                            }))
                          }
                          placeholder={`You're invited to join {{workspace_name}} as ${
                            roleForm.name || 'Role Name'
                          }`}
                          className="starboard-input"
                        />
                      </div>

                      <div>
                        <Label htmlFor="emailContent">Email Content</Label>
                        <Textarea
                          id="emailContent"
                          value={roleForm.emailTemplate.content}
                          onChange={e =>
                            setRoleForm(prev => ({
                              ...prev,
                              emailTemplate: { ...prev.emailTemplate, content: e.target.value },
                            }))
                          }
                          placeholder={`Hello {{first_name}},\n\n{{inviter_name}} has invited you to join {{workspace_name}} as a ${
                            roleForm.name || 'Role Name'
                          }.\n\n{{message}}\n\nClick the link below to accept your invitation:\n{{invitation_link}}\n\nBest regards,\nThe {{workspace_name}} Team`}
                          rows={6}
                          className="starboard-input font-mono text-sm resize-none"
                        />
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateRole}
                  disabled={isSaving || !roleForm.name.trim() || roleForm.permissions.length === 0}
                  className="starboard-button w-full sm:w-auto"
                >
                  {isSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Create Role
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <Card className="starboard-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-gray-600">Total Roles</p>
                  <p className="text-2xl font-bold text-charcoal-900">{statistics.totalRoles}</p>
                </div>
                <Shield className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="starboard-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-gray-600">With Onboarding</p>
                  <p className="text-2xl font-bold text-charcoal-900">
                    {statistics.rolesWithOnboarding}
                  </p>
                </div>
                <FormInput className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="starboard-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-gray-600">Total Members</p>
                  <p className="text-2xl font-bold text-charcoal-900">{statistics.totalMembers}</p>
                </div>
                <Users className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="starboard-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-gray-600">Mentorship Roles</p>
                  <p className="text-2xl font-bold text-charcoal-900">
                    {roles.filter(r => r.canMentor || r.canBeMentee).length}
                  </p>
                  <p className="text-xs text-slate-gray-500 mt-1">
                    {roles.filter(r => r.canMentor).length} mentors,{' '}
                    {roles.filter(r => r.canBeMentee).length} mentees
                  </p>
                </div>
                <Users className="h-8 w-8 text-indigo-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="starboard-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-gray-600">Avg Members/Role</p>
                  <p className="text-2xl font-bold text-charcoal-900">
                    {Math.round(statistics.averageMembersPerRole)}
                  </p>
                </div>
                <UserPlus className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="starboard-card">
        <CardContent className="py-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-gray-400" />
              <Input
                placeholder="Search roles..."
                value={filters.search}
                onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-9"
              />
            </div>
            <Select
              value={filters.type}
              onValueChange={value => setFilters(prev => ({ ...prev, type: value }))}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Roles Table */}
      <Card className="starboard-card">
        <CardHeader>
          <CardTitle>Roles</CardTitle>
          <CardDescription>
            Manage workspace roles, permissions, and mentorship capabilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Capabilities</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Email Template</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRoles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="text-slate-gray-500">
                      <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No roles found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRoles.map(role => (
                  <TableRow key={role.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: role.color }}
                        />
                        <div>
                          <div className="font-medium flex items-center">
                            {role.name}
                            {role.isDefault && <Crown className="ml-2 h-4 w-4 text-yellow-500" />}
                          </div>
                          {role.description && (
                            <div className="text-sm text-slate-gray-500 line-clamp-1">
                              {role.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-slate-gray-400" />
                        <span>{role._count?.members || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge variant="outline">{role.permissions?.length || 0} permissions</Badge>
                        {(role.canMentor || role.canBeMentee) && (
                          <div className="flex flex-wrap gap-1">
                            {role.canMentor && (
                              <Badge
                                variant="outline"
                                className="bg-blue-50 text-blue-700 border-blue-200 text-xs"
                              >
                                <Users className="mr-1 h-3 w-3" />
                                Mentor
                              </Badge>
                            )}
                            {role.canBeMentee && (
                              <Badge
                                variant="outline"
                                className="bg-green-50 text-green-700 border-green-200 text-xs"
                              >
                                <User className="mr-1 h-3 w-3" />
                                Mentee
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col space-y-1">
                        {getStatusBadge(role)}
                        {role.requiresOnboarding && (
                          <Badge
                            variant="outline"
                            className="bg-green-50 text-green-700 border-green-200 text-xs"
                          >
                            Onboarding
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {role.emailTemplates?.length > 0 ? (
                        <div className="flex items-center space-x-1">
                          <Mail className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-green-700">Custom</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1">
                          <Mail className="h-4 w-4 text-slate-gray-400" />
                          <span className="text-sm text-slate-gray-500">Default</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => openEditDialog(role)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedRole(role)
                              setDuplicateName(`${role.name} Copy`)
                              setIsDuplicateDialogOpen(true)
                            }}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicate
                          </DropdownMenuItem>
                          {!role.isSystem && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteRole(role)}
                                className="text-red-600"
                                disabled={role._count?.members > 0}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Role Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Role: {selectedRole?.name}</DialogTitle>
            <DialogDescription>
              Modify role settings, permissions, and mentorship capabilities
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="permissions">Permissions</TabsTrigger>
              <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editRoleName">Role Name *</Label>
                  <Input
                    id="editRoleName"
                    value={roleForm.name}
                    onChange={e => setRoleForm(prev => ({ ...prev, name: e.target.value }))}
                    className="starboard-input"
                    disabled={selectedRole?.isSystem}
                  />
                </div>
                <div>
                  <Label htmlFor="editRoleColor">Role Color</Label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      id="editRoleColor"
                      value={roleForm.color}
                      onChange={e => setRoleForm(prev => ({ ...prev, color: e.target.value }))}
                      className="w-12 h-10 rounded border border-gray-300"
                      disabled={selectedRole?.isSystem}
                    />
                    <Input
                      value={roleForm.color}
                      onChange={e => setRoleForm(prev => ({ ...prev, color: e.target.value }))}
                      className="starboard-input flex-1"
                      disabled={selectedRole?.isSystem}
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="editRoleDescription">Description</Label>
                <Textarea
                  id="editRoleDescription"
                  value={roleForm.description}
                  onChange={e => setRoleForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="starboard-input"
                  disabled={selectedRole?.isSystem}
                />
              </div>

              {/* ✅ MENTORSHIP CAPABILITIES SECTION IN EDIT */}
              <div className="space-y-4 border-t pt-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">
                    Mentorship Capabilities
                  </h4>
                  <p className="text-xs text-gray-500 mb-4">
                    Define what mentorship activities users with this role can participate in
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3 p-3 border rounded-lg">
                    <Switch
                      id="editCanMentor"
                      checked={roleForm.canMentor}
                      onCheckedChange={checked =>
                        setRoleForm(prev => ({ ...prev, canMentor: checked }))
                      }
                      disabled={selectedRole?.isSystem}
                    />
                    <div className="flex-1">
                      <Label htmlFor="editCanMentor" className="text-sm font-medium cursor-pointer">
                        Can Mentor
                      </Label>
                      <p className="text-xs text-gray-500">
                        Users with this role can be assigned as mentors to others
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-3 border rounded-lg">
                    <Switch
                      id="editCanBeMentee"
                      checked={roleForm.canBeMentee}
                      onCheckedChange={checked =>
                        setRoleForm(prev => ({ ...prev, canBeMentee: checked }))
                      }
                      disabled={selectedRole?.isSystem}
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor="editCanBeMentee"
                        className="text-sm font-medium cursor-pointer"
                      >
                        Can Be Mentee
                      </Label>
                      <p className="text-xs text-gray-500">
                        Users with this role can be assigned mentees and receive mentoring
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {selectedRole?.isSystem && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-blue-800">
                      This is a system role. Some fields cannot be modified.
                    </span>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="permissions" className="space-y-4 mt-6">
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {permissions.map(category => (
                  <div key={category.category} className="border rounded-lg">
                    <Collapsible
                      open={expandedCategories[category.category]}
                      onOpenChange={() => toggleCategory(category.category)}
                    >
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer">
                          <div className="flex items-center space-x-2">
                            {expandedCategories[category.category] ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            <h4 className="font-medium">{category.category}</h4>
                            <Badge variant="outline" className="text-xs">
                              {
                                category.permissions.filter(p =>
                                  roleForm.permissions.includes(p.key)
                                ).length
                              }
                              /{category.permissions.length}
                            </Badge>
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-4 pb-4 space-y-3">
                          {category.permissions.map(permission => (
                            <div key={permission.key} className="flex items-start space-x-3">
                              <Checkbox
                                id={`edit-${permission.key}`}
                                checked={roleForm.permissions.includes(permission.key)}
                                onCheckedChange={() => handlePermissionToggle(permission.key)}
                                disabled={selectedRole?.isSystem}
                              />
                              <div className="grid gap-1.5 leading-none">
                                <Label
                                  htmlFor={`edit-${permission.key}`}
                                  className="text-sm font-medium leading-none cursor-pointer"
                                >
                                  {permission.label}
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                  {permission.description}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="onboarding" className="space-y-4 mt-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="editRequiresOnboarding"
                  checked={roleForm.requiresOnboarding}
                  onCheckedChange={checked =>
                    setRoleForm(prev => ({ ...prev, requiresOnboarding: checked }))
                  }
                  disabled={selectedRole?.isSystem}
                />
                <Label htmlFor="editRequiresOnboarding">Require onboarding for this role</Label>
              </div>

              {roleForm.requiresOnboarding && (
                <OnboardingFormBuilder roleForm={roleForm} setRoleForm={setRoleForm} />
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEditRole}
              disabled={isSaving || selectedRole?.isSystem}
              className="starboard-button"
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Update Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Role Dialog */}
      <Dialog open={isDuplicateDialogOpen} onOpenChange={setIsDuplicateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicate Role</DialogTitle>
            <DialogDescription>
              Create a copy of "{selectedRole?.name}" with a new name
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="duplicateRoleName">New Role Name</Label>
              <Input
                id="duplicateRoleName"
                value={duplicateName}
                onChange={e => setDuplicateName(e.target.value)}
                placeholder="Enter name for duplicated role"
                className="starboard-input"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDuplicateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleDuplicateRole} className="starboard-button">
              <Copy className="mr-2 h-4 w-4" />
              Duplicate Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
