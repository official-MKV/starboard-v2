'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRequireWorkspace } from '@/lib/hooks/auth'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Plus,
  Users,
  UserPlus,
  Mail,
  Shield,
  Edit,
  Trash2,
  MoreHorizontal,
  Search,
  Send,
  Copy,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
  Crown,
  Calendar,
  ExternalLink,
  FileText,
  Save,
  X,
  RefreshCw,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Check,
  ChevronsUpDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'

import RoleManagement from './rolemanagement'
import InviteUsersForm from './inviteUsers'

function UserSearchSelect({
  endpoint,
  value,
  onValueChange,
  placeholder = 'Search users...',
  label,
  required = false,
  disabled = false,
  className,
}) {
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchUsers(searchTerm)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchTerm, endpoint])

  // Find selected user when value changes
  useEffect(() => {
    if (value && users.length > 0) {
      const user = users.find(u => u.id === value)
      setSelectedUser(user)
    } else {
      setSelectedUser(null)
    }
  }, [value, users])

  const fetchUsers = async (search = '') => {
    setIsLoading(true)
    try {
      const queryParams = new URLSearchParams()
      if (search) queryParams.append('search', search)

      const response = await fetch(`${endpoint}?${queryParams}`)
      if (response.ok) {
        const data = await response.json()
        setUsers(data.data.mentors || data.data.mentees || [])
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelect = userId => {
    const user = users.find(u => u.id === userId)
    setSelectedUser(user)
    onValueChange(userId)
    setOpen(false)
  }

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users
    return users.filter(
      user =>
        `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [users, searchTerm])

  return (
    <div className={className}>
      {label && (
        <Label className="text-sm font-medium text-gray-700 mb-2 block">
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled}
          >
            {selectedUser ? (
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-medium">
                  {selectedUser.firstName?.[0]}
                  {selectedUser.lastName?.[0]}
                </div>
                <span className="truncate">
                  {selectedUser.firstName} {selectedUser.lastName}
                </span>
                {selectedUser.role && (
                  <Badge
                    variant="outline"
                    className="text-xs"
                    style={{ borderColor: selectedUser.role.color, color: selectedUser.role.color }}
                  >
                    {selectedUser.role.name}
                  </Badge>
                )}
              </div>
            ) : (
              <span className="text-gray-500">{placeholder}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-full p-0"
          style={{ width: 'var(--radix-popover-trigger-width)' }}
        >
          <Command>
            <CommandInput
              placeholder="Search users..."
              value={searchTerm}
              onValueChange={setSearchTerm}
            />
            <CommandList>
              {isLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="ml-2 text-sm text-gray-500">Searching...</span>
                </div>
              ) : filteredUsers.length === 0 ? (
                <CommandEmpty>No users found.</CommandEmpty>
              ) : (
                <CommandGroup>
                  {filteredUsers.map(user => (
                    <CommandItem
                      key={user.id}
                      value={user.id}
                      onSelect={() => handleSelect(user.id)}
                    >
                      <div className="flex items-center space-x-3 w-full">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
                          {user.firstName?.[0]}
                          {user.lastName?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium truncate">
                              {user.firstName} {user.lastName}
                            </span>
                            {user.role && (
                              <Badge
                                variant="outline"
                                className="text-xs"
                                style={{ borderColor: user.role.color, color: user.role.color }}
                              >
                                {user.role.name}
                              </Badge>
                            )}
                            {user.activeMenteeCount !== undefined && (
                              <Badge variant="secondary" className="text-xs">
                                {user.activeMenteeCount} mentees
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 truncate">{user.email}</div>
                          {(user.jobTitle || user.company) && (
                            <div className="text-xs text-gray-400 truncate">
                              {user.jobTitle && user.company
                                ? `${user.jobTitle} at ${user.company}`
                                : user.jobTitle || user.company}
                            </div>
                          )}
                        </div>
                        <Check
                          className={cn(
                            'ml-auto h-4 w-4',
                            value === user.id ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

function MentorSearchSelect({ value, onValueChange, disabled = false, className }) {
  return (
    <UserSearchSelect
      endpoint="/api/mentorship/eligible-mentors"
      value={value}
      onValueChange={onValueChange}
      placeholder="Search for mentor..."
      label="Mentor"
      required
      disabled={disabled}
      className={className}
    />
  )
}

function MenteeSearchSelect({ value, onValueChange, disabled = false, className }) {
  return (
    <UserSearchSelect
      endpoint="/api/mentorship/eligible-mentees"
      value={value}
      onValueChange={onValueChange}
      placeholder="Search for mentee..."
      label="Mentee"
      required
      disabled={disabled}
      className={className}
    />
  )
}

function ReassignmentUserSelect({
  type, // 'mentor' or 'mentee'
  value,
  onValueChange,
  currentUserId,
  disabled = false,
  className,
}) {
  const endpoint =
    type === 'mentor' ? '/api/mentorship/eligible-mentors' : '/api/mentorship/eligible-mentees'

  const placeholder = type === 'mentor' ? 'Search for new mentor...' : 'Search for new mentee...'

  const label = type === 'mentor' ? 'New Mentor (Optional)' : 'New Mentee (Optional)'

  return (
    <UserSearchSelect
      endpoint={endpoint}
      value={value}
      onValueChange={onValueChange}
      placeholder={placeholder}
      label={label}
      disabled={disabled}
      className={className}
    />
  )
}

export default function UsersManagement() {
  const { user, workspace, isLoading: requireLoading } = useRequireWorkspace()
  const [activeTab, setActiveTab] = useState('users')
  const [isLoading, setIsLoading] = useState(true)

  // Common state
  const [roles, setRoles] = useState([])

  // Users state
  const [users, setUsers] = useState([])
  const [usersPagination, setUsersPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20,
    hasNextPage: false,
    hasPreviousPage: false,
  })
  const [usersFilters, setUsersFilters] = useState({
    search: '',
    role: 'all',
    status: 'all',
    sortBy: 'name',
    sortOrder: 'asc',
  })

  // Invitations state
  const [invitations, setInvitations] = useState([])
  const [invitationsPagination, setInvitationsPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20,
    hasNextPage: false,
    hasPreviousPage: false,
  })
  const [invitationsFilters, setInvitationsFilters] = useState({
    search: '',
    status: 'all',
    sortBy: 'sentAt',
    sortOrder: 'desc',
  })
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)

  // Email templates state
  const [emailTemplates, setEmailTemplates] = useState([])
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false)
  const [isEditingTemplate, setIsEditingTemplate] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [isSavingTemplate, setIsSavingTemplate] = useState(false)

  // Statistics
  const [statistics, setStatistics] = useState({
    totalUsers: 0,
    activeInvitations: 0,
    totalRoles: 0,
    totalTemplates: 0,
  })

  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    type: 'INVITATION',
    subject: '',
    content: '',
    isActive: true,
  })

  const [assignmentForm, setAssignmentForm] = useState({
    mentorId: '',
    menteeId: '',
    notes: '',
  })

  const [reassignForm, setReassignForm] = useState({
    newMentorId: '',
    newMenteeId: '',
    reason: '',
  })

  const [mentorshipFilters, setMentorshipFilters] = useState({
    search: '',
    status: 'all',
    mentorId: '',
    menteeId: '',
  })

  const [mentorshipAssignments, setMentorshipAssignments] = useState([])
  const [isCreateAssignmentDialogOpen, setIsCreateAssignmentDialogOpen] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState(null)
  const [isReassignDialogOpen, setIsReassignDialogOpen] = useState(false)

  // Helper functions
  const getInvitationStatus = invitation => {
    if (invitation.isAccepted) {
      return 'ACCEPTED'
    } else if (new Date() > new Date(invitation.expiresAt)) {
      return 'EXPIRED'
    } else {
      return 'PENDING'
    }
  }

  const getStatusBadge = status => {
    const statusConfig = {
      PENDING: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Pending' },
      ACCEPTED: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Accepted' },
      EXPIRED: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Expired' },
      CANCELLED: { color: 'bg-gray-100 text-gray-800', icon: XCircle, label: 'Cancelled' },
      ACTIVE: { color: 'bg-green-100 text-green-800', label: 'Active' },
      PAUSED: { color: 'bg-yellow-100 text-yellow-800', label: 'Paused' },
      TERMINATED: { color: 'bg-red-100 text-red-800', label: 'Terminated' },
    }

    const config = statusConfig[status] || statusConfig.PENDING
    const Icon = config.icon

    return (
      <Badge className={config.color}>
        {Icon && <Icon className="mr-1 h-3 w-3" />}
        {config.label}
      </Badge>
    )
  }

  // Fetch functions
  useEffect(() => {
    if (!requireLoading) {
      fetchRoles()
      fetchUsers()
      fetchInvitations()
      fetchEmailTemplates()
      fetchStatistics()
      fetchMentorshipAssignments()
    }
  }, [requireLoading])

  const fetchUsers = async (page = 1) => {
    try {
      setIsLoading(true)
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: usersPagination.itemsPerPage.toString(),
        ...(usersFilters.search && { search: usersFilters.search }),
        ...(usersFilters.role !== 'all' && { role: usersFilters.role }),
        ...(usersFilters.status !== 'all' && { status: usersFilters.status }),
        sortBy: usersFilters.sortBy,
        sortOrder: usersFilters.sortOrder,
      })

      const response = await fetch(`/api/users?${queryParams}`)
      if (response.ok) {
        const data = await response.json()
        setUsers(data.data.users)
        setUsersPagination(data.data.pagination)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Failed to load users')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchInvitations = async (page = 1) => {
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: invitationsPagination.itemsPerPage.toString(),
        ...(invitationsFilters.search && { search: invitationsFilters.search }),
        ...(invitationsFilters.status !== 'all' && { status: invitationsFilters.status }),
      })

      const response = await fetch(`/api/invitations?${queryParams}`)
      if (response.ok) {
        const data = await response.json()
        setInvitations(data.data.invitations)
        setInvitationsPagination(data.data.pagination)
      }
    } catch (error) {
      console.error('Error fetching invitations:', error)
      toast.error('Failed to load invitations')
    }
  }

  const fetchRoles = async () => {
    try {
      const response = await fetch('/api/roles')
      if (response.ok) {
        const data = await response.json()
        setRoles(data.data.roles)
      }
    } catch (error) {
      console.error('Error fetching roles:', error)
    }
  }

  const fetchEmailTemplates = async () => {
    try {
      const response = await fetch('/api/email-templates')
      if (response.ok) {
        const data = await response.json()
        setEmailTemplates(data.data.templates)
      }
    } catch (error) {
      console.error('Error fetching email templates:', error)
    }
  }

  const fetchStatistics = async () => {
    try {
      const [usersRes, invitationsRes, rolesRes, templatesRes] = await Promise.all([
        fetch('/api/users/statistics'),
        fetch('/api/invitations/statistics'),
        fetch('/api/roles/statistics'),
        fetch('/api/email-templates/statistics'),
      ])

      const usersData = usersRes.ok
        ? await usersRes.json()
        : { data: { statistics: { totalUsers: 0 } } }
      const invitationsData = invitationsRes.ok
        ? await invitationsRes.json()
        : { data: { statistics: { activeInvitations: 0 } } }
      const rolesData = rolesRes.ok
        ? await rolesRes.json()
        : { data: { statistics: { totalRoles: 0 } } }
      const templatesData = templatesRes.ok
        ? await templatesRes.json()
        : { data: { statistics: { totalTemplates: 0 } } }

      setStatistics({
        totalUsers: usersData.data.statistics.totalUsers || 0,
        activeInvitations: invitationsData.data.statistics.activeInvitations || 0,
        totalRoles: rolesData.data.statistics.totalRoles || 0,
        totalTemplates: templatesData.data.statistics.totalTemplates || 0,
      })
    } catch (error) {
      console.error('Error fetching statistics:', error)
    }
  }

  const fetchMentorshipAssignments = async () => {
    try {
      const response = await fetch('/api/mentorship/assignments')
      if (response.ok) {
        const data = await response.json()
        setMentorshipAssignments(data.data.assignments)
      } else {
        console.error('Failed to fetch mentorship assignments')
      }
    } catch (error) {
      console.error('Error fetching mentorship assignments:', error)
    }
  }

  // Pagination handlers
  const handleUsersPageChange = newPage => {
    fetchUsers(newPage)
  }

  const handleUsersItemsPerPageChange = newLimit => {
    setUsersPagination(prev => ({ ...prev, itemsPerPage: newLimit }))
    fetchUsers(1) // Reset to first page
  }

  const handleInvitationsPageChange = newPage => {
    fetchInvitations(newPage)
  }

  const handleInvitationsItemsPerPageChange = newLimit => {
    setInvitationsPagination(prev => ({ ...prev, itemsPerPage: newLimit }))
    fetchInvitations(1) // Reset to first page
  }

  // Filter handlers
  const handleUsersFilterChange = (key, value) => {
    setUsersFilters(prev => ({ ...prev, [key]: value }))
    // Debounced fetch for search, immediate for others
    if (key === 'search') {
      const timeoutId = setTimeout(() => fetchUsers(1), 300)
      return () => clearTimeout(timeoutId)
    } else {
      fetchUsers(1)
    }
  }

  const handleInvitationsFilterChange = (key, value) => {
    setInvitationsFilters(prev => ({ ...prev, [key]: value }))
    if (key === 'search') {
      const timeoutId = setTimeout(() => fetchInvitations(1), 300)
      return () => clearTimeout(timeoutId)
    } else {
      fetchInvitations(1)
    }
  }

  // Sorting handlers
  const handleUsersSort = field => {
    const newOrder =
      usersFilters.sortBy === field && usersFilters.sortOrder === 'asc' ? 'desc' : 'asc'
    setUsersFilters(prev => ({ ...prev, sortBy: field, sortOrder: newOrder }))
    fetchUsers(1)
  }

  // Pagination Component
  const PaginationComponent = ({ pagination, onPageChange, onItemsPerPageChange }) => (
    <div className="flex items-center justify-between px-6 py-4 border-t">
      <div className="flex items-center space-x-2 text-sm text-slate-gray-600">
        <span>
          Showing {pagination.startIndex || 1}-{pagination.endIndex || 0} of {pagination.totalItems}{' '}
          items
        </span>
        <Select
          value={pagination.itemsPerPage.toString()}
          onValueChange={value => onItemsPerPageChange(Number.parseInt(value))}
        >
          <SelectTrigger className="w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="20">20</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
          </SelectContent>
        </Select>
        <span>per page</span>
      </div>

      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={!pagination.hasPreviousPage}
        >
          First
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(pagination.previousPage)}
          disabled={!pagination.hasPreviousPage}
        >
          Previous
        </Button>

        <div className="flex items-center space-x-1">
          {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
            const pageNumber = Math.max(1, pagination.currentPage - 2) + i
            if (pageNumber > pagination.totalPages) return null

            return (
              <Button
                key={pageNumber}
                variant={pageNumber === pagination.currentPage ? 'default' : 'outline'}
                size="sm"
                onClick={() => onPageChange(pageNumber)}
                className="w-8 h-8 p-0"
              >
                {pageNumber}
              </Button>
            )
          })}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(pagination.nextPage)}
          disabled={!pagination.hasNextPage}
        >
          Next
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(pagination.totalPages)}
          disabled={!pagination.hasNextPage}
        >
          Last
        </Button>
      </div>
    </div>
  )

  // Sortable header component
  const SortableHeader = ({ field, currentSort, currentOrder, onSort, children }) => (
    <Button
      variant="ghost"
      className="h-auto p-0 font-medium hover:bg-transparent"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        {currentSort === field ? (
          currentOrder === 'asc' ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )
        ) : (
          <ArrowUpDown className="h-4 w-4 opacity-50" />
        )}
      </div>
    </Button>
  )

  // Template handlers
  const handleCreateTemplate = async () => {
    if (!templateForm.name.trim() || !templateForm.subject.trim() || !templateForm.content.trim()) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsSavingTemplate(true)
    try {
      const response = await fetch('/api/email-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateForm),
      })

      if (response.ok) {
        toast.success('Email template created successfully')
        setIsTemplateDialogOpen(false)
        resetTemplateForm()
        fetchEmailTemplates()
        fetchStatistics()
      } else {
        const error = await response.json()
        toast.error(error.error?.message || 'Failed to create template')
      }
    } catch (error) {
      console.error('Error creating template:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsSavingTemplate(false)
    }
  }

  const handleUpdateTemplate = async () => {
    if (
      !selectedTemplate ||
      !templateForm.name.trim() ||
      !templateForm.subject.trim() ||
      !templateForm.content.trim()
    ) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsSavingTemplate(true)
    try {
      const response = await fetch(`/api/email-templates/${selectedTemplate.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateForm),
      })

      if (response.ok) {
        toast.success('Email template updated successfully')
        setIsTemplateDialogOpen(false)
        setIsEditingTemplate(false)
        setSelectedTemplate(null)
        resetTemplateForm()
        fetchEmailTemplates()
      } else {
        const error = await response.json()
        toast.error(error.error?.message || 'Failed to update template')
      }
    } catch (error) {
      console.error('Error updating template:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsSavingTemplate(false)
    }
  }

  const handleDeleteTemplate = async template => {
    if (!confirm(`Are you sure you want to delete the template "${template.name}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/email-templates/${template.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Email template deleted successfully')
        fetchEmailTemplates()
        fetchStatistics()
      } else {
        const error = await response.json()
        toast.error(error.error?.message || 'Failed to delete template')
      }
    } catch (error) {
      console.error('Error deleting template:', error)
      toast.error('An unexpected error occurred')
    }
  }

  const handleResendInvitation = async invitation => {
    try {
      const isExpired = getInvitationStatus(invitation) === 'EXPIRED'
      const response = await fetch(`/api/invitations/${invitation.id}/resend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          extendExpiry: isExpired,
        }),
      })

      if (response.ok) {
        toast.success(
          isExpired ? 'Invitation resent with extended expiry' : 'Invitation resent successfully'
        )
        fetchInvitations()
      } else {
        const error = await response.json()
        toast.error(error.error?.message || 'Failed to resend invitation')
      }
    } catch (error) {
      console.error('Error resending invitation:', error)
      toast.error('An unexpected error occurred')
    }
  }

  const handleCancelInvitation = async invitation => {
    if (!confirm(`Are you sure you want to cancel the invitation for ${invitation.email}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/invitations/${invitation.id}/cancel`, {
        method: 'POST',
      })

      if (response.ok) {
        toast.success('Invitation cancelled successfully')
        fetchInvitations()
        fetchStatistics()
      } else {
        const error = await response.json()
        toast.error(error.error?.message || 'Failed to cancel invitation')
      }
    } catch (error) {
      console.error('Error cancelling invitation:', error)
      toast.error('An unexpected error occurred')
    }
  }

  // Mentorship handlers
  const handleCreateAssignment = async () => {
    if (!assignmentForm.mentorId || !assignmentForm.menteeId) {
      toast.error('Mentor and mentee are required')
      return
    }

    if (assignmentForm.mentorId === assignmentForm.menteeId) {
      toast.error('Mentor and mentee must be different users')
      return
    }

    try {
      const response = await fetch('/api/mentorship/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assignmentForm),
      })

      if (response.ok) {
        toast.success('Pairing created successfully')
        setIsCreateAssignmentDialogOpen(false)
        resetAssignmentForm()
      } else {
        const error = await response.json()
        toast.error(error.error?.message || 'Failed to create assignment')
      }
    } catch (error) {
      console.error('Error creating assignment:', error)
      toast.error('An unexpected error occurred')
    }
  }

  const handleReassignAssignment = async () => {
    if (!reassignForm.reason.trim()) {
      toast.error('Reason is required for reassignment')
      return
    }

    if (!reassignForm.newMentorId && !reassignForm.newMenteeId) {
      toast.error('Either new mentor or new mentee must be selected')
      return
    }

    try {
      const response = await fetch(
        `/api/mentorship/assignments/${selectedAssignment.id}/reassign`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reassignForm),
        }
      )

      if (response.ok) {
        toast.success('Assignment reassigned successfully')
        setIsReassignDialogOpen(false)
        setSelectedAssignment(null)
        resetReassignForm()
      } else {
        const error = await response.json()
        toast.error(error.error?.message || 'Failed to reassign assignment')
      }
    } catch (error) {
      console.error('Error reassigning assignment:', error)
      toast.error('An unexpected error occurred')
    }
  }

  const handleTerminateAssignment = async (assignment, reason = '') => {
    if (
      !confirm(
        `Are you sure you want to terminate the mentorship between ${assignment.mentor.firstName} ${assignment.mentor.lastName} and ${assignment.mentee.firstName} ${assignment.mentee.lastName}?`
      )
    ) {
      return
    }

    try {
      const response = await fetch(`/api/mentorship/assignments/${assignment.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })

      if (response.ok) {
        toast.success('Assignment terminated successfully')
      } else {
        const error = await response.json()
        toast.error(error.error?.message || 'Failed to terminate assignment')
      }
    } catch (error) {
      console.error('Error terminating assignment:', error)
      toast.error('An unexpected error occurred')
    }
  }

  const resetTemplateForm = () => {
    setTemplateForm({
      name: '',
      description: '',
      type: 'INVITATION',
      subject: '',
      content: '',
      isActive: true,
    })
  }

  const resetAssignmentForm = () => {
    setAssignmentForm({
      mentorId: '',
      menteeId: '',
      notes: '',
    })
  }

  const resetReassignForm = () => {
    setReassignForm({
      newMentorId: '',
      newMenteeId: '',
      reason: '',
    })
  }

  const openEditTemplate = template => {
    setSelectedTemplate(template)
    setTemplateForm({
      name: template.name,
      description: template.description || '',
      type: template.type,
      subject: template.subject,
      content: template.content,
      isActive: template.isActive,
    })
    setIsEditingTemplate(true)
    setIsTemplateDialogOpen(true)
  }

  const handleInviteSuccess = data => {
    fetchInvitations()
    fetchStatistics()
  }

  const filteredMentorshipAssignments = mentorshipAssignments.filter(assignment => {
    const matchesSearch =
      assignment.mentor.firstName.toLowerCase().includes(mentorshipFilters.search.toLowerCase()) ||
      assignment.mentor.lastName.toLowerCase().includes(mentorshipFilters.search.toLowerCase()) ||
      assignment.mentee.firstName.toLowerCase().includes(mentorshipFilters.search.toLowerCase()) ||
      assignment.mentee.lastName.toLowerCase().includes(mentorshipFilters.search.toLowerCase()) ||
      assignment.mentor.email.toLowerCase().includes(mentorshipFilters.search.toLowerCase()) ||
      assignment.mentee.email.toLowerCase().includes(mentorshipFilters.search.toLowerCase())

    const matchesStatus =
      mentorshipFilters.status === 'all' || assignment.status === mentorshipFilters.status

    return matchesSearch && matchesStatus
  })

  if (requireLoading) {
    return (
      <div className="min-h-screen bg-snow-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <div className="absolute inset-0 h-12 w-12 rounded-full border-2 border-primary/20 mx-auto"></div>
          </div>
          <p className="text-slate-gray-600">Loading workspace...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-snow-100">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-charcoal-900">User Management</h1>
            <p className="text-slate-gray-600 mt-2">
              Manage users, roles, invitations, email templates, and mentorship assignments
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <InviteUsersForm
              isOpen={isInviteDialogOpen}
              onClose={() => setIsInviteDialogOpen(false)}
              onSuccess={handleInviteSuccess}
              roles={roles}
            />
            <Button onClick={() => setIsInviteDialogOpen(true)} className="starboard-button">
              <UserPlus className="mr-2 h-4 w-4" />
              Invite Users
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="starboard-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-charcoal-900">{statistics.totalUsers}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="starboard-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-gray-600">Active Invitations</p>
                  <p className="text-2xl font-bold text-charcoal-900">
                    {statistics.activeInvitations}
                  </p>
                </div>
                <UserPlus className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="starboard-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-gray-600">Roles</p>
                  <p className="text-2xl font-bold text-charcoal-900">{statistics.totalRoles}</p>
                </div>
                <Shield className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="invitations">Invitations</TabsTrigger>
            <TabsTrigger value="roles">Roles</TabsTrigger>
            <TabsTrigger value="templates">Email Templates</TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card className="starboard-card">
              <CardContent className="py-4">
                <div className="flex items-center space-x-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-gray-400" />
                    <Input
                      placeholder="Search users by name, email, company..."
                      value={usersFilters.search}
                      onChange={e => handleUsersFilterChange('search', e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select
                    value={usersFilters.role}
                    onValueChange={value => handleUsersFilterChange('role', value)}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="All roles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      {roles.map(role => (
                        <SelectItem key={role.id} value={role.name}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={usersFilters.status}
                    onValueChange={value => handleUsersFilterChange('status', value)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="All status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    onClick={() => fetchUsers(1)}
                    className="flex items-center space-x-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Refresh</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="starboard-card">
              <CardHeader>
                <CardTitle>Users ({usersPagination.totalItems})</CardTitle>
                <CardDescription>Manage workspace users and their roles</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <SortableHeader
                          field="name"
                          currentSort={usersFilters.sortBy}
                          currentOrder={usersFilters.sortOrder}
                          onSort={handleUsersSort}
                        >
                          User
                        </SortableHeader>
                      </TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Needs Pairing</TableHead>
                      <TableHead>
                        <SortableHeader
                          field="joinedAt"
                          currentSort={usersFilters.sortBy}
                          currentOrder={usersFilters.sortOrder}
                          onSort={handleUsersSort}
                        >
                          Joined
                        </SortableHeader>
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <div className="text-slate-gray-500">
                            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No users found</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map(user => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-medium">
                                {user.firstName?.[0]}
                                {user.lastName?.[0]}
                              </div>
                              <div>
                                <div className="font-medium">
                                  {user.firstName} {user.lastName}
                                </div>
                                <div className="text-sm text-slate-gray-500">{user.email}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {user.role && (
                              <div className="flex items-center space-x-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: user.role.color }}
                                />
                                <span>{user.role.name}</span>
                                {user.role.isDefault && (
                                  <Crown className="h-3 w-3 text-yellow-500" />
                                )}
                                <div className="flex flex-wrap gap-1 ml-2">
                                  {user.role.canMentor && (
                                    <Badge
                                      variant="outline"
                                      className="bg-blue-50 text-blue-700 border-blue-200 text-xs"
                                    >
                                      Mentor
                                    </Badge>
                                  )}
                                  {user.role.canBeMentee && (
                                    <Badge
                                      variant="outline"
                                      className="bg-green-50 text-green-700 border-green-200 text-xs"
                                    >
                                      Mentee
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                user.isActive
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }
                            >
                              {user.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {user.role?.canBeMentee && !user.hasActiveMentor ? (
                              <Badge
                                variant="outline"
                                className="bg-orange-50 text-orange-700 border-orange-200"
                              >
                                Needs Mentor
                              </Badge>
                            ) : user.role?.canBeMentee && user.hasActiveMentor ? (
                              <Badge
                                variant="outline"
                                className="bg-green-50 text-green-700 border-green-200"
                              >
                                Paired
                              </Badge>
                            ) : (
                              <span className="text-gray-400">N/A</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-4 w-4 text-slate-gray-400" />
                              <span className="text-sm">
                                {user.joinedAt
                                  ? new Date(user.joinedAt).toLocaleDateString()
                                  : 'N/A'}
                              </span>
                            </div>
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
                                <DropdownMenuItem
                                  onClick={() => (window.location.href = `/users/${user.id}`)}
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit User
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Shield className="mr-2 h-4 w-4" />
                                  Change Role
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600">
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Remove User
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                <PaginationComponent
                  pagination={usersPagination}
                  onPageChange={handleUsersPageChange}
                  onItemsPerPageChange={handleUsersItemsPerPageChange}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invitations Tab */}
          <TabsContent value="invitations" className="space-y-6">
            {/* Filters */}
            <Card className="starboard-card">
              <CardContent className="py-4">
                <div className="flex items-center space-x-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-gray-400" />
                    <Input
                      placeholder="Search invitations by email..."
                      value={invitationsFilters.search}
                      onChange={e => handleInvitationsFilterChange('search', e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select
                    value={invitationsFilters.status}
                    onValueChange={value => handleInvitationsFilterChange('status', value)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="All status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="ACCEPTED">Accepted</SelectItem>
                      <SelectItem value="EXPIRED">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    onClick={() => fetchInvitations(1)}
                    className="flex items-center space-x-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Refresh</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Invitations Table */}
            <Card className="starboard-card">
              <CardHeader>
                <CardTitle>Invitations ({invitationsPagination.totalItems})</CardTitle>
                <CardDescription>Manage sent invitations and track their status</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invitations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <div className="text-slate-gray-500">
                            <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No invitations found</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      invitations.map(invitation => (
                        <TableRow key={invitation.id}>
                          <TableCell>
                            <div className="font-medium">{invitation.email}</div>
                          </TableCell>
                          <TableCell>
                            {invitation.role && (
                              <div className="flex items-center space-x-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: invitation.role.color }}
                                />
                                <span>{invitation.role.name}</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(invitation.status || getInvitationStatus(invitation))}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {invitation.expiresAt
                                ? new Date(invitation.expiresAt).toLocaleDateString()
                                : 'N/A'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {invitation.sentAt
                                ? new Date(invitation.sentAt).toLocaleDateString()
                                : 'N/A'}
                            </div>
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
                                {(getInvitationStatus(invitation) === 'PENDING' ||
                                  getInvitationStatus(invitation) === 'EXPIRED') && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => handleResendInvitation(invitation)}
                                    >
                                      <Send className="mr-2 h-4 w-4" />
                                      {getInvitationStatus(invitation) === 'EXPIRED'
                                        ? 'Resend (Extend)'
                                        : 'Resend'}
                                    </DropdownMenuItem>
                                    {getInvitationStatus(invitation) === 'PENDING' && (
                                      <DropdownMenuItem
                                        onClick={() => handleCancelInvitation(invitation)}
                                      >
                                        <X className="mr-2 h-4 w-4" />
                                        Cancel
                                      </DropdownMenuItem>
                                    )}
                                  </>
                                )}
                                <DropdownMenuItem>
                                  <ExternalLink className="mr-2 h-4 w-4" />
                                  View Link
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                <PaginationComponent
                  pagination={invitationsPagination}
                  onPageChange={handleInvitationsPageChange}
                  onItemsPerPageChange={handleInvitationsItemsPerPageChange}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Roles Tab */}
          <TabsContent value="roles">
            <RoleManagement />
          </TabsContent>

          {/* Email Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            {/* Filters and Actions */}
            <Card className="starboard-card">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-gray-400" />
                      <Input placeholder="Search templates..." className="pl-9" />
                    </div>
                  </div>
                  <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="starboard-button">
                        <Plus className="mr-2 h-4 w-4" />
                        Create Template
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>
                          {isEditingTemplate ? 'Edit Email Template' : 'Create Email Template'}
                        </DialogTitle>
                        <DialogDescription>
                          {isEditingTemplate
                            ? 'Update your email template'
                            : 'Create a new email template for invitations'}
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="templateName">Template Name *</Label>
                            <Input
                              id="templateName"
                              value={templateForm.name}
                              onChange={e =>
                                setTemplateForm(prev => ({ ...prev, name: e.target.value }))
                              }
                              placeholder="e.g., Manager Invitation"
                              className="starboard-input"
                            />
                          </div>
                          <div>
                            <Label htmlFor="templateType">Template Type</Label>
                            <Select
                              value={templateForm.type}
                              onValueChange={value =>
                                setTemplateForm(prev => ({ ...prev, type: value }))
                              }
                            >
                              <SelectTrigger className="starboard-input">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="INVITATION">Invitation</SelectItem>
                                <SelectItem value="WELCOME">Welcome</SelectItem>
                                <SelectItem value="REMINDER">Reminder</SelectItem>
                                <SelectItem value="NOTIFICATION">Notification</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="templateDescription">Description</Label>
                          <Input
                            id="templateDescription"
                            value={templateForm.description}
                            onChange={e =>
                              setTemplateForm(prev => ({ ...prev, description: e.target.value }))
                            }
                            placeholder="Brief description of when this template is used"
                            className="starboard-input"
                          />
                        </div>

                        <div>
                          <Label htmlFor="templateSubject">Email Subject *</Label>
                          <Input
                            id="templateSubject"
                            value={templateForm.subject}
                            onChange={e =>
                              setTemplateForm(prev => ({ ...prev, subject: e.target.value }))
                            }
                            placeholder="You're invited to join {{workspace_name}}"
                            className="starboard-input"
                          />
                        </div>

                        <div>
                          <Label htmlFor="templateContent">Email Content *</Label>
                          <Textarea
                            id="templateContent"
                            value={templateForm.content}
                            onChange={e =>
                              setTemplateForm(prev => ({ ...prev, content: e.target.value }))
                            }
                            placeholder={`Hello {{first_name}},

{{inviter_name}} has invited you to join {{workspace_name}}.

{{personal_message}}

Click the link below to accept your invitation:
{{invitation_link}}

This invitation will expire on {{expiry_date}}.

Best regards,
The {{workspace_name}} Team`}
                            rows={12}
                            className="starboard-input font-mono text-sm"
                          />
                        </div>

                        <div className="flex items-center space-x-2">
                          <Switch
                            id="templateActive"
                            checked={templateForm.isActive}
                            onCheckedChange={checked =>
                              setTemplateForm(prev => ({ ...prev, isActive: checked }))
                            }
                          />
                          <Label htmlFor="templateActive">Template is active</Label>
                        </div>
                      </div>

                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsTemplateDialogOpen(false)
                            setIsEditingTemplate(false)
                            setSelectedTemplate(null)
                            resetTemplateForm()
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={isEditingTemplate ? handleUpdateTemplate : handleCreateTemplate}
                          disabled={
                            isSavingTemplate ||
                            !templateForm.name.trim() ||
                            !templateForm.subject.trim() ||
                            !templateForm.content.trim()
                          }
                          className="starboard-button"
                        >
                          {isSavingTemplate ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="mr-2 h-4 w-4" />
                          )}
                          {isEditingTemplate ? 'Update Template' : 'Create Template'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>

            {/* Templates Table */}
            <Card className="starboard-card">
              <CardHeader>
                <CardTitle>Email Templates</CardTitle>
                <CardDescription>
                  Manage email templates for invitations and notifications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Template</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {emailTemplates.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <div className="text-slate-gray-500">
                            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No email templates found</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      emailTemplates.map(template => (
                        <TableRow key={template.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium flex items-center">
                                {template.name}
                                {template.isDefault && (
                                  <Crown className="ml-2 h-4 w-4 text-yellow-500" />
                                )}
                              </div>
                              {template.description && (
                                <div className="text-sm text-slate-gray-500 line-clamp-1">
                                  {template.description}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{template.type}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                template.isActive
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }
                            >
                              {template.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {template.createdAt
                                ? new Date(template.createdAt).toLocaleDateString()
                                : 'N/A'}
                            </div>
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
                                <DropdownMenuItem onClick={() => openEditTemplate(template)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Copy className="mr-2 h-4 w-4" />
                                  Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Preview
                                </DropdownMenuItem>
                                {!template.isSystem && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => handleDeleteTemplate(template)}
                                      className="text-red-600"
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
