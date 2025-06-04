'use client'

import { useState } from 'react'
import { Upload, X, File, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const RESOURCE_TYPES = [
  { value: 'FILE', label: 'File' },
  { value: 'DOCUMENT', label: 'Document' },
  { value: 'PRESENTATION', label: 'Presentation' },
  { value: 'SPREADSHEET', label: 'Spreadsheet' },
  { value: 'IMAGE', label: 'Image' },
  { value: 'VIDEO', label: 'Video' },
  { value: 'LINK', label: 'Link' },
  { value: 'OTHER', label: 'Other' },
]

export function ResourceUploadDialog({ eventId, onSuccess }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [currentTag, setCurrentTag] = useState('')
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'FILE',
    category: '',
    isPublic: false,
    tags: [],
  })
  const [errors, setErrors] = useState({})

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null,
      }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    } else if (formData.title.length > 100) {
      newErrors.title = 'Title too long'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const onSubmit = async e => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    try {
      const submitFormData = new FormData()

      // Add form fields
      submitFormData.append('title', formData.title)
      if (formData.description) submitFormData.append('description', formData.description)
      submitFormData.append('type', formData.type)
      submitFormData.append('isPublic', formData.isPublic.toString())
      submitFormData.append('tags', JSON.stringify(formData.tags))
      if (formData.category) submitFormData.append('category', formData.category)

      // Add file if selected
      if (selectedFile) {
        submitFormData.append('file', selectedFile)
      }

      // Choose endpoint based on whether this is for an event
      const endpoint = eventId ? `/api/events/${eventId}/resources` : '/api/resources'

      const response = await fetch(endpoint, {
        method: 'POST',
        body: submitFormData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to upload resource')
      }

      toast.success('Resource uploaded successfully')
      onSuccess?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload resource')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFileSelect = event => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)

      // Auto-fill title from filename if empty
      if (!formData.title) {
        const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, '')
        handleInputChange('title', nameWithoutExtension)
      }

      // Auto-detect type based on file
      const extension = file.name.split('.').pop()?.toLowerCase()
      if (extension) {
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
          handleInputChange('type', 'IMAGE')
        } else if (['mp4', 'mov', 'avi', 'mkv'].includes(extension)) {
          handleInputChange('type', 'VIDEO')
        } else if (['pdf', 'doc', 'docx', 'txt'].includes(extension)) {
          handleInputChange('type', 'DOCUMENT')
        } else if (['ppt', 'pptx'].includes(extension)) {
          handleInputChange('type', 'PRESENTATION')
        } else if (['xls', 'xlsx', 'csv'].includes(extension)) {
          handleInputChange('type', 'SPREADSHEET')
        }
      }
    }
  }

  const addTag = () => {
    if (!currentTag.trim()) return
    if (!formData.tags.includes(currentTag.trim())) {
      handleInputChange('tags', [...formData.tags, currentTag.trim()])
    }
    setCurrentTag('')
  }

  const removeTag = tagToRemove => {
    handleInputChange(
      'tags',
      formData.tags.filter(tag => tag !== tagToRemove)
    )
  }

  const formatFileSize = bytes => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* File Upload */}
      <div className="space-y-2">
        <Label>File Upload</Label>
        <div className="border-2 border-dashed border-gray-200 rounded-lg p-6">
          {selectedFile ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <File className="w-8 h-8 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedFile(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="text-center">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600 mb-2">Drag and drop a file or click to browse</p>
              <input
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
                accept="*/*"
              />
              <Button type="button" variant="outline" asChild>
                <label htmlFor="file-upload" className="cursor-pointer">
                  Choose File
                </label>
              </Button>
            </div>
          )}
        </div>
        <p className="text-sm text-gray-500">Maximum file size: 100MB</p>
      </div>

      {/* Resource Details */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            placeholder="Resource title"
            value={formData.title}
            onChange={e => handleInputChange('title', e.target.value)}
            className={cn('starboard-input', errors.title && 'field-error')}
          />
          {errors.title && <p className="error-message">{errors.title}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Describe this resource..."
            rows={3}
            value={formData.description}
            onChange={e => handleInputChange('description', e.target.value)}
            className="starboard-input"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select value={formData.type} onValueChange={value => handleInputChange('type', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {RESOURCE_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              placeholder="e.g., Presentation, Exercise"
              value={formData.category}
              onChange={e => handleInputChange('category', e.target.value)}
              className="starboard-input"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Tags</Label>
          <div className="flex gap-2 mb-2 flex-wrap">
            {formData.tags.map(tag => (
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
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="isPublic">Public Resource</Label>
            <p className="text-sm text-gray-500">Allow external access</p>
          </div>
          <Switch
            id="isPublic"
            checked={formData.isPublic}
            onCheckedChange={checked => handleInputChange('isPublic', checked)}
          />
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={() => onSuccess?.()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || !selectedFile} className="starboard-button">
          {isSubmitting ? 'Uploading...' : 'Upload Resource'}
        </Button>
      </div>
    </form>
  )
}
