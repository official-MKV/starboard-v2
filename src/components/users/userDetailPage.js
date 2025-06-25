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
} from 'lucide-react'

import UserSearchSelect from './userManagement'

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

export default function UserDetailPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.userId

  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [mentorshipData, setMentorshipData] = useState({
    asMentee: null,
  })

  const [isAssignMentorDialogOpen, setIsAssignMentorDialogOpen] = useState(false)
  const [isReassignDialogOpen, setIsReassignDialogOpen] = useState(false)

  const [mentorForm, setMentorForm] = useState({
    mentorId: '',
    notes: '',
  })

  const [reassignForm, setReassignForm] = useState({
    newMentorId: '',
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

  const getStatusBadge = status => {
    const statusConfig = {
      ACTIVE: { color: 'bg-green-100 text-green-800', label: 'Active' },
      PAUSED: { color: 'bg-yellow-100 text-yellow-800', label: 'Paused' },
      TERMINATED: { color: 'bg-red-100 text-red-800', label: 'Terminated' },
    }

    const config = statusConfig[status] || statusConfig.ACTIVE
    return <Badge className={config.color}>{config.label}</Badge>
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-snow-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-slate-gray-600">Loading user details...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-snow-100 flex items-center justify-center">
        <div className="text-center">
          <User className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-slate-gray-600">User not found</p>
        </div>
      </div>
    )
  }

  const currentRole = user.currentWorkspace?.role
  const currentWorkspace = user.currentWorkspace

  return (
    <div className="min-h-screen bg-snow-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => router.push('/users')}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Users</span>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-charcoal-900">
                {user.firstName} {user.lastName}
              </h1>
              <p className="text-slate-gray-600 mt-1">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => fetchMentorshipData()}
              className="flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </Button>
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xl font-bold">
              {user.firstName?.[0]}
              {user.lastName?.[0]}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="starboard-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-gray-600">Role</p>
                  <div className="flex items-center space-x-2 mt-1">
                    {currentRole && (
                      <>
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: currentRole.color }}
                        />
                        <span className="font-medium">{currentRole.name}</span>
                        {currentRole.isDefault && <Crown className="h-3 w-3 text-yellow-500" />}
                      </>
                    )}
                    {!currentRole && <span className="text-slate-gray-400">No role assigned</span>}
                  </div>
                </div>
                <User className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="starboard-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-gray-600">Status</p>
                  <Badge
                    className={
                      user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }
                  >
                    {user.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="starboard-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-gray-600">Joined</p>
                  <p className="text-sm font-medium">
                    {currentWorkspace?.joinedAt
                      ? new Date(currentWorkspace.joinedAt).toLocaleDateString()
                      : 'N/A'}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="starboard-card">
            <CardHeader>
              <CardTitle>User Information</CardTitle>
              <CardDescription>Basic information about this user</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">First Name</Label>
                  <p className="text-sm">{user.firstName || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Last Name</Label>
                  <p className="text-sm">{user.lastName || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Email</Label>
                  <p className="text-sm">{user.email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Phone</Label>
                  <p className="text-sm">{user.phone || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Job Title</Label>
                  <p className="text-sm">{user.jobTitle || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Company</Label>
                  <p className="text-sm">{user.company || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Location</Label>
                  <p className="text-sm">{user.location || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Bio</Label>
                  <p className="text-sm">{user.bio || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="starboard-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Mentors</CardTitle>
                  <CardDescription>Mentors assigned to {user.firstName}</CardDescription>
                </div>
                {currentRole?.canBeMentee && !mentorshipData.asMentee && (
                  <Button
                    onClick={() => setIsAssignMentorDialogOpen(true)}
                    className="starboard-button"
                  >
                    <Link2 className="mr-2 h-4 w-4" />
                    Assign Mentor
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!currentRole?.canBeMentee ? (
                <div className="text-center py-8 text-slate-gray-500">
                  <Info className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="font-medium">Cannot be mentored</p>
                  <p className="text-sm mt-2">This user's role doesn't allow being mentored</p>
                </div>
              ) : !mentorshipData.asMentee ? (
                <div className="text-center py-8 text-slate-gray-500">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-orange-400" />
                  <p className="font-medium">No mentor assigned</p>
                  <p className="text-sm mt-2">This user needs to be paired with a mentor</p>
                </div>
              ) : (
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
                        <div className="text-sm text-slate-gray-500">
                          {mentorshipData.asMentee.mentor.email}
                        </div>
                        {mentorshipData.asMentee.mentor.jobTitle && (
                          <div className="text-xs text-slate-gray-400">
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
                      <Label className="text-slate-gray-600">Total Meetings</Label>
                      <p className="font-medium">{mentorshipData.asMentee.totalMeetings || 0}</p>
                    </div>
                    <div>
                      <Label className="text-slate-gray-600">Last Meeting</Label>
                      <p className="font-medium">
                        {mentorshipData.asMentee.lastMeetingAt
                          ? new Date(mentorshipData.asMentee.lastMeetingAt).toLocaleDateString()
                          : 'Never'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-slate-gray-600">Next Due</Label>
                      <p className="font-medium">
                        {mentorshipData.asMentee.nextMeetingDue
                          ? new Date(mentorshipData.asMentee.nextMeetingDue).toLocaleDateString()
                          : 'Not set'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

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
                  className="starboard-input"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAssignMentorDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAssignMentor} className="starboard-button">
                Assign Mentor
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
                  className="starboard-input"
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsReassignDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleReassignMentor} className="starboard-button">
                Reassign Mentor
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
