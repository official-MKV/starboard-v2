"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import {
  MapPin,
  Users,
  Plus,
  ChevronLeft,
  ChevronRight,
  Trash2,
  User,
  UserPlus,
  Loader2,
  Trophy,
  Calendar,
  Globe,
  Settings,
  Target,
  Trash,
  Upload,
  X,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "sonner"

const EVENT_TYPES = [
  { value: "WORKSHOP", label: "Workshop" },
  { value: "MENTORING", label: "Mentoring" },
  { value: "PITCH", label: "Pitch Session" },
  { value: "NETWORKING", label: "Networking" },
  { value: "DEMO_DAY", label: "Hackathon" },
  { value: "BOOTCAMP", label: "Bootcamp" },
  { value: "WEBINAR", label: "Webinar" },
  { value: "OTHER", label: "Other" },
]

const SPEAKER_ROLES = [
  { value: "SPEAKER", label: "Speaker" },
  { value: "HOST", label: "Host" },
  { value: "MODERATOR", label: "Moderator" },
  { value: "PANELIST", label: "Panelist" },
  { value: "KEYNOTE", label: "Keynote Speaker" },
  { value: "FACILITATOR", label: "Facilitator" },
]

const CriterionItem = ({ criterion, onUpdate, onRemove }) => {
  const handleLabelChange = useCallback(
    (e) => {
      onUpdate(criterion.id, { label: e.target.value })
    },
    [criterion.id, onUpdate],
  )

  const handleWeightChange = useCallback(
    (e) => {
      onUpdate(criterion.id, { weight: Number.parseInt(e.target.value) || 0 })
    },
    [criterion.id, onUpdate],
  )

  const handleDescriptionChange = useCallback(
    (e) => {
      onUpdate(criterion.id, { description: e.target.value })
    },
    [criterion.id, onUpdate],
  )

  const handleRemove = useCallback(() => {
    onRemove(criterion.id)
  }, [criterion.id, onRemove])

  return (
    <div className="p-4 border rounded-lg space-y-3 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 grid gap-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label htmlFor={`label-${criterion.id}`} className="text-sm">
                Criterion Name *
              </Label>
              <Input
                id={`label-${criterion.id}`}
                placeholder="e.g., Innovation"
                value={criterion.label}
                onChange={handleLabelChange}
              />
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label htmlFor={`weight-${criterion.id}`} className="text-sm">
                  Weight
                </Label>
                <Input
                  id={`weight-${criterion.id}`}
                  type="number"
                  min="0"
                  max="100"
                  value={criterion.weight}
                  onChange={handleWeightChange}
                />
              </div>
              <span className="text-sm text-gray-500">%</span>
            </div>
          </div>
          <div>
            <Label htmlFor={`description-${criterion.id}`} className="text-sm">
              Description
            </Label>
            <Textarea
              id={`description-${criterion.id}`}
              placeholder="Describe what this criterion evaluates..."
              rows={2}
              value={criterion.description}
              onChange={handleDescriptionChange}
            />
          </div>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={handleRemove} className="shrink-0 mt-1">
          <Trash className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}

function useEventSpeakers() {
  const [speakers, setSpeakers] = useState([])

  const addSpeaker = useCallback((speakerData) => {
    setSpeakers((prev) => {
      const isDuplicate = prev.some(
        (speaker) => speaker.email === speakerData.email || (speaker.userId && speaker.userId === speakerData.userId),
      )
      if (isDuplicate) {
        toast.error("Speaker already added to this event")
        return prev
      }
      const newSpeaker = {
        ...speakerData,
        id: `temp-${Date.now()}-${Math.random()}`,
      }
      return [...prev, newSpeaker]
    })
  }, [])

  const removeSpeaker = useCallback((speakerId) => {
    setSpeakers((prev) => prev.filter((speaker) => speaker.id !== speakerId))
  }, [])

  return {
    speakers,
    setSpeakers,
    addSpeaker,
    removeSpeaker,
  }
}

function useHackathonConfig() {
  const [judgingCriteria, setJudgingCriteria] = useState([
    { id: "innovation", label: "Innovation", description: "Uniqueness and creativity of the solution", weight: 25 },
    {
      id: "execution",
      label: "Execution",
      description: "Quality of implementation and development progress",
      weight: 25,
    },
    { id: "marketSize", label: "Market Size", description: "Size and potential of the target market", weight: 25 },
    {
      id: "presentation",
      label: "Presentation",
      description: "Quality and clarity of the pitch presentation",
      weight: 25,
    },
  ])

  const addCriterion = useCallback(() => {
    const newCriterion = {
      id: `criterion-${Date.now()}`,
      label: "",
      description: "",
      weight: 0,
    }
    setJudgingCriteria((prev) => [...prev, newCriterion])
  }, [])

  const removeCriterion = useCallback((criterionId) => {
    setJudgingCriteria((prev) => prev.filter((criterion) => criterion.id !== criterionId))
  }, [])

  const updateCriterion = useCallback((criterionId, updates) => {
    setJudgingCriteria((prev) =>
      prev.map((criterion) => (criterion.id === criterionId ? { ...criterion, ...updates } : criterion)),
    )
  }, [])

  const getTotalWeight = useCallback(() => {
    return judgingCriteria.reduce((sum, criterion) => sum + (criterion.weight || 0), 0)
  }, [judgingCriteria])

  return {
    judgingCriteria,
    setJudgingCriteria,
    addCriterion,
    removeCriterion,
    updateCriterion,
    getTotalWeight,
  }
}

export function CreateEventForm({ eventId, onSuccess, onCancel }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [accessRules, setAccessRules] = useState([])
  const [isAddingSpeaker, setIsAddingSpeaker] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [bannerPreview, setBannerPreview] = useState(null)
  const [validationErrors, setValidationErrors] = useState({})

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "WORKSHOP",
    bannerImage: null,
    startDate: "",
    endDate: "",
    isVirtual: false,
    location: "",
    isPublic: false,
    maxAttendees: "",
    waitingRoom: true,
    autoRecord: false,
    agenda: "",
    instructions: "",
    demoDayConfig: {
      submissionDeadline: "",
      allowLateSubmissions: false,
      maxTeamSize: 5,
      maxPitchDuration: 5,
      requireVideo: true,
      requirePresentation: true,
      requireDemo: false,
      requireBusinessPlan: false,
      judgingStartTime: "",
      judgingEndTime: "",
      maxScore: 50,
      showResultsLive: false,
      resultsPublicAt: "",
      showJudgeNames: true,
      showDetailedScores: false,
      description: "",
    },
  })

  const { speakers, setSpeakers, addSpeaker, removeSpeaker } = useEventSpeakers()
  const { judgingCriteria, setJudgingCriteria, addCriterion, removeCriterion, updateCriterion, getTotalWeight } =
    useHackathonConfig()

  const isHackathon = formData.type === "DEMO_DAY"

  // Date validation for hackathon
  const validateDates = useCallback(() => {
    const errors = {}

    if (isHackathon && formData.startDate && formData.endDate && formData.demoDayConfig.submissionDeadline) {
      // Convert to timestamps for reliable comparison
      const startTime = new Date(formData.startDate).getTime()
      const endTime = new Date(formData.endDate).getTime()
      const submissionTime = new Date(formData.demoDayConfig.submissionDeadline).getTime()

      if (submissionTime < startTime) {
        errors.submissionDeadline = "Submission deadline cannot be before event start date"
      }

      if (submissionTime > endTime) {
        errors.submissionDeadline = "Submission deadline cannot be after event end date"
      }
    }

    if (formData.startDate && formData.endDate) {
      const startTime = new Date(formData.startDate).getTime()
      const endTime = new Date(formData.endDate).getTime()

      if (endTime <= startTime) {
        errors.endDate = "End date must be after start date"
      }
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }, [isHackathon, formData.startDate, formData.endDate, formData.demoDayConfig.submissionDeadline])

  useEffect(() => {
    validateDates()
  }, [validateDates])

  useEffect(() => {
    if (eventId) {
      setIsLoading(true)
      fetch(`/api/events/${eventId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data?.data?.event) {
            const event = data.data.event
            setFormData((prev) => ({
              ...prev,
              ...event,
              startDate: event.startDate ? new Date(event.startDate).toISOString().slice(0, 16) : "",
              endDate: event.endDate ? new Date(event.endDate).toISOString().slice(0, 16) : "",
              maxAttendees: event.maxAttendees?.toString() || "",
              demoDayConfig: event.demoDayConfig
                ? {
                    ...prev.demoDayConfig,
                    ...event.demoDayConfig,
                    submissionDeadline: event.demoDayConfig.submissionDeadline
                      ? new Date(event.demoDayConfig.submissionDeadline).toISOString().slice(0, 16)
                      : "",
                    judgingStartTime: event.demoDayConfig.judgingStartTime
                      ? new Date(event.demoDayConfig.judgingStartTime).toISOString().slice(0, 16)
                      : "",
                    judgingEndTime: event.demoDayConfig.judgingEndTime
                      ? new Date(event.demoDayConfig.judgingEndTime).toISOString().slice(0, 16)
                      : "",
                  }
                : prev.demoDayConfig,
            }))
            setSpeakers(event.speakers || [])
            setAccessRules(event.accessRules || [])
            if (event.bannerImage) {
              setBannerPreview(event.bannerImage)
            }
            if (event.demoDayConfig?.scoringCriteria) {
              const existingCriteria = Object.entries(event.demoDayConfig.scoringCriteria).map(([key, weight]) => ({
                id: key,
                label: key.charAt(0).toUpperCase() + key.slice(1),
                description: "",
                weight: weight || 0,
              }))
              setJudgingCriteria(existingCriteria)
            }
          }
        })
        .catch((err) => console.error("Error loading event:", err))
        .finally(() => setIsLoading(false))
    }
  }, [eventId])

  const updateFormData = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }, [])

  const updateDemoDayConfig = useCallback((field, value) => {
    setFormData((prev) => ({
      ...prev,
      demoDayConfig: { ...prev.demoDayConfig, [field]: value },
    }))
  }, [])

  const handleBannerUpload = useCallback(
    (e) => {
      const file = e.target.files?.[0]
      if (file) {
        // Validate file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
          toast.error("Banner image must be less than 5MB")
          return
        }

        // Validate file type
        if (!file.type.startsWith("image/")) {
          toast.error("Please select a valid image file")
          return
        }

        const reader = new FileReader()
        reader.onload = (e) => {
          setBannerPreview(e.target?.result)
          updateFormData("bannerImage", file) // Store the actual File object
        }
        reader.onerror = () => {
          toast.error("Failed to read image file")
        }
        reader.readAsDataURL(file)
      }
    },
    [updateFormData],
  )

  const removeBanner = useCallback(() => {
    setBannerPreview(null)
    updateFormData("bannerImage", null)
  }, [updateFormData])

  const getSteps = useMemo(() => {
    const baseSteps = [
      { title: "Basic Info", description: "Event details" },
      { title: "Date & Location", description: "When & where" },
    ]
    if (!isHackathon) {
      baseSteps.push({ title: "Speakers", description: "Add presenters" })
    }
    if (isHackathon) {
      baseSteps.push({ title: "Hackathon Setup", description: "Configure judging" })
    }
    baseSteps.push({ title: "Settings", description: "Access & settings" })
    return baseSteps
  }, [isHackathon])

  const canGoNext = useMemo(() => {
    switch (currentStep) {
      case 0:
        return formData.title.trim().length > 0 && formData.type
      case 1:
        return (
          formData.startDate.trim().length > 0 &&
          formData.endDate.trim().length > 0 &&
          Object.keys(validationErrors).length === 0
        )
      case 2:
        if (isHackathon) {
          return formData.demoDayConfig.submissionDeadline.trim().length > 0 && !validationErrors.submissionDeadline
        }
        return true
      case 3:
        return true
      default:
        return false
    }
  }, [
    currentStep,
    formData.title,
    formData.type,
    formData.startDate,
    formData.endDate,
    formData.demoDayConfig.submissionDeadline,
    isHackathon,
    validationErrors,
  ])

  const handleNext = useCallback(() => {
    if (canGoNext) {
      setCurrentStep((prev) => Math.min(getSteps.length - 1, prev + 1))
    } else {
      toast.error("Please fill in all required fields and fix any validation errors before continuing")
    }
  }, [canGoNext, getSteps.length])

  const handlePrevious = useCallback(() => {
    setCurrentStep((prev) => Math.max(0, prev - 1))
  }, [])

  const handleSubmit = useCallback(async () => {
    if (isHackathon) {
      const totalWeight = getTotalWeight()
      if (totalWeight !== 100) {
        toast.error("Judging criteria weights must add up to 100%")
        return
      }
      if (judgingCriteria.some((criterion) => !criterion.label)) {
        toast.error("All judging criteria must have labels")
        return
      }
    }

    if (!validateDates()) {
      toast.error("Please fix date validation errors before submitting")
      return
    }

    setIsLoading(true)
    try {
      let bannerImageUrl = null
 
      if (formData.bannerImage && formData.bannerImage instanceof File) {
        toast.loading("Uploading banner image...")

        try {
         
          const presignedResponse = await fetch("/api/upload/presigned-url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileName: formData.bannerImage.name,
              fileType: formData.bannerImage.type,
              fileSize: formData.bannerImage.size,
            }),
          })

          if (!presignedResponse.ok) {
            throw new Error("Failed to get upload URL")
          }

          const { uploadUrl, fileUrl } = await presignedResponse.json()

          // Upload file to presigned URL
          const uploadResponse = await fetch(uploadUrl, {
            method: "PUT",
            body: formData.bannerImage,
            headers: {
              "Content-Type": formData.bannerImage.type,
            },
          })

          if (!uploadResponse.ok) {
            throw new Error("Failed to upload banner image")
          }

          bannerImageUrl = fileUrl
          toast.dismiss()
          toast.success("Banner image uploaded successfully")
        } catch (uploadError) {
          toast.dismiss()
          toast.error(`Banner upload failed: ${uploadError.message}`)
          setIsLoading(false)
          return
        }
      } else if (typeof formData.bannerImage === "string") {
       
        bannerImageUrl = formData.bannerImage
      }

      const payload = {
        ...formData,
        bannerImage: bannerImageUrl,
        maxAttendees: formData.maxAttendees ? Number.parseInt(formData.maxAttendees) : null,
        speakers: isHackathon ? [] : speakers,
        accessRules,
      }

      if (isHackathon) {
        const scoringCriteria = {}
        judgingCriteria.forEach((criterion) => {
          if (criterion.label) {
            scoringCriteria[criterion.id] = criterion.weight
          }
        })
        payload.demoDayConfig = {
          ...formData.demoDayConfig,
          scoringCriteria,
        }
      }

      const url = eventId ? `/api/events/${eventId}` : "/api/events"
      const method = eventId ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || "Failed to save event")
      }

      toast.success(eventId ? "Event updated successfully" : "Event created successfully")
      onSuccess?.()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }, [isHackathon, getTotalWeight, judgingCriteria, formData, speakers, accessRules, eventId, onSuccess, validateDates])

  const BasicInfoStep = useMemo(
    () => (
      <div className="space-y-6">
        <div>
          <Label>Event Title *</Label>
          <Input
            placeholder="Enter event title"
            value={formData.title}
            onChange={(e) => updateFormData("title", e.target.value)}
          />
        </div>

        <div>
          <Label>Description</Label>
          <Textarea
            placeholder="Describe your event..."
            rows={4}
            value={formData.description}
            onChange={(e) => updateFormData("description", e.target.value)}
          />
        </div>

        <div>
          <Label>Event Type *</Label>
          <Select value={formData.type} onValueChange={(value) => updateFormData("type", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select event type" />
            </SelectTrigger>
            <SelectContent>
              {EVENT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  <div className="flex items-center gap-2">
                    {type.value === "DEMO_DAY" && <Trophy className="w-4 h-4" />}
                    {type.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Event Banner (Optional)</Label>
          <div className="mt-2">
            {bannerPreview ? (
              <div className="relative">
                <img
                  src={bannerPreview || "/placeholder.svg"}
                  alt="Banner preview"
                  className="w-full h-48 object-cover rounded-lg border"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={removeBanner}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600 mb-2">Upload a banner image for your event</p>
                <Input type="file" accept="image/*" onChange={handleBannerUpload} className="max-w-xs mx-auto" />
                <p className="text-xs text-gray-500 mt-1">Max size: 5MB. Recommended: 1200x400px</p>
              </div>
            )}
          </div>
        </div>
      </div>
    ),
    [
      formData.title,
      formData.description,
      formData.type,
      bannerPreview,
      updateFormData,
      handleBannerUpload,
      removeBanner,
    ],
  )

  const DateLocationStep = useMemo(
    () => (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Date & Time
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Start Date & Time *</Label>
                <Input
                  type="datetime-local"
                  value={formData.startDate}
                  onChange={(e) => updateFormData("startDate", e.target.value)}
                />
              </div>
              <div>
                <Label>End Date & Time *</Label>
                <Input
                  type="datetime-local"
                  value={formData.endDate}
                  onChange={(e) => updateFormData("endDate", e.target.value)}
                />
                {validationErrors.endDate && <p className="text-sm text-red-600 mt-1">{validationErrors.endDate}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label className="text-base">Virtual Event</Label>
                <p className="text-sm text-gray-600">This event will be held online with auto-generated meeting link</p>
              </div>
              <Switch
                checked={formData.isVirtual}
                onCheckedChange={(checked) => updateFormData("isVirtual", checked)}
              />
            </div>

            {!formData.isVirtual && (
              <div>
                <Label>Location</Label>
                <Input
                  placeholder="Enter event location"
                  value={formData.location}
                  onChange={(e) => updateFormData("location", e.target.value)}
                />
                <p className="text-sm text-gray-600 mt-1">Full address or venue name</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    ),
    [formData.startDate, formData.endDate, formData.isVirtual, formData.location, updateFormData, validationErrors],
  )

  const SpeakersStep = useMemo(
    () => (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Event Speakers
              </div>
              <Button onClick={() => setIsAddingSpeaker(true)} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Speaker
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {speakers.length === 0 ? (
              <div className="text-center py-8 text-gray-600">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No speakers added yet</p>
                <p className="text-sm">Add speakers to showcase your event presenters</p>
              </div>
            ) : (
              <div className="space-y-4">
                {speakers.map((speaker) => (
                  <div key={speaker.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={speaker.avatar || ""} alt={speaker.name} />
                        <AvatarFallback>
                          {speaker.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-medium">{speaker.name}</h4>
                        <p className="text-sm text-gray-600">{speaker.email}</p>
                        {speaker.jobTitle && speaker.company && (
                          <p className="text-xs text-gray-400">
                            {speaker.jobTitle} at {speaker.company}
                          </p>
                        )}
                        <Badge variant="outline" className="mt-1">
                          {SPEAKER_ROLES.find((role) => role.value === speaker.role)?.label || speaker.role}
                        </Badge>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeSpeaker(speaker.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    ),
    [speakers, removeSpeaker],
  )

  const HackathonSetupStep = useMemo(() => {
    const totalWeight = getTotalWeight()
    const submissionDeadlineDate = formData.demoDayConfig.submissionDeadline
      ? new Date(formData.demoDayConfig.submissionDeadline).toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : null

    return (
      <div className="space-y-6">
        <div className="text-center mb-6">
          <Trophy className="w-12 h-12 text-yellow-500 mx-auto mb-2" />
          <h3 className="text-lg font-semibold">Hackathon Configuration</h3>
          <p className="text-gray-600">Set up submission and judging parameters</p>
        </div>

        {submissionDeadlineDate && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Submission Deadline:</strong> {submissionDeadlineDate}
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Submission Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label>Submission Deadline *</Label>
                <Input
                  type="datetime-local"
                  value={formData.demoDayConfig.submissionDeadline}
                  onChange={(e) => updateDemoDayConfig("submissionDeadline", e.target.value)}
                />
                {validationErrors.submissionDeadline && (
                  <p className="text-sm text-red-600 mt-1">{validationErrors.submissionDeadline}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">Must be between event start and end dates</p>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label className="text-base">Allow Late Submissions</Label>
                <p className="text-sm text-gray-600">Allow submissions after the deadline</p>
              </div>
              <Switch
                checked={formData.demoDayConfig.allowLateSubmissions}
                onCheckedChange={(checked) => updateDemoDayConfig("allowLateSubmissions", checked)}
              />
            </div>

            <div>
              <Label className="text-sm font-medium mb-3 block">Required Submission Components</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.demoDayConfig.requireVideo}
                    onCheckedChange={(checked) => updateDemoDayConfig("requireVideo", checked)}
                  />
                  <Label>Pitch Video</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.demoDayConfig.requirePresentation}
                    onCheckedChange={(checked) => updateDemoDayConfig("requirePresentation", checked)}
                  />
                  <Label>Presentation</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.demoDayConfig.requireDemo}
                    onCheckedChange={(checked) => updateDemoDayConfig("requireDemo", checked)}
                  />
                  <Label>Live Demo</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.demoDayConfig.requireBusinessPlan}
                    onCheckedChange={(checked) => updateDemoDayConfig("requireBusinessPlan", checked)}
                  />
                  <Label>Business Plan</Label>
                </div>
              </div>
            </div>

            <div>
              <Label>Instructions for Participants</Label>
              <Textarea
                placeholder="Provide detailed instructions for participants on what to prepare, how to submit, and what judges will be looking for..."
                rows={4}
                value={formData.demoDayConfig.description}
                onChange={(e) => updateDemoDayConfig("description", e.target.value)}
              />
              <p className="text-sm text-gray-600 mt-1">
                These instructions will be shown to participants on the submission page
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Judging Criteria
              </div>
              <Button onClick={addCriterion} size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Criterion
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {judgingCriteria.map((criterion) => (
              <CriterionItem
                key={criterion.id}
                criterion={criterion}
                onUpdate={updateCriterion}
                onRemove={removeCriterion}
              />
            ))}
            <div
              className={`p-3 rounded-lg ${
                totalWeight === 100
                  ? "bg-green-50 border border-green-200 text-green-800"
                  : "bg-red-50 border border-red-200 text-red-800"
              }`}
            >
              <p className="text-sm font-medium">
                Total Weight: {totalWeight}% {totalWeight === 100 ? "✓" : "(Must equal 100%)"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }, [
    formData.demoDayConfig,
    updateDemoDayConfig,
    judgingCriteria,
    addCriterion,
    updateCriterion,
    removeCriterion,
    getTotalWeight,
    validationErrors,
  ])

  const AccessSettingsStep = useMemo(
    () => (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Event Visibility
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label className="text-base">Public Event</Label>
                <p className="text-sm text-gray-600">Anyone can see and register for this event</p>
              </div>
              <Switch checked={formData.isPublic} onCheckedChange={(checked) => updateFormData("isPublic", checked)} />
            </div>

            <div>
              <Label>Maximum Attendees</Label>
              <Input
                type="number"
                placeholder="Leave empty for unlimited"
                value={formData.maxAttendees}
                onChange={(e) => updateFormData("maxAttendees", e.target.value)}
              />
              <p className="text-sm text-gray-600 mt-1">Set a limit on the number of attendees</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Event Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label className="text-base">Waiting Room</Label>
                <p className="text-sm text-gray-600">Enable waiting room for virtual events</p>
              </div>
              <Switch
                checked={formData.waitingRoom}
                onCheckedChange={(checked) => updateFormData("waitingRoom", checked)}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label className="text-base">Auto Record</Label>
                <p className="text-sm text-gray-600">Automatically record the event</p>
              </div>
              <Switch
                checked={formData.autoRecord}
                onCheckedChange={(checked) => updateFormData("autoRecord", checked)}
              />
            </div>

            <div>
              <Label>Agenda</Label>
              <Textarea
                placeholder="Event agenda and schedule..."
                rows={4}
                value={formData.agenda}
                onChange={(e) => updateFormData("agenda", e.target.value)}
              />
              <p className="text-sm text-gray-600 mt-1">Detailed agenda for attendees</p>
            </div>

            <div>
              <Label>Instructions</Label>
              <Textarea
                placeholder="Special instructions for attendees..."
                rows={3}
                value={formData.instructions}
                onChange={(e) => updateFormData("instructions", e.target.value)}
              />
              <p className="text-sm text-gray-600 mt-1">Any special instructions for attendees</p>
            </div>
          </CardContent>
        </Card>
      </div>
    ),
    [
      formData.isPublic,
      formData.maxAttendees,
      formData.waitingRoom,
      formData.autoRecord,
      formData.agenda,
      formData.instructions,
      updateFormData,
    ],
  )

  const getCurrentStepComponent = useMemo(() => {
    switch (currentStep) {
      case 0:
        return BasicInfoStep
      case 1:
        return DateLocationStep
      case 2:
        return isHackathon ? HackathonSetupStep : SpeakersStep
      case 3:
        return AccessSettingsStep
      default:
        return BasicInfoStep
    }
  }, [currentStep, isHackathon, BasicInfoStep, DateLocationStep, HackathonSetupStep, SpeakersStep, AccessSettingsStep])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl w-full">
      <div className="space-y-8">
        <div className="flex items-center justify-center">
          <div className="flex items-center space-x-4">
            {getSteps.map((step, index) => (
              <div key={index} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center font-medium text-sm transition-colors
                      ${
                        index === currentStep
                          ? "bg-blue-600 text-white"
                          : index < currentStep
                            ? "bg-green-500 text-white"
                            : "bg-gray-200 text-gray-600"
                      }
                    `}
                  >
                    {index < currentStep ? "✓" : index + 1}
                  </div>
                  <div className="mt-2 text-center">
                    <div className={`text-sm font-medium ${index === currentStep ? "text-gray-900" : "text-gray-500"}`}>
                      {step.title}
                    </div>
                    <div className="text-xs text-gray-500 hidden sm:block">{step.description}</div>
                  </div>
                </div>
                {index < getSteps.length - 1 && (
                  <div
                    className={`
                      w-12 h-0.5 mx-4 transition-colors
                      ${index < currentStep ? "bg-green-500" : "bg-gray-200"}
                    `}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="min-h-[400px] bg-white p-6 rounded-lg shadow-sm border">{getCurrentStepComponent}</div>

        <div className="flex items-center justify-between pt-6 border-t">
          <Button variant="outline" onClick={handlePrevious} disabled={currentStep === 0}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            {currentStep === getSteps.length - 1 ? (
              <Button onClick={handleSubmit} disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {eventId ? "Update Event" : "Create Event"}
              </Button>
            ) : (
              <Button onClick={handleNext} disabled={!canGoNext}>
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {isAddingSpeaker && (
        <AddSpeakerModal
          onClose={() => setIsAddingSpeaker(false)}
          onAdd={(speaker) => {
            addSpeaker(speaker)
            setIsAddingSpeaker(false)
          }}
        />
      )}
    </div>
  )
}

function AddSpeakerModal({ onClose, onAdd }) {
  const [speakerType, setSpeakerType] = useState("internal")
  const [selectedUser, setSelectedUser] = useState(null)
  const [userSearchOpen, setUserSearchOpen] = useState(false)
  const [localSearchTerm, setLocalSearchTerm] = useState("")
  const [externalSpeakerData, setExternalSpeakerData] = useState({
    name: "",
    email: "",
    bio: "",
    company: "",
    jobTitle: "",
    role: "SPEAKER",
  })
  const [workspaceMembers, setWorkspaceMembers] = useState([])
  const [isLoadingMembers, setIsLoadingMembers] = useState(false)

  useEffect(() => {
    if (speakerType === "internal") {
      setIsLoadingMembers(true)
      fetch("/api/workspaces/members")
        .then((res) => res.json())
        .then((data) => setWorkspaceMembers(data.members || []))
        .catch((err) => console.error(err))
        .finally(() => setIsLoadingMembers(false))
    }
  }, [speakerType])

  const filteredUsers = useMemo(() => {
    const members = workspaceMembers || []
    if (!localSearchTerm) return members
    const search = localSearchTerm.toLowerCase()
    return members.filter(
      (member) =>
        `${member.user.firstName} ${member.user.lastName}`.toLowerCase().includes(search) ||
        member.user.email.toLowerCase().includes(search) ||
        member.role?.name.toLowerCase().includes(search),
    )
  }, [workspaceMembers, localSearchTerm])

  const handleAddSpeaker = useCallback(() => {
    if (speakerType === "internal") {
      if (!selectedUser) {
        toast.error("Please select a user")
        return
      }
      const speaker = {
        userId: selectedUser.user.id,
        name: `${selectedUser.user.firstName} ${selectedUser.user.lastName}`,
        email: selectedUser.user.email,
        avatar: selectedUser.user.avatar,
        company: selectedUser.user.company,
        jobTitle: selectedUser.user.jobTitle,
        role: externalSpeakerData.role,
        isExternal: false,
        isConfirmed: true,
      }
      onAdd(speaker)
    } else {
      if (!externalSpeakerData.name?.trim()) {
        toast.error("Speaker name is required")
        return
      }
      const speaker = {
        ...externalSpeakerData,
        isExternal: true,
        isConfirmed: false,
      }
      onAdd(speaker)
    }
  }, [speakerType, selectedUser, externalSpeakerData, onAdd])

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Speaker</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="flex gap-2">
            <Button
              variant={speakerType === "internal" ? "default" : "outline"}
              onClick={() => setSpeakerType("internal")}
              className="flex-1"
            >
              <User className="w-4 h-4 mr-2" />
              Internal User
            </Button>
            <Button
              variant={speakerType === "external" ? "default" : "outline"}
              onClick={() => setSpeakerType("external")}
              className="flex-1"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              External Speaker
            </Button>
          </div>

          {speakerType === "internal" ? (
            <div className="space-y-4">
              <div>
                <Label>Select User</Label>
                <Popover open={userSearchOpen} onOpenChange={setUserSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between bg-transparent"
                      disabled={isLoadingMembers}
                    >
                      {isLoadingMembers ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Loading members...
                        </div>
                      ) : selectedUser ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={selectedUser.user.avatar || ""} alt={selectedUser.user.firstName} />
                            <AvatarFallback>
                              {selectedUser.user.firstName?.[0]}
                              {selectedUser.user.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          {selectedUser.user.firstName} {selectedUser.user.lastName}
                        </div>
                      ) : (
                        "Select a workspace member..."
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput
                        placeholder="Search users..."
                        value={localSearchTerm}
                        onValueChange={setLocalSearchTerm}
                      />
                      <CommandList>
                        {filteredUsers?.length === 0 ? (
                          <CommandEmpty>No users found.</CommandEmpty>
                        ) : (
                          <CommandGroup className="max-h-64 overflow-auto">
                            {filteredUsers?.map((member) => (
                              <CommandItem
                                key={member.id}
                                onSelect={() => {
                                  setSelectedUser(member)
                                  setUserSearchOpen(false)
                                }}
                              >
                                <div className="flex items-center gap-3 w-full">
                                  <Avatar className="w-8 h-8">
                                    <AvatarImage src={member.user.avatar || ""} alt={member.user.firstName} />
                                    <AvatarFallback>
                                      {member.user.firstName?.[0]}
                                      {member.user.lastName?.[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1">
                                    <div className="font-medium">
                                      {member.user.firstName} {member.user.lastName}
                                    </div>
                                    <div className="text-sm text-gray-600">{member.user.email}</div>
                                  </div>
                                  <Badge variant="outline">{member.role?.name}</Badge>
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
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Name *</Label>
                  <Input
                    placeholder="Speaker name"
                    value={externalSpeakerData.name}
                    onChange={(e) => setExternalSpeakerData((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="speaker@example.com"
                    value={externalSpeakerData.email}
                    onChange={(e) => setExternalSpeakerData((prev) => ({ ...prev, email: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Job Title</Label>
                  <Input
                    placeholder="CEO, CTO, etc."
                    value={externalSpeakerData.jobTitle}
                    onChange={(e) => setExternalSpeakerData((prev) => ({ ...prev, jobTitle: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Company</Label>
                  <Input
                    placeholder="Company name"
                    value={externalSpeakerData.company}
                    onChange={(e) => setExternalSpeakerData((prev) => ({ ...prev, company: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label>Bio</Label>
                <Textarea
                  placeholder="Speaker bio and background..."
                  rows={3}
                  value={externalSpeakerData.bio}
                  onChange={(e) => setExternalSpeakerData((prev) => ({ ...prev, bio: e.target.value }))}
                />
              </div>
            </div>
          )}

          <div>
            <Label>Speaker Role</Label>
            <Select
              value={externalSpeakerData.role}
              onValueChange={(value) => setExternalSpeakerData((prev) => ({ ...prev, role: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {SPEAKER_ROLES.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1 bg-transparent">
              Cancel
            </Button>
            <Button
              onClick={handleAddSpeaker}
              disabled={speakerType === "internal" && !selectedUser}
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
