// components/events/create-event-form.jsx
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { CalendarIcon, Plus, X, Video, MapPin, Users, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const eventSchema = z
  .object({
    title: z.string().min(1, 'Event title is required').max(100, 'Title too long'),
    description: z.string().optional(),
    type: z.enum([
      'WORKSHOP',
      'MENTORING',
      'PITCH',
      'NETWORKING',
      'DEMO_DAY',
      'BOOTCAMP',
      'WEBINAR',
      'OTHER',
    ]),
    startDate: z.date({ required_error: 'Start date is required' }),
    endDate: z.date({ required_error: 'End date is required' }),
    startTime: z.string().min(1, 'Start time is required'),
    endTime: z.string().min(1, 'End time is required'),
    timezone: z.string().default('UTC'),
    isVirtual: z.boolean().default(false),
    location: z.string().optional(),
    virtualLink: z.string().url().optional(),
    meetingPassword: z.string().optional(),
    isPublic: z.boolean().default(false),
    requireApproval: z.boolean().default(false),
    maxAttendees: z.number().min(1).optional(),
    waitingRoom: z.boolean().default(true),
    isRecorded: z.boolean().default(false),
    autoRecord: z.boolean().default(false),
    agenda: z.string().optional(),
    instructions: z.string().optional(),
    tags: z.array(z.string()).default([]),
  })
  .refine(
    data => {
      if (data.isVirtual && !data.virtualLink) {
        return false
      }
      if (!data.isVirtual && !data.location) {
        return false
      }
      return data.endDate > data.startDate
    },
    {
      message: 'End date must be after start date, and virtual events need a meeting link',
      path: ['endDate'],
    }
  )

const EVENT_TYPES = [
  { value: 'WORKSHOP', label: 'Workshop', description: 'Interactive learning session' },
  { value: 'MENTORING', label: 'Mentoring', description: 'One-on-one or group mentoring' },
  { value: 'PITCH', label: 'Pitch', description: 'Startup pitch session' },
  { value: 'NETWORKING', label: 'Networking', description: 'Networking event' },
  { value: 'DEMO_DAY', label: 'Demo Day', description: 'Product demonstration day' },
  { value: 'BOOTCAMP', label: 'Bootcamp', description: 'Intensive training program' },
  { value: 'WEBINAR', label: 'Webinar', description: 'Online seminar' },
  { value: 'OTHER', label: 'Other', description: 'Custom event type' },
]

export function CreateEventForm({ onSuccess }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [speakers, setSpeakers] = useState([])
  const [newSpeaker, setNewSpeaker] = useState({
    role: 'SPEAKER',
    isExternal: false,
  })
  const [currentTag, setCurrentTag] = useState('')

  const form = useForm({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      type: 'WORKSHOP',
      isVirtual: false,
      isPublic: false,
      requireApproval: false,
      waitingRoom: true,
      isRecorded: false,
      autoRecord: false,
      timezone: 'UTC',
      tags: [],
    },
  })

  const watchIsVirtual = form.watch('isVirtual')
  const watchStartDate = form.watch('startDate')
  const watchEndDate = form.watch('endDate')
  const watchTags = form.watch('tags')

  const onSubmit = async data => {
    setIsSubmitting(true)
    try {
      // Combine date and time
      const startDateTime = new Date(data.startDate)
      const [startHour, startMinute] = data.startTime.split(':')
      startDateTime.setHours(parseInt(startHour), parseInt(startMinute))

      const endDateTime = new Date(data.endDate)
      const [endHour, endMinute] = data.endTime.split(':')
      endDateTime.setHours(parseInt(endHour), parseInt(endMinute))

      const eventData = {
        ...data,
        startDate: startDateTime.toISOString(),
        endDate: endDateTime.toISOString(),
        speakers: speakers.filter(speaker => speaker.name && speaker.email),
      }

      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to create event')
      }

      toast.success('Event created successfully')
      onSuccess?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create event')
    } finally {
      setIsSubmitting(false)
    }
  }

  const addSpeaker = () => {
    if (!newSpeaker.name || !newSpeaker.email) {
      toast.error('Speaker name and email are required')
      return
    }

    setSpeakers([...speakers, { ...newSpeaker }])
    setNewSpeaker({ role: 'SPEAKER', isExternal: false })
  }

  const removeSpeaker = index => {
    setSpeakers(speakers.filter((_, i) => i !== index))
  }

  const addTag = () => {
    if (!currentTag.trim()) return
    const currentTags = form.getValues('tags')
    if (!currentTags.includes(currentTag.trim())) {
      form.setValue('tags', [...currentTags, currentTag.trim()])
    }
    setCurrentTag('')
  }

  const removeTag = tagToRemove => {
    const currentTags = form.getValues('tags')
    form.setValue(
      'tags',
      currentTags.filter(tag => tag !== tagToRemove)
    )
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="datetime">Date & Time</TabsTrigger>
          <TabsTrigger value="location">Location</TabsTrigger>
          <TabsTrigger value="speakers">Speakers</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Event Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Event Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter event title"
                  {...form.register('title')}
                  className={cn('starboard-input', form.formState.errors.title && 'field-error')}
                />
                {form.formState.errors.title && (
                  <p className="error-message">{form.formState.errors.title.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your event..."
                  rows={3}
                  {...form.register('description')}
                  className="starboard-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Event Type *</Label>
                <Select
                  value={form.watch('type')}
                  onValueChange={value => form.setValue('type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        <div>
                          <div className="font-medium">{type.label}</div>
                          <div className="text-sm text-gray-500">{type.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex gap-2 mb-2 flex-wrap">
                  {watchTags.map(tag => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <X
                        className="w-3 h-3 cursor-pointer hover:text-red-500"
                        onClick={() => removeTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add tag..."
                    value={currentTag}
                    onChange={e => setCurrentTag(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    className="starboard-input"
                  />
                  <Button type="button" variant="outline" onClick={addTag}>
                    Add
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="isPublic">Public Event</Label>
                    <p className="text-sm text-gray-500">Allow external participants</p>
                  </div>
                  <Switch
                    id="isPublic"
                    checked={form.watch('isPublic')}
                    onCheckedChange={checked => form.setValue('isPublic', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="requireApproval">Require Approval</Label>
                    <p className="text-sm text-gray-500">Manually approve registrations</p>
                  </div>
                  <Switch
                    id="requireApproval"
                    checked={form.watch('requireApproval')}
                    onCheckedChange={checked => form.setValue('requireApproval', checked)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxAttendees">Maximum Attendees</Label>
                <Input
                  id="maxAttendees"
                  type="number"
                  min="1"
                  placeholder="Leave empty for unlimited"
                  {...form.register('maxAttendees', { valueAsNumber: true })}
                  className="starboard-input"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="datetime" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Date & Time Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !watchStartDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {watchStartDate ? format(watchStartDate, 'PPP') : 'Select start date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={watchStartDate}
                        onSelect={date => form.setValue('startDate', date)}
                        disabled={date => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {form.formState.errors.startDate && (
                    <p className="error-message">{form.formState.errors.startDate.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>End Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !watchEndDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {watchEndDate ? format(watchEndDate, 'PPP') : 'Select end date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={watchEndDate}
                        onSelect={date => form.setValue('endDate', date)}
                        disabled={date => date < (watchStartDate || new Date())}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {form.formState.errors.endDate && (
                    <p className="error-message">{form.formState.errors.endDate.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time *</Label>
                  <Input
                    id="startTime"
                    type="time"
                    {...form.register('startTime')}
                    className={cn(
                      'starboard-input',
                      form.formState.errors.startTime && 'field-error'
                    )}
                  />
                  {form.formState.errors.startTime && (
                    <p className="error-message">{form.formState.errors.startTime.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time *</Label>
                  <Input
                    id="endTime"
                    type="time"
                    {...form.register('endTime')}
                    className={cn(
                      'starboard-input',
                      form.formState.errors.endTime && 'field-error'
                    )}
                  />
                  {form.formState.errors.endTime && (
                    <p className="error-message">{form.formState.errors.endTime.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={form.watch('timezone')}
                  onValueChange={value => form.setValue('timezone', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="America/New_York">Eastern Time</SelectItem>
                    <SelectItem value="America/Chicago">Central Time</SelectItem>
                    <SelectItem value="America/Denver">Mountain Time</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                    <SelectItem value="Europe/London">London</SelectItem>
                    <SelectItem value="Europe/Paris">Paris</SelectItem>
                    <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="agenda">Agenda</Label>
                <Textarea
                  id="agenda"
                  placeholder="Event agenda or schedule..."
                  rows={4}
                  {...form.register('agenda')}
                  className="starboard-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="instructions">Pre-meeting Instructions</Label>
                <Textarea
                  id="instructions"
                  placeholder="Instructions for participants before the event..."
                  rows={3}
                  {...form.register('instructions')}
                  className="starboard-input"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="location" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Location Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="isVirtual">Virtual Event</Label>
                  <p className="text-sm text-gray-500">Host online via Zoom</p>
                </div>
                <Switch
                  id="isVirtual"
                  checked={watchIsVirtual}
                  onCheckedChange={checked => form.setValue('isVirtual', checked)}
                />
              </div>

              {watchIsVirtual ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="virtualLink">Meeting URL</Label>
                    <div className="flex gap-2">
                      <Input
                        id="virtualLink"
                        placeholder="https://zoom.us/j/..."
                        {...form.register('virtualLink')}
                        className={cn(
                          'starboard-input flex-1',
                          form.formState.errors.virtualLink && 'field-error'
                        )}
                      />
                      <Button type="button" variant="outline">
                        <Video className="w-4 h-4 mr-2" />
                        Create Zoom
                      </Button>
                    </div>
                    {form.formState.errors.virtualLink && (
                      <p className="error-message">{form.formState.errors.virtualLink.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="meetingPassword">Meeting Password</Label>
                    <Input
                      id="meetingPassword"
                      placeholder="Optional meeting password"
                      {...form.register('meetingPassword')}
                      className="starboard-input"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="waitingRoom">Waiting Room</Label>
                        <p className="text-sm text-gray-500">Host admits participants</p>
                      </div>
                      <Switch
                        id="waitingRoom"
                        checked={form.watch('waitingRoom')}
                        onCheckedChange={checked => form.setValue('waitingRoom', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="isRecorded">Record Meeting</Label>
                        <p className="text-sm text-gray-500">Save recording</p>
                      </div>
                      <Switch
                        id="isRecorded"
                        checked={form.watch('isRecorded')}
                        onCheckedChange={checked => form.setValue('isRecorded', checked)}
                      />
                    </div>
                  </div>

                  {form.watch('isRecorded') && (
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="autoRecord">Auto Record</Label>
                        <p className="text-sm text-gray-500">Start recording automatically</p>
                      </div>
                      <Switch
                        id="autoRecord"
                        checked={form.watch('autoRecord')}
                        onCheckedChange={checked => form.setValue('autoRecord', checked)}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="location">Location *</Label>
                  <div className="flex gap-2">
                    <MapPin className="w-5 h-5 text-gray-400 mt-2" />
                    <Input
                      id="location"
                      placeholder="Enter venue address or location"
                      {...form.register('location')}
                      className={cn(
                        'starboard-input flex-1',
                        form.formState.errors.location && 'field-error'
                      )}
                    />
                  </div>
                  {form.formState.errors.location && (
                    <p className="error-message">{form.formState.errors.location.message}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="speakers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Event Speakers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current Speakers */}
              {speakers.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium">Added Speakers ({speakers.length})</h4>
                  {speakers.map((speaker, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>
                            {speaker.name
                              .split(' ')
                              .map(n => n[0])
                              .join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{speaker.name}</p>
                          <p className="text-sm text-gray-500">{speaker.email}</p>
                          {speaker.company && (
                            <p className="text-sm text-gray-500">
                              {speaker.jobTitle} at {speaker.company}
                            </p>
                          )}
                          <Badge variant="outline" className="mt-1">
                            {speaker.role.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeSpeaker(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Separator />
                </div>
              )}

              {/* Add New Speaker */}
              <div className="space-y-4 p-4 border-2 border-dashed border-gray-200 rounded-lg">
                <h4 className="font-medium">Add Speaker</h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input
                      placeholder="Speaker name"
                      value={newSpeaker.name || ''}
                      onChange={e => setNewSpeaker({ ...newSpeaker, name: e.target.value })}
                      className="starboard-input"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      placeholder="speaker@email.com"
                      value={newSpeaker.email || ''}
                      onChange={e => setNewSpeaker({ ...newSpeaker, email: e.target.value })}
                      className="starboard-input"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Company</Label>
                    <Input
                      placeholder="Company name"
                      value={newSpeaker.company || ''}
                      onChange={e => setNewSpeaker({ ...newSpeaker, company: e.target.value })}
                      className="starboard-input"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Job Title</Label>
                    <Input
                      placeholder="Job title"
                      value={newSpeaker.jobTitle || ''}
                      onChange={e => setNewSpeaker({ ...newSpeaker, jobTitle: e.target.value })}
                      className="starboard-input"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select
                    value={newSpeaker.role}
                    onValueChange={value => setNewSpeaker({ ...newSpeaker, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select speaker role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SPEAKER">Speaker</SelectItem>
                      <SelectItem value="HOST">Host</SelectItem>
                      <SelectItem value="MODERATOR">Moderator</SelectItem>
                      <SelectItem value="PANELIST">Panelist</SelectItem>
                      <SelectItem value="KEYNOTE">Keynote</SelectItem>
                      <SelectItem value="FACILITATOR">Facilitator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Bio</Label>
                  <Textarea
                    placeholder="Speaker biography..."
                    value={newSpeaker.bio || ''}
                    onChange={e => setNewSpeaker({ ...newSpeaker, bio: e.target.value })}
                    className="starboard-input"
                    rows={3}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>External Speaker</Label>
                    <p className="text-sm text-gray-500">Not a workspace member</p>
                  </div>
                  <Switch
                    checked={newSpeaker.isExternal}
                    onCheckedChange={checked =>
                      setNewSpeaker({ ...newSpeaker, isExternal: checked })
                    }
                  />
                </div>

                <Button type="button" onClick={addSpeaker} className="w-full starboard-button">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Speaker
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-6 border-t">
        <Button type="button" variant="outline" onClick={() => onSuccess?.()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting} className="starboard-button">
          {isSubmitting ? (
            <>
              <Clock className="w-4 h-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Create Event
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
