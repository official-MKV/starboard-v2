'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  MapPin,
  Video,
  Users,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Trash2,
  User,
  UserPlus,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { FileUpload } from '@/components/ui/file-upload'
import { Separator } from '@/components/ui/separator'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { toast } from 'sonner'
import { useMutation, useQuery } from '@tanstack/react-query'

const EVENT_TYPES = [
  { value: 'WORKSHOP', label: 'Workshop' },
  { value: 'MENTORING', label: 'Mentoring' },
  { value: 'PITCH', label: 'Pitch Session' },
  { value: 'NETWORKING', label: 'Networking' },
  { value: 'DEMO_DAY', label: 'Demo Day' },
  { value: 'BOOTCAMP', label: 'Bootcamp' },
  { value: 'WEBINAR', label: 'Webinar' },
  { value: 'OTHER', label: 'Other' },
]

const SPEAKER_ROLES = [
  { value: 'SPEAKER', label: 'Speaker' },
  { value: 'HOST', label: 'Host' },
  { value: 'MODERATOR', label: 'Moderator' },
  { value: 'PANELIST', label: 'Panelist' },
  { value: 'KEYNOTE', label: 'Keynote Speaker' },
  { value: 'FACILITATOR', label: 'Facilitator' },
]

// External speaker validation schema
const externalSpeakerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  bio: z.string().optional(),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  role: z.enum(['SPEAKER', 'HOST', 'MODERATOR', 'PANELIST', 'KEYNOTE', 'FACILITATOR']),
})

// Form validation schema - REMOVED tags field
const eventSchema = z
  .object({
    // Basic Info
    title: z.string().min(1, 'Event title is required').max(200, 'Title is too long'),
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
    bannerImage: z
      .object({
        url: z.string(),
        fileName: z.string(),
        originalName: z.string(),
        fileKey: z.string(),
      })
      .optional()
      .nullable(),

    // Date & Time
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    timezone: z.string().default('UTC'),

    // Location
    isVirtual: z.boolean().default(false),
    location: z.string().optional(),

    // Settings
    isPublic: z.boolean().default(false),
    maxAttendees: z.number().min(1).optional(),
    waitingRoom: z.boolean().default(true),
    autoRecord: z.boolean().default(false),
    agenda: z.string().optional(),
    instructions: z.string().optional(),

    // Advanced
    isRecurring: z.boolean().default(false),
    recurringRule: z.object({}).optional(),
  })
  .refine(
    data => {
      const start = new Date(data.startDate)
      const end = new Date(data.endDate)
      return start < end
    },
    {
      message: 'End date must be after start date',
      path: ['endDate'],
    }
  )

// Simple speaker management hook
function useEventSpeakers() {
  const [speakers, setSpeakers] = useState([])

  const addSpeaker = useCallback(
    speakerData => {
      // Check for duplicates
      const isDuplicate = speakers.some(
        speaker =>
          speaker.email === speakerData.email ||
          (speaker.userId && speaker.userId === speakerData.userId)
      )

      if (isDuplicate) {
        toast.error('Speaker already added to this event')
        return
      }

      const newSpeaker = {
        ...speakerData,
        id: `temp-${Date.now()}-${Math.random()}`,
      }

      setSpeakers(prev => [...prev, newSpeaker])
      toast.success('Speaker added successfully')
      return newSpeaker
    },
    [speakers]
  )

  const removeSpeaker = useCallback(speakerId => {
    setSpeakers(prev => prev.filter(speaker => speaker.id !== speakerId))
    toast.success('Speaker removed')
  }, [])

  return {
    speakers,
    setSpeakers,
    addSpeaker,
    removeSpeaker,
  }
}

// Add debounced search hook
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export function CreateEventForm({ eventId, onSuccess, onCancel }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [accessRules, setAccessRules] = useState([])
  const [isAddingSpeaker, setIsAddingSpeaker] = useState(false)

  // Use speaker management hook
  const { speakers, setSpeakers, addSpeaker, removeSpeaker } = useEventSpeakers()

  const form = useForm({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      type: 'WORKSHOP',
      isVirtual: false,
      isPublic: false,
      waitingRoom: true,
      autoRecord: false,
      isRecurring: false,
      timezone: 'UTC',
      bannerImage: null,
    },
  })

  const { watch, setValue, getValues } = form
  const watchedIsVirtual = watch('isVirtual')
  const watchedIsPublic = watch('isPublic')

  // Fetch event data for editing
  const { data: eventData } = useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      if (!eventId) return null
      const response = await fetch(`/api/events/${eventId}`)
      if (!response.ok) throw new Error('Failed to fetch event')
      return response.json()
    },
    enabled: !!eventId,
  })

  // Populate form when editing
  useEffect(() => {
    if (eventData?.data?.event) {
      const event = eventData.data.event

      // Populate basic form data
      Object.keys(event).forEach(key => {
        if (key in form.getValues()) {
          if (key === 'bannerImage' && event[key]) {
            // Handle banner image conversion
            if (typeof event[key] === 'string') {
              // If it's a URL string, convert to object format
              form.setValue(key, {
                url: event[key],
                fileName: event[key].split('/').pop() || 'banner-image',
                originalName: 'Banner Image',
                fileKey: event[key].split('/').pop() || 'banner-image',
              })
            } else if (typeof event[key] === 'object' && event[key]?.url) {
              // If it's already an object, use as is
              form.setValue(key, event[key])
            }
          } else if (key === 'startDate' || key === 'endDate') {
            // Format dates for datetime-local input
            const date = new Date(event[key])
            const formatted = date.toISOString().slice(0, 16)
            form.setValue(key, formatted)
          } else {
            form.setValue(key, event[key])
          }
        }
      })

      // Populate speakers
      setSpeakers(event.speakers || [])

      // Populate access rules
      setAccessRules(event.accessRules || [])
    }
  }, [eventData, form, setSpeakers])

  // Create/Update mutation
  const saveEventMutation = useMutation({
    mutationFn: async data => {
      const payload = {
        ...data,
        // Convert banner image object to URL string for API
        bannerImage: data.bannerImage?.url || null,
        speakers, // Include speakers from state
        accessRules,
      }

      const url = eventId ? `/api/events/${eventId}` : '/api/events'
      const method = eventId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to save event')
      }

      return response.json()
    },
    onSuccess: () => {
      toast.success(eventId ? 'Event updated successfully' : 'Event created successfully')
      onSuccess?.()
    },
    onError: error => {
      toast.error(error.message)
    },
  })

  const onSubmit = data => {
    saveEventMutation.mutate(data)
  }

  // Steps configuration
  const steps = [
    {
      title: 'Basic Information',
      description: 'Event details and description',
    },
    {
      title: 'Date & Location',
      description: 'When and where the event takes place',
    },
    {
      title: 'Speakers',
      description: 'Add speakers and presenters',
    },
    {
      title: 'Access & Settings',
      description: 'Who can attend and event settings',
    },
  ]

  const canGoNext = () => {
    switch (currentStep) {
      case 0:
        return !!getValues('title')
      case 1:
        return !!getValues('startDate') && !!getValues('endDate')
      case 2:
        return true // Speakers are optional
      case 3:
        return true // Access rules have defaults
      default:
        return false
    }
  }

  const handleAddSpeaker = useCallback(
    speaker => {
      addSpeaker(speaker)
      setIsAddingSpeaker(false)
    },
    [addSpeaker]
  )

  const handleRemoveSpeaker = useCallback(
    speakerId => {
      removeSpeaker(speakerId)
    },
    [removeSpeaker]
  )

  // FIXED: Manual form submission
  const handleFormSubmit = () => {
    form.handleSubmit(onSubmit)()
  }

  // Step components
  const BasicInfoStep = () => (
    <div className="space-y-6">
      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Event Title *</FormLabel>
            <FormControl>
              <Input placeholder="Enter event title" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea placeholder="Describe your event..." rows={4} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="type"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Event Type *</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select event type" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {EVENT_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="bannerImage"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Banner Image</FormLabel>
            <FormControl>
              <FileUpload
                value={field.value}
                onChange={field.onChange}
                accept="image/*"
                maxSize={10 * 1024 * 1024} // 10MB
                folder="events"
                placeholder="Upload event banner"
                description="PNG, JPG, GIF up to 10MB"
                preview={true}
              />
            </FormControl>
            <FormDescription>Upload a banner image for your event</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )

  const DateLocationStep = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="startDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Start Date & Time *</FormLabel>
              <FormControl>
                <Input type="datetime-local" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="endDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>End Date & Time *</FormLabel>
              <FormControl>
                <Input type="datetime-local" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="timezone"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Timezone</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
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
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="isVirtual"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <FormLabel className="text-base">Virtual Event</FormLabel>
              <FormDescription>This event will be held online</FormDescription>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />

      {watchedIsVirtual ? (
        <div className="rounded-lg border p-4 bg-blue-50">
          <div className="flex gap-3">
            <Video className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 mb-1">Virtual Meeting</h4>
              <p className="text-sm text-blue-700">
                A Zoom meeting will be automatically created for this event. The meeting link will
                be provided to registered participants.
              </p>
              <div className="mt-2 text-xs text-blue-600">
                <strong>Meeting features:</strong>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>
                    Waiting room{' '}
                    {watchedIsVirtual && form.watch('waitingRoom') ? 'enabled' : 'disabled'}
                  </li>
                  <li>
                    Auto-recording{' '}
                    {watchedIsVirtual && form.watch('autoRecord') ? 'enabled' : 'disabled'}
                  </li>
                  <li>Automatic participant muting</li>
                  <li>Host video enabled</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl>
                <div className="flex gap-2">
                  <MapPin className="w-5 h-5 text-gray-400 mt-2" />
                  <Input placeholder="Enter event location" {...field} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  )

  const SpeakersStep = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Event Speakers</h3>
          <p className="text-sm text-gray-500">Add speakers and presenters for your event</p>
        </div>
        <Button type="button" variant="outline" onClick={() => setIsAddingSpeaker(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Speaker
        </Button>
      </div>

      {speakers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No speakers added</h3>
            <p className="text-gray-500 text-center mb-4">
              Add speakers to showcase who will be presenting at your event
            </p>
            <Button type="button" onClick={() => setIsAddingSpeaker(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Speaker
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {speakers.map((speaker, index) => (
            <Card key={speaker.id || index}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={speaker.avatar || '/placeholder.svg'} alt={speaker.name} />
                    <AvatarFallback>
                      {speaker.name
                        ?.split(' ')
                        .map(n => n[0])
                        .join('')
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900">{speaker.name}</h4>
                      <Badge variant={speaker.isExternal ? 'outline' : 'secondary'}>
                        {speaker.isExternal ? 'External' : 'Internal'}
                      </Badge>
                      <Badge variant="outline">{speaker.role}</Badge>
                    </div>
                    {speaker.jobTitle && speaker.company && (
                      <p className="text-sm text-gray-500">
                        {speaker.jobTitle} at {speaker.company}
                      </p>
                    )}
                    {speaker.bio && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{speaker.bio}</p>
                    )}
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveSpeaker(speaker.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Speaker Dialog */}
      <AddSpeakerDialog
        open={isAddingSpeaker}
        onOpenChange={setIsAddingSpeaker}
        onAdd={handleAddSpeaker}
      />
    </div>
  )

  const AccessSettingsStep = () => (
    <div className="space-y-6">
      <FormField
        control={form.control}
        name="isPublic"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <FormLabel className="text-base">Public Event</FormLabel>
              <FormDescription>Make this event visible on your public website</FormDescription>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />

      {watchedIsPublic && (
        <FormField
          control={form.control}
          name="maxAttendees"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Maximum Attendees</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="Unlimited"
                  {...field}
                  onChange={e =>
                    field.onChange(e.target.value ? Number.parseInt(e.target.value) : undefined)
                  }
                />
              </FormControl>
              <FormDescription>Leave empty for unlimited capacity</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {watchedIsVirtual && (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="waitingRoom"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Waiting Room</FormLabel>
                  <FormDescription>Enable waiting room for virtual meetings</FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="autoRecord"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Auto Record</FormLabel>
                  <FormDescription>Automatically record virtual meetings</FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
      )}

      <div>
        <FormField
          control={form.control}
          name="agenda"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Agenda</FormLabel>
              <FormControl>
                <Textarea placeholder="Event agenda or schedule..." rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div>
        <FormField
          control={form.control}
          name="instructions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Instructions</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Pre-event instructions for attendees..."
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  )

  const getCurrentStepComponent = () => {
    switch (currentStep) {
      case 0:
        return <BasicInfoStep />
      case 1:
        return <DateLocationStep />
      case 2:
        return <SpeakersStep />
      case 3:
        return <AccessSettingsStep />
      default:
        return <BasicInfoStep />
    }
  }

  return (
    <Form {...form}>
      <div className="space-y-6">
        {/* Progress Steps */}
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={index} className="flex items-center">
              <div
                className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                ${index <= currentStep ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}
              `}
              >
                {index + 1}
              </div>

              {index < steps.length - 1 && (
                <div
                  className={`
                  w-12 h-0.5 mx-2
                  ${index < currentStep ? 'bg-blue-600' : 'bg-gray-200'}
                `}
                />
              )}
            </div>
          ))}
        </div>

        <div className="text-center">
          <h2 className="text-xl font-semibold">{steps[currentStep].title}</h2>
          <p className="text-gray-600">{steps[currentStep].description}</p>
        </div>

        <Separator />

        {/* Current Step Content */}
        <div className="min-h-[400px]">{getCurrentStepComponent()}</div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>

            {currentStep === steps.length - 1 ? (
              <Button
                type="button"
                onClick={handleFormSubmit}
                disabled={saveEventMutation.isPending}
              >
                {saveEventMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                {eventId ? 'Update Event' : 'Create Event'}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
                disabled={!canGoNext()}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </Form>
  )
}

// FIXED: Enhanced Add Speaker Dialog Component with PROPER form handling
function AddSpeakerDialog({ open, onOpenChange, onAdd }) {
  const [speakerType, setSpeakerType] = useState('internal')
  const [selectedUser, setSelectedUser] = useState(null)
  const [userSearchOpen, setUserSearchOpen] = useState(false)
  const [localSearchTerm, setLocalSearchTerm] = useState('')
  const [externalSpeakerData, setExternalSpeakerData] = useState({
    name: '',
    email: '',
    bio: '',
    company: '',
    jobTitle: '',
    role: 'SPEAKER',
  })

  // Debounced search term
  const debouncedSearchTerm = useDebounce(localSearchTerm, 300)

  // Mock users data for demonstration
  const mockUsers = [
    {
      id: '1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      avatar: '/avatars/john.jpg',
      company: 'Tech Corp',
      jobTitle: 'Senior Developer',
      role: { name: 'Developer' },
    },
    {
      id: '2',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
      avatar: '/avatars/jane.jpg',
      company: 'Design Studio',
      jobTitle: 'UX Designer',
      role: { name: 'Designer' },
    },
  ]

  // Filter users based on search
  const filteredUsers = useMemo(() => {
    if (!localSearchTerm) return mockUsers

    const search = localSearchTerm.toLowerCase()
    return mockUsers.filter(
      user =>
        `${user.firstName} ${user.lastName}`.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search) ||
        user.role?.name.toLowerCase().includes(search)
    )
  }, [localSearchTerm])

  // FIXED: Handle speaker addition WITHOUT form submission
  const handleAddSpeaker = async () => {
    try {
      if (speakerType === 'internal') {
        if (!selectedUser) {
          toast.error('Please select a user')
          return
        }

        const speaker = {
          userId: selectedUser.id,
          name: `${selectedUser.firstName} ${selectedUser.lastName}`,
          email: selectedUser.email,
          avatar: selectedUser.avatar,
          company: selectedUser.company,
          jobTitle: selectedUser.jobTitle,
          role: externalSpeakerData.role,
          isExternal: false,
          isConfirmed: true,
        }

        onAdd(speaker)
      } else {
        // Validate external speaker form
        if (!externalSpeakerData.name?.trim()) {
          toast.error('Speaker name is required')
          return
        }

        const speaker = {
          ...externalSpeakerData,
          isExternal: true,
          isConfirmed: false,
        }

        onAdd(speaker)
      }

      // Reset form and close dialog
      setExternalSpeakerData({
        name: '',
        email: '',
        bio: '',
        company: '',
        jobTitle: '',
        role: 'SPEAKER',
      })
      setSelectedUser(null)
      setSpeakerType('internal')
      setLocalSearchTerm('')
      setUserSearchOpen(false)
    } catch (error) {
      console.error('Error adding speaker:', error)
      toast.error('Failed to add speaker')
    }
  }

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      setLocalSearchTerm('')
      setUserSearchOpen(false)
      setExternalSpeakerData({
        name: '',
        email: '',
        bio: '',
        company: '',
        jobTitle: '',
        role: 'SPEAKER',
      })
      setSelectedUser(null)
      setSpeakerType('internal')
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Speaker</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Speaker Type Toggle */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={speakerType === 'internal' ? 'default' : 'outline'}
              onClick={() => {
                setSpeakerType('internal')
                setSelectedUser(null)
              }}
              className="flex-1"
            >
              <User className="w-4 h-4 mr-2" />
              Internal User
            </Button>
            <Button
              type="button"
              variant={speakerType === 'external' ? 'default' : 'outline'}
              onClick={() => {
                setSpeakerType('external')
                setSelectedUser(null)
              }}
              className="flex-1"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              External Speaker
            </Button>
          </div>

          {/* Internal User Selector */}
          {speakerType === 'internal' ? (
            <div className="space-y-4">
              <div>
                <Label>Select User</Label>
                <Popover open={userSearchOpen} onOpenChange={setUserSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={userSearchOpen}
                      className="w-full justify-between"
                    >
                      {selectedUser ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="w-6 h-6">
                            <AvatarImage
                              src={selectedUser.avatar || '/placeholder.svg'}
                              alt={selectedUser.firstName}
                            />
                            <AvatarFallback>
                              {selectedUser.firstName?.[0]}
                              {selectedUser.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          {selectedUser.firstName} {selectedUser.lastName}
                        </div>
                      ) : (
                        'Select a workspace member...'
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Search users..."
                        value={localSearchTerm}
                        onValueChange={setLocalSearchTerm}
                      />
                      <CommandList>
                        <CommandEmpty>No users found.</CommandEmpty>
                        <CommandGroup className="max-h-64 overflow-auto">
                          {filteredUsers?.map(user => (
                            <CommandItem
                              key={user.id}
                              value={`${user.firstName} ${user.lastName} ${user.email}`}
                              onSelect={() => {
                                setSelectedUser(user)
                                setUserSearchOpen(false)
                              }}
                            >
                              <div className="flex items-center gap-3 w-full">
                                <Avatar className="w-8 h-8">
                                  <AvatarImage
                                    src={user.avatar || '/placeholder.svg'}
                                    alt={user.firstName}
                                  />
                                  <AvatarFallback>
                                    {user.firstName?.[0]}
                                    {user.lastName?.[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium">
                                    {user.firstName} {user.lastName}
                                  </div>
                                  <div className="text-sm text-gray-500">{user.email}</div>
                                  {user.jobTitle && user.company && (
                                    <div className="text-xs text-gray-400">
                                      {user.jobTitle} at {user.company}
                                    </div>
                                  )}
                                </div>
                                <Badge variant="outline" className="ml-2">
                                  {user.role?.name}
                                </Badge>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {selectedUser && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarImage
                        src={selectedUser.avatar || '/placeholder.svg'}
                        alt={selectedUser.firstName}
                      />
                      <AvatarFallback>
                        {selectedUser.firstName?.[0]}
                        {selectedUser.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-medium">
                        {selectedUser.firstName} {selectedUser.lastName}
                      </h4>
                      <p className="text-sm text-gray-500">{selectedUser.email}</p>
                      {selectedUser.jobTitle && selectedUser.company && (
                        <p className="text-xs text-gray-400">
                          {selectedUser.jobTitle} at {selectedUser.company}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* External Speaker Form */
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    placeholder="Speaker name"
                    value={externalSpeakerData.name}
                    onChange={e =>
                      setExternalSpeakerData(prev => ({ ...prev, name: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="speaker@example.com"
                    value={externalSpeakerData.email}
                    onChange={e =>
                      setExternalSpeakerData(prev => ({ ...prev, email: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="jobTitle">Job Title</Label>
                  <Input
                    id="jobTitle"
                    placeholder="CEO, CTO, etc."
                    value={externalSpeakerData.jobTitle}
                    onChange={e =>
                      setExternalSpeakerData(prev => ({ ...prev, jobTitle: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    placeholder="Company name"
                    value={externalSpeakerData.company}
                    onChange={e =>
                      setExternalSpeakerData(prev => ({ ...prev, company: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Speaker bio and background..."
                  rows={3}
                  value={externalSpeakerData.bio}
                  onChange={e => setExternalSpeakerData(prev => ({ ...prev, bio: e.target.value }))}
                />
              </div>
            </div>
          )}

          {/* Speaker Role */}
          <div>
            <Label htmlFor="role">Speaker Role</Label>
            <Select
              value={externalSpeakerData.role}
              onValueChange={value => setExternalSpeakerData(prev => ({ ...prev, role: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {SPEAKER_ROLES.map(role => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAddSpeaker}
              disabled={speakerType === 'internal' && !selectedUser}
              className="flex-1"
            >
              Add Speaker
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
