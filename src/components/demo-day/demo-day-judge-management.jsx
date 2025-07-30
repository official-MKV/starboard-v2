// components/events/demo-day-judge-management.jsx
'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users,
  Plus,
  Shield,
  UserCheck,
  Trash2,
  MoreVertical,
  Check,
  Search
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { toast } from 'sonner'

export function DemoDayJudgeManagement({ eventId }) {
  const [isAddJudgeOpen, setIsAddJudgeOpen] = useState(false)
  const queryClient = useQueryClient()

  // Fetch judges
  const { data: judgesData, isLoading, error } = useQuery({
    queryKey: ['event-judges', eventId],
    queryFn: async () => {
      const response = await fetch(`/api/events/${eventId}/judges`)
      if (!response.ok) throw new Error('Failed to fetch judges')
      return response.json()
    },
  })

  const judges = judgesData?.data?.judges || []

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACCEPTED': return 'bg-green-100 text-green-800'
      case 'COMPLETED': return 'bg-blue-100 text-blue-800'
      case 'DECLINED': return 'bg-red-100 text-red-800'
      case 'INVITED': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Demo Day Judges
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Shield className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load judges</h3>
            <p className="text-gray-500 mb-4">{error.message}</p>
            <Button onClick={() => queryClient.invalidateQueries(['event-judges', eventId])}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Demo Day Judges {!isLoading && `(${judges.length})`}
          </div>
          {!isLoading && (
            <Dialog open={isAddJudgeOpen} onOpenChange={setIsAddJudgeOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Judge
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add Judge</DialogTitle>
                </DialogHeader>
                <AddJudgeForm 
                  eventId={eventId} 
                  onSuccess={() => {
                    setIsAddJudgeOpen(false)
                    queryClient.invalidateQueries(['event-judges', eventId])
                  }}
                  onCancel={() => setIsAddJudgeOpen(false)}
                />
              </DialogContent>
            </Dialog>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <LoadingSpinner size="lg" className="mx-auto mb-4" />
              <p className="text-gray-500">Loading judges...</p>
            </div>
          </div>
        ) : judges.length === 0 ? (
          <div className="text-center py-8">
            <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No judges assigned</h3>
            <p className="text-gray-500 mb-4">
              Add workspace members with judge permissions to evaluate submissions
            </p>
            <Button onClick={() => setIsAddJudgeOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Judge
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {judges.map((judge) => (
              <div key={judge.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={judge.user.avatar} />
                    <AvatarFallback>
                      {judge.user.firstName[0]}{judge.user.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div>
                    <h4 className="font-medium">
                      {judge.user.firstName} {judge.user.lastName}
                    </h4>
                    <p className="text-sm text-gray-600">{judge.user.email}</p>
                    {judge._count.scores > 0 && (
                      <p className="text-xs text-blue-600">
                        {judge._count.scores} submission{judge._count.scores !== 1 ? 's' : ''} scored
                      </p>
                    )}
                  </div>
                  
                  <Badge className={getStatusColor(judge.status)}>
                    {judge.status}
                  </Badge>
                </div>

                <JudgeActionsMenu judge={judge} eventId={eventId} />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function AddJudgeForm({ eventId, onSuccess, onCancel }) {
  const [selectedUser, setSelectedUser] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch potential judges
  const { data: potentialJudgesData, isLoading } = useQuery({
    queryKey: ['potential-judges', eventId],
    queryFn: async () => {
      const response = await fetch(`/api/events/${eventId}/potential-judges`)
      if (!response.ok) throw new Error('Failed to fetch potential judges')
      return response.json()
    },
  })

  const potentialJudges = potentialJudgesData?.data?.potentialJudges || []

  // Filter judges by search term
  const filteredJudges = potentialJudges.filter(member => {
    const fullName = `${member.user.firstName} ${member.user.lastName}`.toLowerCase()
    const email = member.user.email.toLowerCase()
    const search = searchTerm.toLowerCase()
    return fullName.includes(search) || email.includes(search)
  })

  const handleSubmit = async () => {
    if (!selectedUser) {
      toast.error('Please select a user to add as judge')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/events/${eventId}/judges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: [selectedUser.userId]
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to add judge')
      }

      const result = await response.json()
      toast.success('Judge added successfully')
      onSuccess()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-500">Loading potential judges...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="search">Search and Select Member</Label>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <Input
            id="search"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* User Selection Dropdown */}
      <div>
        {filteredJudges.length === 0 ? (
          <div className="text-center py-8 border rounded-lg">
            <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">
              {potentialJudges.length === 0 
                ? 'No eligible members found' 
                : 'No members match your search'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg">
            {filteredJudges.map((member) => (
              <div 
                key={member.id}
                className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 ${
                  selectedUser?.id === member.id ? 'bg-blue-50 border-blue-200' : ''
                }`}
                onClick={() => setSelectedUser(member)}
              >
                <Avatar className="w-8 h-8">
                  <AvatarImage src={member.user.avatar} />
                  <AvatarFallback>
                    {member.user.firstName[0]}{member.user.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <p className="font-medium">
                    {member.user.firstName} {member.user.lastName}
                  </p>
                  <p className="text-sm text-gray-600">{member.user.email}</p>
                  {member.user.jobTitle && (
                    <p className="text-xs text-gray-500">{member.user.jobTitle}</p>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge 
                    style={{ backgroundColor: member.role.color }} 
                    className="text-white"
                  >
                    {member.role.name}
                  </Badge>
                  {selectedUser?.id === member.id && (
                    <Check className="w-4 h-4 text-blue-600" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected User Preview */}
      {selectedUser && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm font-medium">Selected Member:</p>
          <p className="text-blue-700">
            {selectedUser.user.firstName} {selectedUser.user.lastName} ({selectedUser.user.email})
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          disabled={isSubmitting || !selectedUser}
        >
          {isSubmitting ? 'Adding...' : 'Add Judge'}
        </Button>
      </div>
    </div>
  )
}

function JudgeActionsMenu({ judge, eventId }) {
  const queryClient = useQueryClient()

  const removeJudgeMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/events/${eventId}/judges/${judge.id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to remove judge')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['event-judges', eventId])
      toast.success('Judge removed successfully')
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onClick={() => {
            if (confirm('Are you sure you want to remove this judge? This will also delete all their scores.')) {
              removeJudgeMutation.mutate()
            }
          }}
          className="text-red-600 focus:text-red-600"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Remove Judge
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}