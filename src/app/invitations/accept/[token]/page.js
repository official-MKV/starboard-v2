'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  CheckCircle,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  UserCheck,
  Mail,
  Shield,
  Loader2,
  AlertCircle,
  Building,
  Camera,
  Upload,
  X,
  ImageIcon,
  File,
} from 'lucide-react'

// Profile Image Upload Component
const ProfileImageUpload = React.memo(({ onImageUpload, initialImage, disabled }) => {
  const [image, setImage] = useState(initialImage || null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  const handleImageSelect = async event => {
    const file = event.target.files[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setError('Image size exceeds 5MB limit')
      return
    }

    if (!file.type.startsWith('image/')) {
      setError('Selected file is not an image')
      return
    }

    setUploading(true)
    setError(null)

    try {
      // Create a preview URL for immediate display
      const previewUrl = URL.createObjectURL(file)
      setImage({ previewUrl, file })

      // Get presigned URL for upload
      const presignedData = await getPresignedUrl(file.name, file.type, 'avatars')

      // Upload to S3
      await uploadFileToS3(file, presignedData)

      // Return the uploaded file data to parent component
      const uploadedImage = {
        fileKey: presignedData.fileKey,
        fileUrl: presignedData.fileUrl,
        fileName: presignedData.fileName,
        originalName: presignedData.originalName,
        fileSize: file.size,
        mimeType: file.type,
      }

      setImage({
        ...uploadedImage,
        previewUrl,
      })

      onImageUpload(uploadedImage)
    } catch (error) {
      setError(error.message || 'Failed to upload image')
      setImage(null)
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const removeImage = () => {
    setImage(null)
    onImageUpload(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      {image ? (
        <div className="relative">
          <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-blue-500">
            <img
              src={image.previewUrl || image.fileUrl}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          </div>
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
            onClick={removeImage}
            disabled={disabled}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <div
          className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center cursor-pointer border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <Camera className="h-8 w-8 text-gray-400" />
        </div>
      )}

      {!image && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload Photo
            </>
          )}
        </Button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageSelect}
        disabled={disabled || uploading}
      />

      {error && (
        <div className="flex items-center space-x-2 text-red-600">
          <AlertCircle className="h-4 w-4" />
          <p className="text-sm">{error}</p>
        </div>
      )}
    </div>
  )
})

// File Upload Component for Onboarding Fields
const FileUpload = React.memo(
  ({
    fieldName,
    label,
    description,
    required = false,
    multiple = false,
    accept = '*/*',
    maxSize = 10 * 1024 * 1024,
    folder = 'uploads',
    onUploadComplete,
    onUploadError,
    initialFiles,
    disabled = false,
    invitationToken = null,
  }) => {
    const [files, setFiles] = useState(initialFiles || [])
    const [uploading, setUploading] = useState(false)
    const [errors, setErrors] = useState([])
    const fileInputRef = useRef(null)

    const validateFile = file => {
      const errors = []
      if (file.size > maxSize) {
        errors.push(`File size exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit`)
      }
      return errors
    }

    const handleFileSelect = async selectedFiles => {
      setErrors([])

      const fileArray = Array.from(selectedFiles)

      // Validate files
      const validationErrors = []
      fileArray.forEach((file, index) => {
        const fileErrors = validateFile(file)
        if (fileErrors.length > 0) {
          validationErrors.push(`File ${index + 1}: ${fileErrors.join(', ')}`)
        }
      })

      if (validationErrors.length > 0) {
        setErrors(validationErrors)
        return
      }

      // Upload files immediately
      await uploadFiles(fileArray)
    }

    const uploadFiles = async filesToUpload => {
      setUploading(true)
      setErrors([])

      try {
        const uploadPromises = filesToUpload.map(async (file, index) => {
          const fileId = `${fieldName}_${Date.now()}_${index}`

          try {
            const presignedData = await getPresignedUrl(
              file.name,
              file.type,
              folder,
              invitationToken
            )
            const uploadResult = await uploadFileToS3(file, presignedData)

            return {
              id: fileId,
              ...uploadResult,
              // Add preview URL for images
              previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
            }
          } catch (error) {
            throw error
          }
        })

        const uploadedFiles = await Promise.all(uploadPromises)

        if (multiple) {
          setFiles(prev => [...prev, ...uploadedFiles])
          onUploadComplete?.(fieldName, [...files, ...uploadedFiles])
        } else {
          setFiles(uploadedFiles)
          onUploadComplete?.(fieldName, uploadedFiles[0])
        }
      } catch (error) {
        setErrors([error.message])
        onUploadError?.(fieldName, error.message)
      } finally {
        setUploading(false)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
    }

    const removeFile = fileId => {
      const updatedFiles = files.filter(file => file.id !== fileId)
      setFiles(updatedFiles)
      onUploadComplete?.(fieldName, multiple ? updatedFiles : null)
    }

    const getFileIcon = mimeType => {
      if (mimeType?.startsWith('image/')) {
        return <ImageIcon className="h-4 w-4" />
      }
      return <File className="h-4 w-4" />
    }

    const renderFilePreview = file => {
      if (file.mimeType?.startsWith('image/')) {
        return (
          <div className="w-12 h-12 rounded overflow-hidden mr-3">
            <img
              src={file.previewUrl || file.fileUrl}
              alt={file.originalName}
              className="w-full h-full object-cover"
            />
          </div>
        )
      }
      return (
        <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center mr-3">
          {getFileIcon(file.mimeType)}
        </div>
      )
    }

    return (
      <div className="space-y-2">
        {label && (
          <Label className="flex items-center">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </Label>
        )}

        {description && <p className="text-sm text-gray-500">{description}</p>}

        {/* Only show upload area if no files are uploaded (for single file) or multiple is allowed */}
        {(multiple || files.length === 0) && (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-gray-400 transition-colors">
            <div className="text-center">
              <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled || uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Choose {multiple ? 'Files' : 'File'}
                    </>
                  )}
                </Button>
                <p className="text-xs text-gray-500">
                  or drag and drop {multiple ? 'files' : 'a file'} here
                </p>
                <p className="text-xs text-gray-400">
                  Max size: {Math.round(maxSize / 1024 / 1024)}MB
                </p>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept={accept}
              multiple={multiple}
              className="hidden"
              onChange={e => {
                if (e.target.files?.length > 0) {
                  handleFileSelect(e.target.files)
                }
              }}
              disabled={disabled || uploading}
            />
          </div>
        )}

        {/* Uploaded files */}
        {files.length > 0 && (
          <div className="space-y-2">
            <div className="space-y-2">
              {files.map(file => (
                <div
                  key={file.id}
                  className="flex items-center justify-between bg-green-50 p-3 rounded-lg"
                >
                  <div className="flex items-center">
                    {renderFilePreview(file)}
                    <div>
                      <p className="text-sm font-medium">{file.originalName}</p>
                      <p className="text-xs text-gray-500">{Math.round(file.fileSize / 1024)} KB</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(file.id)}
                    disabled={disabled}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {errors.length > 0 && (
          <div className="space-y-1">
            {errors.map((error, index) => (
              <div key={index} className="flex items-center space-x-2 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <p className="text-sm">{error}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }
)

// Helper functions for file uploads
async function getPresignedUrl(fileName, fileType, folder, invitationToken = null) {
  const endpoint = '/api/upload/public/presigned-url'

  const requestBody = {
    fileName,
    fileType,
    folder,
  }

  if (invitationToken) {
    requestBody.invitationToken = invitationToken
    requestBody.source = 'invitation-acceptance'
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Failed to get upload URL')
  }

  const data = await response.json()
  return data.data
}

async function uploadFileToS3(file, presignedData) {
  const response = await fetch(presignedData.presignedUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to upload file to S3')
  }

  return {
    fileKey: presignedData.fileKey,
    fileUrl: presignedData.fileUrl,
    fileName: presignedData.fileName,
    originalName: presignedData.originalName,
    fileSize: file.size,
    mimeType: file.type,
  }
}

export default function InvitationAcceptPage({ params }) {
  const router = useRouter()
  const { token } = params

  // State management
  const [currentStep, setCurrentStep] = useState('loading')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [invitationData, setInvitationData] = useState(null)

  const [accountForm, setAccountForm] = useState({
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
    avatar: null,
  })

  const [onboardingData, setOnboardingData] = useState({})
  const [uploadedFiles, setUploadedFiles] = useState({})
  const [userData, setUserData] = useState(null) // Store user data from account creation

  // Memoized callback functions to prevent re-renders
  const handleFirstNameChange = useCallback(e => {
    setAccountForm(prev => ({ ...prev, firstName: e.target.value }))
  }, [])

  const handleLastNameChange = useCallback(e => {
    setAccountForm(prev => ({ ...prev, lastName: e.target.value }))
  }, [])

  const handlePasswordChange = useCallback(e => {
    setAccountForm(prev => ({ ...prev, password: e.target.value }))
  }, [])

  const handleConfirmPasswordChange = useCallback(e => {
    setAccountForm(prev => ({ ...prev, confirmPassword: e.target.value }))
  }, [])

  const handleTermsChange = useCallback(checked => {
    setAccountForm(prev => ({ ...prev, agreeToTerms: checked }))
  }, [])

  const handleAvatarUpload = useCallback(avatarData => {
    setAccountForm(prev => ({
      ...prev,
      avatar: avatarData,
    }))
  }, [])

  // Load invitation data on mount
  useEffect(() => {
    if (token) {
      loadInvitationData()
    }
  }, [token])

  const loadInvitationData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/invitations/details?token=${token}`)
      const result = await response.json()

      if (!response.ok) {
        const errorMsg =
          response.status === 404
            ? 'Invitation not found or has expired'
            : response.status === 410
              ? 'This invitation has expired'
              : response.status === 409
                ? 'This invitation has already been used'
                : result.error?.message || 'Something went wrong'

        setError(errorMsg)
        setCurrentStep('error')
        return
      }

      const invitation = result.data.invitation
      setInvitationData(invitation)
      setCurrentStep('invitation')

      if (invitation.requiresOnboarding && invitation.onboardingForm?.fields) {
        const initialData = {}
        invitation.onboardingForm.fields.forEach(field => {
          if (field.type === 'checkbox') {
            initialData[field.id] = []
          } else {
            initialData[field.id] = field.defaultValue || ''
          }
        })
        setOnboardingData(initialData)
      }
    } catch (error) {
      setError('Unable to load invitation. Please try again.')
      setCurrentStep('error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAcceptInvitation = async () => {
    setError(null)

    // Validation
    if (!accountForm.firstName.trim() || !accountForm.lastName.trim()) {
      setError('Please enter your first and last name')
      return
    }

    if (accountForm.password !== accountForm.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (accountForm.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (!accountForm.agreeToTerms) {
      setError('Please accept the terms and conditions')
      return
    }

    setIsLoading(true)

    try {
      const requestBody = {
        firstName: accountForm.firstName.trim(),
        lastName: accountForm.lastName.trim(),
        password: accountForm.password,
        avatar: accountForm.avatar?.fileUrl || null, // Already contains uploaded avatar data
      }

      const response = await fetch(`/api/invitations/accept?token=${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to create account')
      }

      // Store user data for onboarding
      setUserData(result.data)

      if (result.data.requiresOnboarding) {
        setCurrentStep('onboarding')
      } else {
        router.push(
          '/auth/signin?message=account-created&workspace=' +
            encodeURIComponent(result.data.workspace.name)
        )
      }
    } catch (error) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOnboardingSubmit = async () => {
    if (!invitationData?.onboardingForm?.fields) {
      setCurrentStep('success')
      setTimeout(() => {
        router.push(
          '/auth/login?message=welcome&workspace=' +
            encodeURIComponent(invitationData.workspace.name)
        )
      }, 2000)
      return
    }

    setError(null)

    // Validate required fields
    const requiredFields = invitationData.onboardingForm.fields.filter(field => field.required)
    const missingFields = requiredFields.filter(field => {
      const value = onboardingData[field.id]
      const uploadedFile = uploadedFiles[field.id]

      // For file/image fields, check if file has been uploaded
      if (field.type === 'file' || field.type === 'image') {
        return !uploadedFile
      }

      // For other fields, check if value exists
      return (
        !value ||
        (typeof value === 'string' && value.trim() === '') ||
        (Array.isArray(value) && value.length === 0)
      )
    })

    if (missingFields.length > 0) {
      const missingFileFields = missingFields.filter(f => f.type === 'file' || f.type === 'image')
      const missingOtherFields = missingFields.filter(f => f.type !== 'file' && f.type !== 'image')

      let errorMessage = ''
      if (missingFileFields.length > 0) {
        errorMessage += `Please upload required files: ${missingFileFields.map(f => f.label).join(', ')}`
      }
      if (missingOtherFields.length > 0) {
        if (errorMessage) errorMessage += '. '
        errorMessage += `Please complete: ${missingOtherFields.map(f => f.label).join(', ')}`
      }

      setError(errorMessage)
      return
    }

    setIsLoading(true)

    try {
      // Now send the complete onboarding request with already uploaded files
      const requestBody = {
        userId: userData.user.id,
        workspaceId: userData.workspace.id,
        profileData: {
          ...onboardingData,
          ...uploadedFiles, // Include uploaded files data
        },
      }

      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to complete setup')
      }

      setCurrentStep('success')
    } catch (error) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const updateOnboardingField = useCallback((fieldName, value) => {
    setOnboardingData(prev => ({
      ...prev,
      [fieldName]: value,
    }))
  }, [])

  const handleFileUpload = useCallback((fieldName, fileData) => {
    setUploadedFiles(prev => ({
      ...prev,
      [fieldName]: fileData,
    }))
  }, [])

  const FieldWrapper = useCallback(
    ({ children, field }) => (
      <div className="space-y-2">
        <Label className="flex items-center">
          {field.label} {field.required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        {children}
        {field.description && <p className="text-sm text-gray-500">{field.description}</p>}
      </div>
    ),
    []
  )

  // Memoized onboarding field event handlers
  const handleTextFieldChange = useCallback(
    (fieldId, event) => {
      updateOnboardingField(fieldId, event.target.value)
    },
    [updateOnboardingField]
  )

  const handleSelectFieldChange = useCallback(
    (fieldId, value) => {
      updateOnboardingField(fieldId, value)
    },
    [updateOnboardingField]
  )

  const handleCheckboxFieldChange = useCallback(
    (fieldId, optionValue, checked) => {
      const currentValue = onboardingData[fieldId] || []
      if (checked) {
        updateOnboardingField(fieldId, [...currentValue, optionValue])
      } else {
        updateOnboardingField(
          fieldId,
          currentValue.filter(v => v !== optionValue)
        )
      }
    },
    [updateOnboardingField, onboardingData]
  )

  // Create stable error handler
  const createStableFileErrorHandler = useCallback(fieldLabel => {
    return (fieldName, error) => {
      setError(`File upload failed for ${fieldLabel}: ${error}`)
    }
  }, [])

  const renderOnboardingField = useCallback(
    field => {
      const value = onboardingData[field.id] || ''

      switch (field.type) {
        case 'file':
          return (
            <FieldWrapper key={field.id} field={field}>
              <FileUpload
                fieldName={field.id}
                label=""
                required={field.required}
                multiple={field.type === 'multi_file'}
                accept={field.allowedFileTypes?.join(',') || '*/*'}
                maxSize={field.maxFileSize || 10 * 1024 * 1024}
                folder="onboarding"
                invitationToken={token}
                onUploadComplete={handleFileUpload}
                onUploadError={createStableFileErrorHandler(field.label)}
              />
            </FieldWrapper>
          )

        case 'image':
          return (
            <FieldWrapper key={field.id} field={field}>
              <FileUpload
                fieldName={field.id}
                label=""
                required={field.required}
                multiple={false}
                accept="image/*"
                maxSize={field.maxFileSize || 5 * 1024 * 1024}
                folder="onboarding"
                invitationToken={token}
                onUploadComplete={handleFileUpload}
                onUploadError={createStableFileErrorHandler(field.label)}
              />
            </FieldWrapper>
          )

        case 'textarea':
        case 'long_text':
          return (
            <FieldWrapper key={field.id} field={field}>
              <Textarea
                value={value}
                onChange={e => handleTextFieldChange(field.id, e)}
                placeholder={field.placeholder}
                rows={field.rows || 3}
                maxLength={field.validation?.maxLength}
                className="resize-none"
              />
            </FieldWrapper>
          )

        case 'select':
        case 'dropdown':
          return (
            <FieldWrapper key={field.id} field={field}>
              <Select value={value} onValueChange={val => handleSelectFieldChange(field.id, val)}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={field.placeholder || `Choose ${field.label.toLowerCase()}`}
                  />
                </SelectTrigger>
                <SelectContent>
                  {field.options?.map((option, idx) => (
                    <SelectItem key={idx} value={option.value || option}>
                      {option.label || option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldWrapper>
          )

        case 'checkbox':
        case 'multi_select':
          return (
            <FieldWrapper key={field.id} field={field}>
              <div className="space-y-2">
                {field.options?.map((option, idx) => {
                  const optionValue = option.value || option
                  return (
                    <div key={idx} className="flex items-center space-x-2">
                      <Checkbox
                        id={`${field.id}-${idx}`}
                        checked={value.includes(optionValue)}
                        onCheckedChange={checked =>
                          handleCheckboxFieldChange(field.id, optionValue, checked)
                        }
                      />
                      <Label htmlFor={`${field.id}-${idx}`} className="text-sm">
                        {option.label || option}
                      </Label>
                    </div>
                  )
                })}
              </div>
            </FieldWrapper>
          )

        default: // text, email, phone, etc.
          return (
            <FieldWrapper key={field.id} field={field}>
              <Input
                type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
                value={value}
                onChange={e => handleTextFieldChange(field.id, e)}
                placeholder={field.placeholder}
                maxLength={field.validation?.maxLength}
              />
            </FieldWrapper>
          )
      }
    },
    [
      onboardingData,
      token,
      handleFileUpload,
      handleTextFieldChange,
      handleSelectFieldChange,
      handleCheckboxFieldChange,
      createStableFileErrorHandler,
      FieldWrapper,
    ]
  )

  // Progress tracking
  const getSteps = () => {
    const baseSteps = ['invitation', 'account']
    if (invitationData?.requiresOnboarding && invitationData?.onboardingForm?.fields?.length > 0) {
      baseSteps.push('onboarding', 'success')
    }
    return baseSteps
  }

  const getStepLabels = () => {
    const labels = ['Invitation', 'Create Account']
    if (invitationData?.requiresOnboarding && invitationData?.onboardingForm?.fields?.length > 0) {
      labels.push('Complete Profile', 'Done')
    }
    return labels
  }

  const steps = getSteps()
  const stepLabels = getStepLabels()
  const currentStepIndex = steps.indexOf(currentStep)

  // Loading state
  if (currentStep === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading your invitation...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error state
  if (currentStep === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Oops!</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => (window.location.href = '/')} variant="outline">
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress Steps */}
        {stepLabels.length > 2 && (
          <div className="mb-8">
            <div className="flex items-center justify-center">
              {stepLabels.map((label, index) => (
                <div key={label} className="flex items-center">
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        index < currentStepIndex
                          ? 'bg-green-500 text-white'
                          : index === currentStepIndex
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {index < currentStepIndex ? <CheckCircle className="h-4 w-4" /> : index + 1}
                    </div>
                    <span
                      className={`text-sm font-medium ${
                        index === currentStepIndex ? 'text-blue-600' : 'text-gray-500'
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                  {index < stepLabels.length - 1 && (
                    <div
                      className={`w-8 h-0.5 ml-3 mr-3 ${index < currentStepIndex ? 'bg-green-500' : 'bg-gray-200'}`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <Card>
          {/* Error Display */}
          {error && currentStep !== 'error' && (
            <div className="p-4 bg-red-50 border-b border-red-200">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Invitation Step */}
          {currentStep === 'invitation' && invitationData && (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <Mail className="h-8 w-8 text-blue-600" />
                </div>
                <CardTitle className="text-2xl">You're invited!</CardTitle>
                <CardDescription>
                  Join {invitationData.workspace.name} as {invitationData.role.name}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-6 bg-gray-50 rounded-lg space-y-4">
                  <div className="flex items-center space-x-3">
                    {invitationData.workspace.logo ? (
                      <img
                        src={invitationData.workspace.logo || '/placeholder.svg'}
                        alt={invitationData.workspace.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                        <Building className="h-6 w-6 text-white" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-lg">{invitationData.workspace.name}</h3>
                      {invitationData.workspace.description && (
                        <p className="text-gray-600 text-sm">
                          {invitationData.workspace.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Your email</p>
                      <p className="font-medium">{invitationData.email}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Your role</p>
                      <p className="font-medium">{invitationData.role.name}</p>
                    </div>
                  </div>

                  {invitationData.personalMessage && (
                    <div className="bg-blue-50 p-3 rounded">
                      <p className="text-sm text-blue-800 italic">
                        "{invitationData.personalMessage}"
                      </p>
                    </div>
                  )}
                </div>

                <Button
                  onClick={() => setCurrentStep('account')}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  Accept & Create Account
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </>
          )}

          {/* Account Creation Step */}
          {currentStep === 'account' && (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <Shield className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle className="text-2xl">Create your account</CardTitle>
                <CardDescription>
                  Almost there! Just need a few details to get you started
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Profile Picture Upload */}
                  <div className="flex flex-col items-center mb-6">
                    <Label className="mb-2">Profile Picture (Optional)</Label>
                    <ProfileImageUpload
                      onImageUpload={handleAvatarUpload}
                      initialImage={accountForm.avatar}
                      disabled={isLoading}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>First Name</Label>
                      <Input
                        value={accountForm.firstName}
                        onChange={handleFirstNameChange}
                        placeholder="Your first name"
                      />
                    </div>
                    <div>
                      <Label>Last Name</Label>
                      <Input
                        value={accountForm.lastName}
                        onChange={handleLastNameChange}
                        placeholder="Your last name"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={invitationData?.email || ''}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>

                  <div>
                    <Label>Password</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={accountForm.password}
                        onChange={handlePasswordChange}
                        placeholder="Choose a strong password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">At least 8 characters</p>
                  </div>

                  <div>
                    <Label>Confirm Password</Label>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={accountForm.confirmPassword}
                        onChange={handleConfirmPasswordChange}
                        placeholder="Type your password again"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="terms"
                      checked={accountForm.agreeToTerms}
                      onCheckedChange={handleTermsChange}
                    />
                    <Label htmlFor="terms" className="text-sm leading-relaxed">
                      I agree to the terms of service and privacy policy
                    </Label>
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCurrentStep('invitation')}
                      className="flex-1"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                    <Button
                      onClick={handleAcceptInvitation}
                      disabled={isLoading}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      {isLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <ArrowRight className="mr-2 h-4 w-4" />
                      )}
                      {isLoading ? 'Creating...' : 'Create Account'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </>
          )}

          {/* Onboarding Step */}
          {currentStep === 'onboarding' && (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                  <UserCheck className="h-8 w-8 text-purple-600" />
                </div>
                <CardTitle className="text-2xl">Tell us about yourself</CardTitle>
                <CardDescription>Help us personalize your experience</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {invitationData?.onboardingForm?.fields ? (
                    <>
                      <div className="space-y-4">
                        {invitationData.onboardingForm.fields.map(field =>
                          renderOnboardingField(field)
                        )}
                      </div>

                      <div className="flex space-x-3 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setCurrentStep('account')}
                          className="flex-1"
                        >
                          <ArrowLeft className="mr-2 h-4 w-4" />
                          Back
                        </Button>
                        <Button
                          onClick={handleOnboardingSubmit}
                          disabled={isLoading}
                          className="flex-1 bg-blue-600 hover:bg-blue-700"
                        >
                          {isLoading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <ArrowRight className="mr-2 h-4 w-4" />
                          )}
                          {isLoading ? 'Finishing Setup...' : 'Complete Setup'}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-600 mb-4">No additional setup needed!</p>
                      <Button
                        onClick={() => setCurrentStep('success')}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Continue
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </>
          )}

          {/* Success Step */}
          {currentStep === 'success' && (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle className="text-2xl">Welcome aboard! 🎉</CardTitle>
                <CardDescription>You're all set up and ready to go</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <div className="p-6 bg-green-50 rounded-lg">
                    <h3 className="font-medium text-green-900 mb-2">What's next?</h3>
                    <p className="text-sm text-green-800">
                      Sign in to access your dashboard and start exploring{' '}
                      {userData?.workspace?.name || invitationData?.workspace?.name}
                    </p>
                  </div>
                </div>

                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onClick={() => {
                    router.push(
                      '/auth/login?message=welcome&workspace=' +
                        encodeURIComponent(
                          userData?.workspace?.name || invitationData?.workspace?.name
                        )
                    )
                  }}
                >
                  Sign In Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
