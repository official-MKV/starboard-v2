'use client'

import { useState, useEffect } from 'react'
import { useAuth, useRequireWorkspace } from '@/lib/hooks/auth'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  Plus,
  Users,
  UserCheck,
  UserX,
  AlertTriangle,
  Calendar,
  Edit,
  Trash2,
  MoreHorizontal,
  Search,
  RefreshCw,
  Link2,
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  ArrowRightLeft,
} from 'lucide-react'

export default function MentorshipManagement() {
  const { user, workspace, isLoading: requireLoading } = useRequireWorkspace()
  const [isLoading, setIsLoading] = useState(true)

  // State
  const [assignments, setAssignments] = useState([])
  const [statistics, setStatistics] = useState(null)
  const [overdueAssignments, setOverdueAssignments] = useState([])

  // Dialogs
  const [isCreateAssignmentDialogOpen, setIsCreateAssignmentDialogOpen] = useState(false)
  const [isReassignDialogOpen, setIsReassignDialogOpen] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState(null)

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    mentorId: '',
    menteeId: '',
  })

  // Forms
  const [assignmentForm, setAssignmentForm] = useState({
    mentorId: '',
    menteeId: '',
    notes: '',
  })

  const [reassignForm, setReassignForm] = useState({
    newMentorId: '',
    newMenteeId: '',
    reason: ''
  })

  useEffect(() => {
    if (!requireLoading) {
      fetchData()
    }
  }, [requireLoading])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      await Promise.all([
        fetchAssignments(),
        fetchStatistics()
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAssignments = async () => {
    try {
      const queryParams = new URLSearchParams({
        ...(filters.status !== 'all' && { status: filters.status }),
        ...(filters.search && { search: filters.search }),
        ...(filters.mentorId && { mentorId: filters.mentorId }),
        ...(filters.menteeId && { menteeId: filters.menteeId })
      })

      const response = await fetch(`/api/mentorship/assignments?${queryParams}`)
      if (response.ok) {
        const data = await response.json()
        setAssignments(data.data.assignments)
      }
    } catch (error) {
      console.error('Error fetching assignments:', error)
      toast.error('Failed to load mentorship assignments')
    }
  }

  const fetchStatistics = async () => {
    try {
      const response = await fetch('/api/mentorship/statistics')
      if (response.ok) {
        const data = await response.json()
        setStatistics(data.data.statistics)
        setOverdueAssignments(data.data.overdueAssignments)
      }
    } catch (error) {
      console.error('Error fetching statistics:', error)
      toast.error('Failed to load mentorship statistics')
    }
  }

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
        body: JSON.stringify(assignmentForm)
      })

      if (response.ok) {
        toast.success('Mentorship assignment created successfully')
        setIsCreateAssignmentDialogOpen(false)
        resetAssignmentForm()
        fetchAssignments()
        fetchStatistics()
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
      const response = await fetch(`/api/mentorship/assignments/${selectedAssignment.id}/reassign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reassignForm)
      })

      if (response.ok) {
        toast.success('Assignment reassigned successfully')
        setIsReassignDialogOpen(false)
        setSelectedAssignment(null)
        resetReassignForm()
        fetchAssignments()
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
    if (!confirm(`Are you sure you want to terminate the mentorship between ${assignment.mentor.firstName} ${assignment.mentor.lastName} and ${assignment.mentee.firstName} ${assignment.mentee.lastName}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/mentorship/assignments/${assignment.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      })

      if (response.ok) {
        toast.success('Assignment terminated successfully')
        fetchAssignments()
        fetchStatistics()
      } else {
        const error = await response.json()
        toast.error(error.error?.message || 'Failed to terminate assignment')
      }
    } catch (error) {
      console.error('Error terminating assignment:', error)
      toast.error('An unexpected error occurred')
    }
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
      reason: ''
    })
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      ACTIVE: { color: 'bg-green-100 text-green-800', label: 'Active' },
      PAUSED: { color: 'bg-yellow-100 text-yellow-800', label: 'Paused' },
      TERMINATED: { color: 'bg-red-100 text-red-800', label: 'Terminated' },
    }

    const config = statusConfig[status] || statusConfig.ACTIVE

    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    )
  }

  const filteredAssignments = assignments.filter(assignment => {
    const matchesSearch =
      assignment.mentor.firstName.toLowerCase().includes(filters.search.toLowerCase()) ||
      assignment.mentor.lastName.toLowerCase().includes(filters.search.toLowerCase()) ||
      assignment.mentee.firstName.toLowerCase().includes(filters.search.toLowerCase()) ||
      assignment.mentee.lastName.toLowerCase().includes(filters.search.toLowerCase()) ||
      assignment.mentor.email.toLowerCase().includes(filters.search.toLowerCase()) ||
      assignment.mentee.email.toLowerCase().includes(filters.search.toLowerCase())

    const matchesStatus = filters.status === 'all' || assignment.status === filters.status

    return matchesSearch && matchesStatus
  })

  if (requireLoading) {
    return (
      <div className="min-h-screen bg-snow-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-slate-gray-600">Loading mentorship...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-charcoal-900">Mentorship Management</h2>
          <p className="text-slate-gray-600 mt-1">
            Manage mentor-mentee relationships and track meeting progress
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button onClick={fetchData} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => setIsCreateAssignmentDialogOpen(true)} className="starboard-button">
            <Link2 className="mr-2 h-4 w-4" />
            Create Assignment
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="starboard-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-gray-600">Active Assignments</p>
                  <p className="text-2xl font-bold text-charcoal-900">{statistics.activeAssignments}</p>
                </div>
                <UserCheck className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="starboard-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-gray-600">Total Mentors</p>
                  <p className="text-2xl font-bold text-charcoal-900">{statistics.totalMentors}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="starboard-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-gray-600">Total Mentees</p>
                  <p className="text-2xl font-bold text-charcoal-900">{statistics.totalMentees}</p>
                </div>
                <UserX className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="starboard-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-gray-600">Overdue Meetings</p>
                  <p className="text-2xl font-bold text-charcoal-900">{statistics.overdueAssignments}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Overdue Meetings Alert */}
      {overdueAssignments.length > 0 && (
        <Card className="starboard-card border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-800 flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5" />
              Overdue Meetings ({overdueAssignments.length})
            </CardTitle>
            <CardDescription className="text-orange-700">
              These mentorship pairs haven't had a meeting in over 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overdueAssignments.slice(0, 5).map(assignment => (
                <div key={assignment.id} className="flex items-center justify-between text-sm">
                  <span>
                    {assignment.mentor.firstName} {assignment.mentor.lastName} → {assignment.mentee.firstName} {assignment.mentee.lastName}
                  </span>
                  <span className="text-orange-600">
                    Due: {assignment.nextMeetingDue ? new Date(assignment.nextMeetingDue).toLocaleDateString() : 'No date set'}
                  </span>
                </div>
              ))}
              {overdueAssignments.length > 5 && (
                <p className="text-sm text-orange-600">
                  +{overdueAssignments.length - 5} more...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="starboard-card">
        <CardContent className="py-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-gray-400" />
              <Input
                placeholder="Search assignments by mentor, mentee, or email..."
                value={filters.search}
                onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-9"
              />
            </div>
            <Select
              value={filters.status}
              onValueChange={value => setFilters(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="All status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="PAUSED">Paused</SelectItem>
                <SelectItem value="TERMINATED">Terminated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Assignments Table */}
      <Card className="starboard-card">
        <CardHeader>
          <CardTitle>Mentorship Assignments ({filteredAssignments.length})</CardTitle>
          <CardDescription>Manage mentor-mentee relationships and track progress</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mentor</TableHead>
                <TableHead>Mentee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Meetings</TableHead>
                <TableHead>Last Meeting</TableHead>
                <TableHead>Next Due</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredAssignments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="text-slate-gray-500">
                      <Link2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No mentorship assignments found</p>
                      <p className="text-sm mt-2">Create your first assignment to get started</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAssignments.map(assignment => (
                  <TableRow key={assignment.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-medium text-sm">
                          {assignment.mentor.firstName?.[0]}{assignment.mentor.lastName?.[0]}
                        </div>
                        <div>
                          <div className="font-medium">
                            {assignment.mentor.firstName} {assignment.mentor.lastName}
                          </div>
                          <div className="text-sm text-slate-gray-500">{assignment.mentor.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-medium text-sm">
                          {assignment.mentee.firstName?.[0]}{assignment.mentee.lastName?.[0]}
                        </div>
                        <div>
                          <div className="font-medium">
                            {assignment.mentee.firstName} {assignment.mentee.lastName}
                          </div>
                          <div className="text-sm text-slate-gray-500">{assignment.mentee.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(assignment.status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-slate-gray-400" />
                        <span className="text-sm">{assignment.totalMeetings}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {assignment.lastMeetingAt
                          ? new Date(assignment.lastMeetingAt).toLocaleDateString()
                          : 'Never'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {assignment.nextMeetingDue && new Date(assignment.nextMeetingDue) < new Date() ? (
                          <>
                            <Clock className="h-4 w-4 text-orange-500" />
                            <span className="text-sm text-orange-600">Overdue</span>
                          </>
                        ) : (
                          <div className="text-sm">
                            {assignment.nextMeetingDue
                              ? new Date(assignment.nextMeetingDue).toLocaleDateString()
                              : 'Not set'}
                          </div>
                        )}
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
                            onClick={() => {
                              setSelectedAssignment(assignment)
                              setReassignForm({
                                newMentorId: '',
                                newMenteeId: '',
                                reason: ''
                              })
                              setIsReassignDialogOpen(true)
                            }}
                          >
                            <ArrowRightLeft className="mr-2 h-4 w-4" />
                            Reassign
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleTerminateAssignment(assignment)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Terminate
                          </DropdownMenuItem>
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

      {/* Create Assignment Dialog */}
      <Dialog open={isCreateAssignmentDialogOpen} onOpenChange={setIsCreateAssignmentDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Mentorship Assignment</DialogTitle>
            <DialogDescription>
              Assign a mentor to a mentee in your workspace
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="mentor">Mentor *</Label>
                <Input
                  id="mentor"
                  placeholder="Search for mentor..."
                  className="starboard-input"
                />
                <p className="text-xs text-slate-gray-500 mt-1">
                  TODO: Implement user search/select component
                </p>
              </div>
              <div>
                <Label htmlFor="mentee">Mentee *</Label>
                <Input
                  id="mentee"
                  placeholder="Search for mentee..."
                  className="starboard-input"
                />
                <p className="text-xs text-slate-gray-500 mt-1">
                  TODO: Implement user search/select component
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={assignmentForm.notes}
                onChange={e => setAssignmentForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any additional notes or context for this mentorship..."
                rows={3}
                className="starboard-input"
              />
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Each mentee can only have one active mentor. Mentors can have multiple mentees.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateAssignmentDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateAssignment} className="starboard-button">
              Create Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reassign Dialog */}
      <Dialog open={isReassignDialogOpen} onOpenChange={setIsReassignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassign Mentorship</DialogTitle>
            <DialogDescription>
              Change the mentor or mentee in this assignment
            </DialogDescription>
          </DialogHeader>

          {selectedAssignment && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-slate-gray-600">Current Assignment:</p>
                <p className="font-medium">
                  {selectedAssignment.mentor.firstName} {selectedAssignment.mentor.lastName} → {selectedAssignment.mentee.firstName} {selectedAssignment.mentee.lastName}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="newMentor">New Mentor (Optional)</Label>
                  <Input
                    id="newMentor"
                    placeholder="Search for new mentor..."
                    className="starboard-input"
                  />
                  <p className="text-xs text-slate-gray-500 mt-1">
                    Leave empty to keep current mentor
                  </p>
                </div>
                <div>
                  <Label htmlFor="newMentee">New Mentee (Optional)</Label>
                  <Input
                    id="newMentee"
                    placeholder="Search for new mentee..."
                    className="starboard-input"
                  />
                  <p className="text-xs text-slate-gray-500 mt-1">
                    Leave empty to keep current mentee
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="reassignReason">Reason for Reassignment *</Label>
                <Textarea
                  id="reassignReason"
                  value={reassignForm.reason}
                  onChange={e => setReassignForm(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Please explain why this reassignment is necessary..."
                  rows={3}
                  className="starboard-input"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReassignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleReassignAssignment} className="starboard-button">
              Reassign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
