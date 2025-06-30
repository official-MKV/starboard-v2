'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  ArrowLeft,
  Calendar,
  Link2,
  MoreHorizontal,
  Trash2,
  CheckCircle,
  Loader2,
  AlertTriangle,
  Info,
  User,
  Crown,
  Edit,
  RefreshCw,
  Shield,
  UserX,
  UserCheck,
  Mail,
  Phone,
  MapPin,
  Building,
  Briefcase,
  Globe,
  Clock,
  Languages,
} from 'lucide-react'
import { MentorSearchSelect } from './UserSearchSelect'

// Mock roles data - replace with actual API call
const availableRoles = [
  { id: '1', name: 'Admin', color: '#ef4444', canMentor: true, canBeMentee: false },
  { id: '2', name: 'Mentor', color: '#3b82f6', canMentor: true, canBeMentee: true },
  { id: '3', name: 'Mentee', color: '#10b981', canMentor: false, canBeMentee: true },
  { id: '4', name: 'Observer', color: '#6b7280', canMentor: false, canBeMentee: false },
]

export default function UserDetailPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.userId

  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [mentorshipData, setMentorshipData] = useState({
    asMentee: null,
  })

  // Dialog states
  const [isAssignMentorDialogOpen, setIsAssignMentorDialogOpen] = useState(false)
  const [isReassignDialogOpen, setIsReassignDialogOpen] = useState(false)
  const [isChangeRoleDialogOpen, setIsChangeRoleDialogOpen] = useState(false)
  const [isDeleteUserDialogOpen, setIsDeleteUserDialogOpen] = useState(false)

  // Form states
  const [mentorForm, setMentorForm] = useState({
    mentorId: '',
    notes: '',
  })
  const [reassignForm, setReassignForm] = useState({
    newMentorId: '',
    reason: '',
  })
  const [roleForm, setRoleForm] = useState({
    roleId: '',
    reason: '',
  })

  useEffect(() => {
    if (userId) {
      fetchUserDetails()
      fetchMentorshipData()
    }
  }, [userId])

  const fetchUserDetails = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/users/${userId}`)
      if (response.ok) {
        const data = await response.json()
        setUser(data.data.user)
        console.log(data.data.user)
        setRoleForm(prev => ({ ...prev, roleId: data.data.user.currentWorkspace?.role?.id || '' }))
      } else {
        toast.error('Failed to load user details')
        router.push('/users')
      }
    } catch (error) {
      toast.error('Failed to load user details')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchMentorshipData = async () => {
    try {
      const response = await fetch(`/api/users/${userId}/mentorship`)
      if (response.ok) {
        const data = await response.json()
        setMentorshipData(data.data)
      }
    } catch (error) {
      toast.error('Failed to load mentorship data')
    }
  }

  const handleAssignMentor = async () => {
    if (!mentorForm.mentorId) {
      toast.error('Please select a mentor')
      return
    }

    try {
      const response = await fetch(`/api/users/${userId}/mentorship`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mentorId: mentorForm.mentorId,
          notes: mentorForm.notes,
        }),
      })

      if (response.ok) {
        toast.success('Mentor assigned successfully')
        setIsAssignMentorDialogOpen(false)
        resetMentorForm()
        fetchMentorshipData()
      } else {
        const error = await response.json()
        toast.error(error.error?.message || 'Failed to assign mentor')
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
    }
  }

  const handleReassignMentor = async () => {
    if (!reassignForm.newMentorId) {
      toast.error('Please select a new mentor')
      return
    }

    if (!reassignForm.reason.trim()) {
      toast.error('Please provide a reason for reassignment')
      return
    }

    try {
      const response = await fetch(
        `/api/mentorship/assignments/${mentorshipData.asMentee.id}/reassign`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            newMentorId: reassignForm.newMentorId,
            reason: reassignForm.reason,
          }),
        }
      )

      if (response.ok) {
        toast.success('Mentor reassigned successfully')
        setIsReassignDialogOpen(false)
        resetReassignForm()
        fetchMentorshipData()
      } else {
        const error = await response.json()
        toast.error(error.error?.message || 'Failed to reassign mentor')
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
    }
  }

  const handleChangeRole = async () => {
    if (!roleForm.roleId) {
      toast.error('Please select a role')
      return
    }

    if (!roleForm.reason.trim()) {
      toast.error('Please provide a reason for role change')
      return
    }

    try {
      const response = await fetch(`/api/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roleId: roleForm.roleId,
          reason: roleForm.reason,
        }),
      })

      if (response.ok) {
        toast.success('User role updated successfully')
        setIsChangeRoleDialogOpen(false)
        resetRoleForm()
        fetchUserDetails()
      } else {
        const error = await response.json()
        toast.error(error.error?.message || 'Failed to update user role')
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
    }
  }

  const handleDeleteUser = async () => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      })

      if (response.ok) {
        toast.success('User deleted successfully')
        router.push('/users')
      } else {
        const error = await response.json()
        toast.error(error.error?.message || 'Failed to delete user')
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
    }
  }

  const handleToggleUserStatus = async () => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: !user.isActive,
        }),
      })

      if (response.ok) {
        toast.success(`User ${user.isActive ? 'deactivated' : 'activated'} successfully`)
        fetchUserDetails()
      } else {
        const error = await response.json()
        toast.error(error.error?.message || 'Failed to update user status')
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
    }
  }

  const handleTerminateAssignment = async assignment => {
    if (!confirm('Are you sure you want to terminate this mentorship?')) {
      return
    }

    try {
      const response = await fetch(`/api/mentorship/assignments/${assignment.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Terminated by admin' }),
      })

      if (response.ok) {
        toast.success('Mentorship terminated successfully')
        fetchMentorshipData()
      } else {
        const error = await response.json()
        toast.error(error.error?.message || 'Failed to terminate mentorship')
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
    }
  }

  const resetMentorForm = () => {
    setMentorForm({ mentorId: '', notes: '' })
  }

  const resetReassignForm = () => {
    setReassignForm({ newMentorId: '', reason: '' })
  }

  const resetRoleForm = () => {
    setRoleForm({ roleId: user?.currentWorkspace?.role?.id || '', reason: '' })
  }

  const getStatusBadge = status => {
    const statusConfig = {
      ACTIVE: { color: 'bg-green-100 text-green-800', label: 'Active' },
      PAUSED: { color: 'bg-yellow-100 text-yellow-800', label: 'Paused' },
      TERMINATED: { color: 'bg-red-100 text-red-800', label: 'Terminated' },
    }

    const config = statusConfig[status] || statusConfig.ACTIVE
    return <Badge className={config.color}>{config.label}</Badge>
  }

  const renderPersonalDataField = field => {
    const { value, label, type } = field

    if (!value) return null

    const getIcon = type => {
      switch (type) {
        case 'email':
          return <Mail className="h-4 w-4" />
        case 'phone':
          return <Phone className="h-4 w-4" />
        case 'location':
          return <MapPin className="h-4 w-4" />
        case 'company':
          return <Building className="h-4 w-4" />
        case 'job':
          return <Briefcase className="h-4 w-4" />
        case 'website':
          return <Globe className="h-4 w-4" />
        case 'date':
          return <Calendar className="h-4 w-4" />
        case 'time':
          return <Clock className="h-4 w-4" />
        case 'language':
          return <Languages className="h-4 w-4" />
        default:
          return <Info className="h-4 w-4" />
      }
    }

    const formatValue = (value, type) => {
      if (type === 'date' && value) {
        return new Date(value).toLocaleDateString()
      }

      if (type === 'boolean') {
        return value ? 'Yes' : 'No'
      }

      if (Array.isArray(value)) {
        return value.join(', ')
      }

      return value
    }

    return (
      <div key={label} className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50">
        <div className="text-gray-500 mt-0.5">{getIcon(type)}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">{label}</p>
          <p className="text-sm text-gray-600 break-words">{formatValue(value, type)}</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading user details...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <User className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">User not found</p>
        </div>
      </div>
    )
  }

  const currentRole = user.currentWorkspace?.role
  const currentWorkspace = user.currentWorkspace
  const personalData = user.profileData || []

  // Only show mentorship section if user can be mentored AND has a mentor assigned
  const showMentorshipSection = currentRole?.canBeMentee && mentorshipData.asMentee

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex flex-row lg:items-center justify-between gap-6 mb-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => router.push('/users')}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>

            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xl font-bold">
              {user.firstName?.[0]}
              {user.lastName?.[0]}
            </div>

            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {user.firstName} {user.lastName}
              </h1>
              <p className="text-gray-600">{user.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  className={
                    user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }
                >
                  {user.isActive ? 'Active' : 'Inactive'}
                </Badge>
                {currentRole && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: currentRole.color }}
                    />
                    {currentRole.name}
                    {currentRole.isDefault && <Crown className="h-3 w-3 text-yellow-500" />}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsChangeRoleDialogOpen(true)}>
              <Shield className="h-4 w-4 mr-2" />
              Change Role
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleUserStatus}
              className={
                user.isActive
                  ? 'text-red-600 hover:text-red-700'
                  : 'text-green-600 hover:text-green-700'
              }
            >
              {user.isActive ? (
                <UserX className="h-4 w-4 mr-2" />
              ) : (
                <UserCheck className="h-4 w-4 mr-2" />
              )}
              {user.isActive ? 'Deactivate' : 'Activate'}
            </Button>

            <Button variant="outline" size="sm" onClick={() => fetchUserDetails()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteUserDialogOpen(true)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Email Status</p>
                  <Badge
                    className={
                      user.isEmailVerified
                        ? 'bg-green-100 text-green-800 mt-1'
                        : 'bg-yellow-100 text-yellow-800 mt-1'
                    }
                  >
                    {user.isEmailVerified ? 'Verified' : 'Unverified'}
                  </Badge>
                </div>
                <Mail className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Onboarding</p>
                  <Badge
                    className={
                      currentWorkspace?.onboardingCompletedAt
                        ? 'bg-green-100 text-green-800 mt-1'
                        : 'bg-yellow-100 text-yellow-800 mt-1'
                    }
                  >
                    {currentWorkspace?.onboardingCompletedAt ? 'Completed' : 'Pending'}
                  </Badge>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Member Since</p>
                  <p className="text-sm font-medium mt-1">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* User Information */}
          <Card>
            <CardHeader>
              <CardTitle>User Information</CardTitle>
              <CardDescription>Basic profile information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">First Name</Label>
                  <p className="text-sm mt-1">{user.firstName || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Last Name</Label>
                  <p className="text-sm mt-1">{user.lastName || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Email</Label>
                  <p className="text-sm mt-1">{user.email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Phone</Label>
                  <p className="text-sm mt-1">{user.phone || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Job Title</Label>
                  <p className="text-sm mt-1">{user.jobTitle || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Company</Label>
                  <p className="text-sm mt-1">{user.company || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Location</Label>
                  <p className="text-sm mt-1">{user.location || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Timezone</Label>
                  <p className="text-sm mt-1">{user.timezone || 'N/A'}</p>
                </div>
              </div>

              {user.bio && (
                <div>
                  <Label className="text-sm font-medium text-gray-700">Bio</Label>
                  <p className="text-sm mt-1">{user.bio}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mentorship Information - Only show if user can be mentored AND has a mentor */}
          {showMentorshipSection && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Mentorship</CardTitle>
                    <CardDescription>Current mentor assignment</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-medium">
                        {mentorshipData.asMentee.mentor.firstName?.[0]}
                        {mentorshipData.asMentee.mentor.lastName?.[0]}
                      </div>
                      <div>
                        <div className="font-medium">
                          {mentorshipData.asMentee.mentor.firstName}{' '}
                          {mentorshipData.asMentee.mentor.lastName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {mentorshipData.asMentee.mentor.email}
                        </div>
                        {mentorshipData.asMentee.mentor.jobTitle && (
                          <div className="text-xs text-gray-400">
                            {mentorshipData.asMentee.mentor.jobTitle}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      {getStatusBadge(mentorshipData.asMentee.status)}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => setIsReassignDialogOpen(true)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Reassign Mentor
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleTerminateAssignment(mentorshipData.asMentee)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Terminate
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <Label className="text-gray-600">Total Meetings</Label>
                      <p className="font-medium">{mentorshipData.asMentee.totalMeetings || 0}</p>
                    </div>
                    <div>
                      <Label className="text-gray-600">Last Meeting</Label>
                      <p className="font-medium">
                        {mentorshipData.asMentee.lastMeetingAt
                          ? new Date(mentorshipData.asMentee.lastMeetingAt).toLocaleDateString()
                          : 'Never'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-gray-600">Next Due</Label>
                      <p className="font-medium">
                        {mentorshipData.asMentee.nextMeetingDue
                          ? new Date(mentorshipData.asMentee.nextMeetingDue).toLocaleDateString()
                          : 'Not set'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Show assign mentor option if user can be mentored but has no mentor */}
          {currentRole?.canBeMentee && !mentorshipData.asMentee && (
            <Card>
              <CardHeader>
                <CardTitle>Mentorship</CardTitle>
                <CardDescription>No mentor assigned</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-orange-400" />
                  <p className="font-medium mb-2">No mentor assigned</p>
                  <p className="text-sm text-gray-600 mb-4">
                    This user needs to be paired with a mentor
                  </p>
                  <Button
                    onClick={() => setIsAssignMentorDialogOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Link2 className="mr-2 h-4 w-4" />
                    Assign Mentor
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Personal Data Section */}
        {personalData && personalData.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Personal Data</CardTitle>
              <CardDescription>Information collected during onboarding</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {personalData.map((field, index) => renderPersonalDataField(field))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dialogs */}
        {/* Assign Mentor Dialog */}
        <Dialog open={isAssignMentorDialogOpen} onOpenChange={setIsAssignMentorDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Assign Mentor</DialogTitle>
              <DialogDescription>Assign a mentor to {user.firstName}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <MentorSearchSelect
                value={mentorForm.mentorId}
                onValueChange={value => setMentorForm(prev => ({ ...prev, mentorId: value }))}
              />
              <div>
                <Label htmlFor="mentorNotes">Notes</Label>
                <Textarea
                  id="mentorNotes"
                  value={mentorForm.notes}
                  onChange={e => setMentorForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any additional notes for this mentorship..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAssignMentorDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAssignMentor} className="bg-blue-600 hover:bg-blue-700">
                Assign Mentor
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reassign Mentor Dialog */}
        <Dialog open={isReassignDialogOpen} onOpenChange={setIsReassignDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Reassign Mentor</DialogTitle>
              <DialogDescription>Reassign {user.firstName} to a new mentor</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <MentorSearchSelect
                value={reassignForm.newMentorId}
                onValueChange={value => setReassignForm(prev => ({ ...prev, newMentorId: value }))}
              />
              <div>
                <Label htmlFor="reassignReason">Reason for Reassignment *</Label>
                <Textarea
                  id="reassignReason"
                  value={reassignForm.reason}
                  onChange={e => setReassignForm(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Please provide a reason for this reassignment..."
                  rows={3}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsReassignDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleReassignMentor} className="bg-blue-600 hover:bg-blue-700">
                Reassign Mentor
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Change Role Dialog */}
        <Dialog open={isChangeRoleDialogOpen} onOpenChange={setIsChangeRoleDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Change User Role</DialogTitle>
              <DialogDescription>
                Change the role for {user.firstName} {user.lastName}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="roleSelect">New Role</Label>
                <Select
                  value={roleForm.roleId}
                  onValueChange={value => setRoleForm(prev => ({ ...prev, roleId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map(role => (
                      <SelectItem key={role.id} value={role.id}>
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: role.color }}
                          />
                          <span>{role.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="roleChangeReason">Reason for Role Change *</Label>
                <Textarea
                  id="roleChangeReason"
                  value={roleForm.reason}
                  onChange={e => setRoleForm(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Please provide a reason for this role change..."
                  rows={3}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsChangeRoleDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleChangeRole} className="bg-blue-600 hover:bg-blue-700">
                Change Role
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete User Dialog */}
        <AlertDialog open={isDeleteUserDialogOpen} onOpenChange={setIsDeleteUserDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete User</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {user.firstName} {user.lastName}? This action cannot
                be undone and will permanently remove all user data, including mentorship
                assignments and meeting history.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteUser} className="bg-red-600 hover:bg-red-700">
                Delete User
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
