'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Upload, Star, AlertCircle, CheckCircle, Loader2, X, File } from 'lucide-react'

export function DynamicFormRenderer({
  fields = [],
  initialValues = {},
  onSubmit,
  onValueChange,
  isSubmitting = false,
  errors = {},
  showRequiredIndicator = true,
}) {
  const [formValues, setFormValues] = useState(initialValues)
  const [fieldErrors, setFieldErrors] = useState({})
  const [uploadingFiles, setUploadingFiles] = useState({})

  useEffect(() => {
    setFormValues(initialValues)
  }, [initialValues])

  const handleValueChange = (fieldId, value) => {
    const updatedValues = { ...formValues, [fieldId]: value }
    setFormValues(updatedValues)
    onValueChange?.(updatedValues)

    // Clear field error when user starts typing
    if (fieldErrors[fieldId]) {
      setFieldErrors(prev => ({ ...prev, [fieldId]: null }))
    }
  }

  // Helper function to check if a field value is empty
  const isFieldEmpty = (field, value) => {
    if (!value) return true

    switch (field.type) {
      case 'FILE_UPLOAD':
      case 'MULTI_FILE':
        return (
          !value ||
          (value instanceof FileList && value.length === 0) ||
          (Array.isArray(value) && value.length === 0)
        )
      case 'CHECKBOX':
        return Array.isArray(value) && value.length === 0
      default:
        return value === '' || (Array.isArray(value) && value.length === 0)
    }
  }

  const validateForm = () => {
    const newErrors = {}
    let isValid = true

    fields.forEach(field => {
      const value = formValues[field.id]

      // Check required fields
      if (field.required && isFieldEmpty(field, value)) {
        newErrors[field.id] = `${field.label} is required`
        isValid = false
        return
      }

      if (!isFieldEmpty(field, value)) {
        // Validate based on field type
        const error = validateFieldValue(field, value)
        if (error) {
          newErrors[field.id] = error
          isValid = false
        }
      }
    })

    setFieldErrors(newErrors)
    return isValid
  }

  const validateFieldValue = (field, value) => {
    switch (field.type) {
      case 'EMAIL':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return 'Please enter a valid email address'
        }
        break

      case 'PHONE':
        if (!/^\+?[\d\s\-()]+$/.test(value)) {
          return 'Please enter a valid phone number'
        }
        break

      case 'URL':
        try {
          new URL(value)
        } catch {
          return 'Please enter a valid URL'
        }
        break

      case 'NUMBER':
        const num = Number.parseFloat(value)
        if (isNaN(num)) {
          return 'Please enter a valid number'
        }
        if (field.minValue && num < field.minValue) {
          return `Value must be at least ${field.minValue}`
        }
        if (field.maxValue && num > field.maxValue) {
          return `Value must be at most ${field.maxValue}`
        }
        break

      case 'TEXT':
      case 'TEXTAREA':
        if (field.minLength && value.length < field.minLength) {
          return `Must be at least ${field.minLength} characters`
        }
        if (field.maxLength && value.length > field.maxLength) {
          return `Must be at most ${field.maxLength} characters`
        }
        break

      case 'FILE_UPLOAD':
      case 'MULTI_FILE':
        return validateFiles(field, value)
    }

    return null
  }

  const validateFiles = (field, files) => {
    if (
      !files ||
      (files instanceof FileList && files.length === 0) ||
      (Array.isArray(files) && files.length === 0)
    ) {
      return null
    }

    const fileArray = files instanceof FileList ? Array.from(files) : files

    // Check file count for multi-file
    if (field.type === 'MULTI_FILE' && field.maxFiles && fileArray.length > field.maxFiles) {
      return `Maximum ${field.maxFiles} files allowed`
    }

    // Validate each file
    for (const file of fileArray) {
      // Check file size
      if (field.maxFileSize && file.size > field.maxFileSize * 1024 * 1024) {
        return `File "${file.name}" exceeds maximum size of ${field.maxFileSize}MB`
      }

      // Check file type
      if (field.allowedFileTypes && field.allowedFileTypes.length > 0) {
        const fileExtension = file.name.split('.').pop()?.toLowerCase()
        if (!field.allowedFileTypes.includes(fileExtension)) {
          return `File type ".${fileExtension}" not allowed. Allowed types: ${field.allowedFileTypes.join(', ')}`
        }
      }
    }

    return null
  }

  // Check if form is valid for submission
  const isFormValid = () => {
    // Check if all required fields have values
    for (const field of fields) {
      const value = formValues[field.id]

      // Check required fields
      if (field.required && isFieldEmpty(field, value)) {
        return false
      }

      // Check field validation for non-empty values
      if (!isFieldEmpty(field, value)) {
        const error = validateFieldValue(field, value)
        if (error) {
          return false
        }
      }
    }

    return true
  }

  // Upload files using presigned URLs
  const uploadFiles = async (files, fieldId) => {
    if (!files || files.length === 0) return []

    setUploadingFiles(prev => ({ ...prev, [fieldId]: true }))

    try {
      const uploadPromises = Array.from(files).map(async file => {
        // Get presigned URL
        const response = await fetch('/api/upload/presigned-url', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
            folder: 'application-uploads',
          }),
        })

        if (!response.ok) {
          throw new Error(`Failed to get upload URL for ${file.name}`)
        }

        const { data } = await response.json()

        // Upload file to S3
        const uploadResponse = await fetch(data.uploadUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        })

        if (!uploadResponse.ok) {
          throw new Error(`Failed to upload ${file.name}`)
        }

        return {
          fileName: file.name,
          fileUrl: data.fileUrl,
          fileKey: data.fileKey,
          fileSize: file.size,
          fileType: file.type,
        }
      })

      const uploadedFiles = await Promise.all(uploadPromises)
      return uploadedFiles
    } catch (error) {
      console.error('File upload error:', error)
      throw error
    } finally {
      setUploadingFiles(prev => ({ ...prev, [fieldId]: false }))
    }
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!validateForm()) return

    try {
      // Process file uploads first
      const processedValues = { ...formValues }

      for (const field of fields) {
        if ((field.type === 'FILE_UPLOAD' || field.type === 'MULTI_FILE') && formValues[field.id]) {
          const files = formValues[field.id]
          if (files instanceof FileList && files.length > 0) {
            const uploadedFiles = await uploadFiles(files, field.id)
            processedValues[field.id] =
              field.type === 'FILE_UPLOAD' ? uploadedFiles[0] : uploadedFiles
          }
        }
      }

      onSubmit?.(processedValues)
    } catch (error) {
      console.error('Form submission error:', error)
      // Handle upload error - could set an error state here
    }
  }

  // Group fields by section
  const groupedFields = fields.reduce((groups, field) => {
    const section = field.section || 'default'
    if (!groups[section]) {
      groups[section] = []
    }
    groups[section].push(field)
    return groups
  }, {})

  const handleFileChange = (fieldId, files, field) => {
    handleValueChange(fieldId, files)

    // Validate files immediately
    if (files && files.length > 0) {
      const error = validateFiles(field, files)
      if (error) {
        setFieldErrors(prev => ({ ...prev, [fieldId]: error }))
      }
    }
  }

  const removeFile = (fieldId, fileIndex, field) => {
    const currentFiles = formValues[fieldId]
    if (currentFiles instanceof FileList) {
      // Convert FileList to Array, remove file, then create new array
      const fileArray = Array.from(currentFiles)
      fileArray.splice(fileIndex, 1)

      // Create a new DataTransfer object to simulate FileList
      const dt = new DataTransfer()
      fileArray.forEach(file => dt.items.add(file))

      handleValueChange(fieldId, dt.files)
    }
  }

  const renderField = field => {
    const value = formValues[field.id] || ''
    const error = fieldErrors[field.id] || errors[field.id]
    const baseId = `field-${field.id}`
    const isUploading = uploadingFiles[field.id]

    switch (field.type) {
      case 'SECTION_HEADER':
        return (
          <div key={field.id} className="col-span-full">
            <div className="border-b border-neutral-200 pb-4 mb-6">
              <h3 className="text-lg font-semibold text-charcoal-800">{field.label}</h3>
              {field.description && (
                <p className="text-sm text-slate-gray-600 mt-2">{field.description}</p>
              )}
            </div>
          </div>
        )

      case 'TEXT':
      case 'EMAIL':
      case 'PHONE':
      case 'URL':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={baseId} className="flex items-center">
              {field.label}
              {field.required && showRequiredIndicator && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </Label>
            {field.description && (
              <p className="text-sm text-slate-gray-600">{field.description}</p>
            )}
            <Input
              id={baseId}
              type={field.type.toLowerCase()}
              value={value}
              onChange={e => handleValueChange(field.id, e.target.value)}
              placeholder={field.placeholder}
              className={`starboard-input ${error ? 'border-red-500' : ''}`}
              maxLength={field.maxLength}
            />
            {error && (
              <div className="flex items-center text-red-600 text-sm">
                <AlertCircle className="h-4 w-4 mr-1" />
                {error}
              </div>
            )}
          </div>
        )

      case 'TEXTAREA':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={baseId} className="flex items-center">
              {field.label}
              {field.required && showRequiredIndicator && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </Label>
            {field.description && (
              <p className="text-sm text-slate-gray-600">{field.description}</p>
            )}
            <Textarea
              id={baseId}
              value={value}
              onChange={e => handleValueChange(field.id, e.target.value)}
              placeholder={field.placeholder}
              className={`starboard-input ${error ? 'border-red-500' : ''}`}
              rows={4}
              maxLength={field.maxLength}
            />
            {field.maxLength && (
              <p className="text-xs text-slate-gray-500 text-right">
                {value.length}/{field.maxLength}
              </p>
            )}
            {error && (
              <div className="flex items-center text-red-600 text-sm">
                <AlertCircle className="h-4 w-4 mr-1" />
                {error}
              </div>
            )}
          </div>
        )

      case 'NUMBER':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={baseId} className="flex items-center">
              {field.label}
              {field.required && showRequiredIndicator && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </Label>
            {field.description && (
              <p className="text-sm text-slate-gray-600">{field.description}</p>
            )}
            <Input
              id={baseId}
              type="number"
              value={value}
              onChange={e => handleValueChange(field.id, e.target.value)}
              placeholder={field.placeholder}
              className={`starboard-input ${error ? 'border-red-500' : ''}`}
              min={field.minValue}
              max={field.maxValue}
            />
            {error && (
              <div className="flex items-center text-red-600 text-sm">
                <AlertCircle className="h-4 w-4 mr-1" />
                {error}
              </div>
            )}
          </div>
        )

      case 'DATE':
      case 'DATETIME':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={baseId} className="flex items-center">
              {field.label}
              {field.required && showRequiredIndicator && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </Label>
            {field.description && (
              <p className="text-sm text-slate-gray-600">{field.description}</p>
            )}
            <Input
              id={baseId}
              type={field.type === 'DATETIME' ? 'datetime-local' : 'date'}
              value={value}
              onChange={e => handleValueChange(field.id, e.target.value)}
              className={`starboard-input ${error ? 'border-red-500' : ''}`}
            />
            {error && (
              <div className="flex items-center text-red-600 text-sm">
                <AlertCircle className="h-4 w-4 mr-1" />
                {error}
              </div>
            )}
          </div>
        )

      case 'SELECT':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={baseId} className="flex items-center">
              {field.label}
              {field.required && showRequiredIndicator && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </Label>
            {field.description && (
              <p className="text-sm text-slate-gray-600">{field.description}</p>
            )}
            <select
              id={baseId}
              value={value}
              onChange={e => handleValueChange(field.id, e.target.value)}
              className={`starboard-input ${error ? 'border-red-500' : ''}`}
            >
              <option value="">Select an option...</option>
              {field.options?.map((option, index) => (
                <option key={index} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {error && (
              <div className="flex items-center text-red-600 text-sm">
                <AlertCircle className="h-4 w-4 mr-1" />
                {error}
              </div>
            )}
          </div>
        )

      case 'RADIO':
        return (
          <div key={field.id} className="space-y-2">
            <Label className="flex items-center">
              {field.label}
              {field.required && showRequiredIndicator && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </Label>
            {field.description && (
              <p className="text-sm text-slate-gray-600">{field.description}</p>
            )}
            <div className="space-y-2">
              {field.options?.map((option, index) => (
                <label key={index} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name={baseId}
                    value={option.value}
                    checked={value === option.value}
                    onChange={e => handleValueChange(field.id, e.target.value)}
                    className="text-primary focus:ring-primary"
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
            {error && (
              <div className="flex items-center text-red-600 text-sm">
                <AlertCircle className="h-4 w-4 mr-1" />
                {error}
              </div>
            )}
          </div>
        )

      case 'CHECKBOX':
        return (
          <div key={field.id} className="space-y-2">
            <Label className="flex items-center">
              {field.label}
              {field.required && showRequiredIndicator && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </Label>
            {field.description && (
              <p className="text-sm text-slate-gray-600">{field.description}</p>
            )}
            <div className="space-y-2">
              {field.options?.map((option, index) => {
                const selectedValues = Array.isArray(value) ? value : []
                return (
                  <label key={index} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      value={option.value}
                      checked={selectedValues.includes(option.value)}
                      onChange={e => {
                        const currentValues = Array.isArray(value) ? value : []
                        if (e.target.checked) {
                          handleValueChange(field.id, [...currentValues, option.value])
                        } else {
                          handleValueChange(
                            field.id,
                            currentValues.filter(v => v !== option.value)
                          )
                        }
                      }}
                      className="text-primary focus:ring-primary"
                    />
                    <span className="text-sm">{option.label}</span>
                  </label>
                )
              })}
            </div>
            {error && (
              <div className="flex items-center text-red-600 text-sm">
                <AlertCircle className="h-4 w-4 mr-1" />
                {error}
              </div>
            )}
          </div>
        )

      case 'BOOLEAN':
        return (
          <div key={field.id} className="space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={value === true || value === 'true'}
                onChange={e => handleValueChange(field.id, e.target.checked)}
                className="text-primary focus:ring-primary"
              />
              <span className="text-sm font-medium">
                {field.label}
                {field.required && showRequiredIndicator && (
                  <span className="text-red-500 ml-1">*</span>
                )}
              </span>
            </label>
            {field.description && (
              <p className="text-sm text-slate-gray-600 ml-6">{field.description}</p>
            )}
            {error && (
              <div className="flex items-center text-red-600 text-sm ml-6">
                <AlertCircle className="h-4 w-4 mr-1" />
                {error}
              </div>
            )}
          </div>
        )

      case 'FILE_UPLOAD':
      case 'MULTI_FILE':
        const files = value instanceof FileList ? Array.from(value) : []
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={baseId} className="flex items-center">
              {field.label}
              {field.required && showRequiredIndicator && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </Label>
            {field.description && (
              <p className="text-sm text-slate-gray-600">{field.description}</p>
            )}

            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                error ? 'border-red-300 bg-red-50' : 'border-neutral-300 hover:border-primary/50'
              }`}
            >
              <Upload className="h-8 w-8 text-slate-gray-400 mx-auto mb-2" />
              <p className="text-sm text-slate-gray-600 mb-2">Drop files here or click to upload</p>
              <input
                id={baseId}
                type="file"
                multiple={field.type === 'MULTI_FILE'}
                accept={field.allowedFileTypes?.map(type => `.${type}`).join(',')}
                onChange={e => handleFileChange(field.id, e.target.files, field)}
                className="hidden"
                disabled={isUploading}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById(baseId)?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  'Choose Files'
                )}
              </Button>

              {field.allowedFileTypes && (
                <p className="text-xs text-slate-gray-500 mt-2">
                  Allowed: {field.allowedFileTypes.join(', ')}
                </p>
              )}
              {field.maxFileSize && (
                <p className="text-xs text-slate-gray-500">
                  Max size: {field.maxFileSize}MB per file
                </p>
              )}
              {field.type === 'MULTI_FILE' && field.maxFiles && (
                <p className="text-xs text-slate-gray-500">Max files: {field.maxFiles}</p>
              )}
            </div>

            {/* Show selected files */}
            {files.length > 0 && (
              <div className="space-y-2 mt-3">
                <p className="text-sm font-medium text-gray-700">Selected files:</p>
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded border"
                  >
                    <div className="flex items-center space-x-2">
                      <File className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-700">{file.name}</span>
                      <span className="text-xs text-gray-500">
                        ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(field.id, index, field)}
                      className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="flex items-center text-red-600 text-sm">
                <AlertCircle className="h-4 w-4 mr-1" />
                {error}
              </div>
            )}
          </div>
        )

      case 'RATING':
        const maxRating = field.maxValue || 5
        return (
          <div key={field.id} className="space-y-2">
            <Label className="flex items-center">
              {field.label}
              {field.required && showRequiredIndicator && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </Label>
            {field.description && (
              <p className="text-sm text-slate-gray-600">{field.description}</p>
            )}
            <div className="flex items-center space-x-1">
              {Array.from({ length: maxRating }).map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleValueChange(field.id, index + 1)}
                  className="p-1"
                >
                  <Star
                    className={`h-6 w-6 ${
                      index < (Number.parseInt(value) || 0)
                        ? 'text-yellow-400 fill-current'
                        : 'text-slate-gray-300'
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 text-sm text-slate-gray-600">
                {value ? `${value}/${maxRating}` : 'Not rated'}
              </span>
            </div>
            {error && (
              <div className="flex items-center text-red-600 text-sm">
                <AlertCircle className="h-4 w-4 mr-1" />
                {error}
              </div>
            )}
          </div>
        )

      default:
        return (
          <div key={field.id} className="p-4 bg-slate-gray-50 rounded-lg">
            <p className="text-sm text-slate-gray-600">Unsupported field type: {field.type}</p>
          </div>
        )
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {Object.entries(groupedFields).map(([sectionName, sectionFields]) => (
        <div key={sectionName}>
          {sectionName !== 'default' && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-charcoal-800 mb-2">{sectionName}</h2>
              <div className="w-12 h-0.5 bg-primary"></div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sectionFields
              .filter(field => field.isVisible !== false)
              .sort((a, b) => (a.order || 0) - (b.order || 0))
              .map(renderField)}
          </div>
        </div>
      ))}

      {onSubmit && (
        <div className="flex justify-end pt-6 border-t border-neutral-200">
          <Button
            type="submit"
            disabled={isSubmitting || !isFormValid()}
            className="starboard-button min-w-32"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Submit Application
              </>
            )}
          </Button>
        </div>
      )}
    </form>
  )
}
