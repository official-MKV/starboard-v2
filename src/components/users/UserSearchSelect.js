'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// Base UserSearchSelect component
export function UserSearchSelect({
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

// Specialized components
export function MentorSearchSelect({ value, onValueChange, disabled = false, className }) {
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

export function MenteeSearchSelect({ value, onValueChange, disabled = false, className }) {
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

export function ReassignmentUserSelect({
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
