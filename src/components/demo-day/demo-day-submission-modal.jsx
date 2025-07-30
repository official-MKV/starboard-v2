// components/events/demo-day-submission-modal.jsx
'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import {
  Trophy,
  Upload,
  FileText,
  Link as LinkIcon,
  Video,
  Presentation,
  X,
  Loader2,
  AlertCircle,
  Check,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'

export function DemoDaySubmissionModal({ event, onClose, onSuccess }) {
  const { data: session } = useSession()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    projectTitle: '',
    description: '',
    category: '',
    stage: '',
    submissionUrl: '',
  })
  
  const [uploads, setUploads] = useState({
    video: { file: null, uploading: false, url: '', title: '' },
    presentation: { file: null, uploading: false, url: '', title: '' },
    businessPlan: { file: null, uploading: false, url: '', title: '' },
    demoLink: { url: '', title: '' },
  })

  // ✅ Add null checks for event
  if (!event || !event.id) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
            <DialogDescription>
              Event information is not available. Please try again.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={onClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  const demoDayConfig = event.demoDayConfig || {}

  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleFileSelect = async (type, file) => {
    if (!file) return

    // ✅ Check file size before upload (100MB limit for demo)
    const maxSize = 100 * 1024 * 1024 // 100MB
    if (file.size > maxSize) {
      toast.error(`File size must be less than ${maxSize / 1024 / 1024}MB`)
      return
    }

    setUploads(prev => ({
      ...prev,
      [type]: { ...prev[type], file, uploading: true }
    }))

    try {
      // ✅ Make sure event.id exists
      if (!event?.id) {
        throw new Error('Event ID is missing')
      }

      const response = await fetch('/api/upload/presigned-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size, // ✅ Include file size for validation
          folder: `demo-day/${event.id}/${type}`
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to get upload URL')
      }

      const { data } = await response.json()

      // ✅ Debug logging
      console.log('Upload URL received:', data)

      // ✅ Use the correct property name
      const uploadResponse = await fetch(data.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      })

      if (!uploadResponse.ok) {
        console.error('S3 Upload failed:', {
          status: uploadResponse.status,
          statusText: uploadResponse.statusText,
          headers: Object.fromEntries(uploadResponse.headers.entries())
        })
        throw new Error(`S3 upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`)
      }

      setUploads(prev => ({
        ...prev,
        [type]: {
          ...prev[type],
          uploading: false,
          url: data.fileUrl,
          title: file.name
        }
      }))

      toast.success(`${file.name} uploaded successfully`)
    } catch (error) {
      console.error('Upload error:', error)
      setUploads(prev => ({
        ...prev,
        [type]: { ...prev[type], uploading: false, file: null }
      }))
      toast.error(`Upload failed: ${error.message}`)
    }
  }

  const handleUrlChange = (type, field, value) => {
    setUploads(prev => ({
      ...prev,
      [type]: { ...prev[type], [field]: value }
    }))
  }

  const removeUpload = (type) => {
    setUploads(prev => ({
      ...prev,
      [type]: { file: null, uploading: false, url: '', title: '' }
    }))
  }

  const validateSubmission = () => {
    const errors = []

    if (!formData.projectTitle.trim()) {
      errors.push('Project title is required')
    }

    if (!formData.description.trim()) {
      errors.push('Project description is required')
    }

    // Check required uploads
    if (demoDayConfig?.requireVideo && !uploads.video.url) {
      errors.push('Pitch video is required')
    }

    if (demoDayConfig?.requirePresentation && !uploads.presentation.url) {
      errors.push('Presentation is required')
    }

    if (demoDayConfig?.requireDemo && !uploads.demoLink.url) {
      errors.push('Demo link is required')
    }

    if (demoDayConfig?.requireBusinessPlan && !uploads.businessPlan.url) {
      errors.push('Business plan is required')
    }

    return errors
  }

  const handleSubmit = async () => {
    const errors = validateSubmission()
    if (errors.length > 0) {
      toast.error(errors[0])
      return
    }

    // ✅ Final check for event.id
    if (!event?.id) {
      toast.error('Event ID is missing. Cannot submit.')
      return
    }

    setIsSubmitting(true)
    try {
      // Prepare resources array
      const resources = []
      
      if (uploads.video.url) {
        resources.push({
          type: 'VIDEO',
          title: uploads.video.title,
          url: uploads.video.url,
          description: 'Pitch video',
          order: 0,
        })
      }

      if (uploads.presentation.url) {
        resources.push({
          type: 'PRESENTATION',
          title: uploads.presentation.title,
          url: uploads.presentation.url,
          description: 'Project presentation',
          order: 1,
        })
      }

      if (uploads.demoLink.url) {
        resources.push({
          type: 'DEMO_LINK',
          title: uploads.demoLink.title || 'Demo Link',
          url: uploads.demoLink.url,
          description: 'Live demo or prototype',
          order: 2,
        })
      }

      if (uploads.businessPlan.url) {
        resources.push({
          type: 'BUSINESS_PLAN',
          title: uploads.businessPlan.title,
          url: uploads.businessPlan.url,
          description: 'Business plan document',
          order: 3,
        })
      }

      const submissionData = {
        eventId: event.id,
        projectTitle: formData.projectTitle.trim(),
        description: formData.description.trim(),
        category: formData.category.trim() || null,
        stage: formData.stage.trim() || null,
        submissionUrl: formData.submissionUrl.trim() || null,
        resources,
      }

      console.log('Submitting to:', `/api/events/${event.id}/demo-day/submissions`)
      console.log('Submission data:', submissionData)

      const response = await fetch(`/api/events/${event.id}/demo-day/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to submit')
      }

      toast.success('Submission created successfully!')
      onSuccess?.()
    } catch (error) {
      console.error('Submission error:', error)
      toast.error(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const UploadField = ({ type, label, icon: Icon, accept, required = false }) => {
    const upload = uploads[type]
    const isUploaded = !!upload.url
    const isUploading = upload.uploading

    return (
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Icon className="w-4 h-4" />
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
        
        {!isUploaded ? (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              type="file"
              accept={accept}
              onChange={(e) => handleFileSelect(type, e.target.files[0])}
              disabled={isUploading}
              className="hidden"
              id={`upload-${type}`}
            />
            <label htmlFor={`upload-${type}`} className="cursor-pointer">
              {isUploading ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Uploading...</span>
                </div>
              ) : (
                <div>
                  <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {accept}
                  </p>
                </div>
              )}
            </label>
          </div>
        ) : (
          <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">
                {upload.title}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeUpload(type)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    )
  }

  const DemoLinkField = ({ required = false }) => {
    return (
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <LinkIcon className="w-4 h-4" />
          Demo Link {required && <span className="text-red-500">*</span>}
        </Label>
        
        <div className="space-y-2">
          <Input
            placeholder="https://your-demo.com"
            value={uploads.demoLink.url}
            onChange={(e) => handleUrlChange('demoLink', 'url', e.target.value)}
          />
          <Input
            placeholder="Demo title (optional)"
            value={uploads.demoLink.title}
            onChange={(e) => handleUrlChange('demoLink', 'title', e.target.value)}
          />
        </div>
      </div>
    )
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Submit to {event.title}
          </DialogTitle>
          <DialogDescription>
            Submit your project for the demo day competition. Fill in all required information
            and upload your materials.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Instructions */}
          {demoDayConfig?.description && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{demoDayConfig.description}</AlertDescription>
            </Alert>
          )}

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Project Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="projectTitle">Project Title *</Label>
                <Input
                  id="projectTitle"
                  placeholder="Enter your project title"
                  value={formData.projectTitle}
                  onChange={(e) => handleFormChange('projectTitle', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="description">Project Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your project, what problem it solves, and how it works..."
                  rows={4}
                  value={formData.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    placeholder="e.g., FinTech, HealthTech, AI"
                    value={formData.category}
                    onChange={(e) => handleFormChange('category', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="stage">Stage</Label>
                  <Input
                    id="stage"
                    placeholder="e.g., MVP, Beta, Launched"
                    value={formData.stage}
                    onChange={(e) => handleFormChange('stage', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="submissionUrl">Main Project URL</Label>
                <Input
                  id="submissionUrl"
                  placeholder="https://your-project.com"
                  value={formData.submissionUrl}
                  onChange={(e) => handleFormChange('submissionUrl', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Submission Materials */}
          <Card>
            <CardHeader>
              <CardTitle>Submission Materials</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {demoDayConfig?.requireVideo && (
                <UploadField
                  type="video"
                  label="Pitch Video"
                  icon={Video}
                  accept="video/*"
                  required
                />
              )}

              {demoDayConfig?.requirePresentation && (
                <UploadField
                  type="presentation"
                  label="Presentation"
                  icon={Presentation}
                  accept=".pdf,.ppt,.pptx"
                  required
                />
              )}

              {demoDayConfig?.requireDemo && (
                <DemoLinkField required />
              )}

              {demoDayConfig?.requireBusinessPlan && (
                <UploadField
                  type="businessPlan"
                  label="Business Plan"
                  icon={FileText}
                  accept=".pdf,.doc,.docx"
                  required
                />
              )}
            </CardContent>
          </Card>

          {/* Submission Deadline Notice */}
          {demoDayConfig?.submissionDeadline && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Submission Deadline:</strong>{' '}
                {new Date(demoDayConfig.submissionDeadline).toLocaleString()}
                <br />
                Make sure to submit before the deadline. Late submissions may not be accepted.
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting || Object.values(uploads).some(upload => upload.uploading)}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Trophy className="w-4 h-4 mr-2" />
                  Submit Project
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}