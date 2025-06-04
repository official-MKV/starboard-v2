'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { WorkspaceClient } from '@/lib/workspace-client'
import { Building2, Upload, X, ArrowLeft, Loader2, AlertCircle, Globe } from 'lucide-react'

export default function WorkspaceCreatePage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    website: '',
    logo: null,
  })
  const [logoPreview, setLogoPreview] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [errors, setErrors] = useState({})

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))

    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleLogoUpload = e => {
    const file = e.target.files[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, logo: 'Please select an image file' }))
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, logo: 'Image must be less than 5MB' }))
      return
    }

    // Clear any previous errors
    setErrors(prev => ({ ...prev, logo: '' }))

    // Store the file in state and create a preview
    setFormData(prev => ({ ...prev, logo: file }))
    setLogoPreview(URL.createObjectURL(file))
  }

  const uploadLogo = async file => {
    try {
      setUploading(true)

      // Get presigned URL for public upload (no workspace context needed)
      const uploadResponse = await fetch('/api/upload/presigned-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          folder: 'workspace-logos',
        }),
      })

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json()
        throw new Error(errorData.error?.message || 'Failed to get upload URL')
      }

      const { data: uploadData } = await uploadResponse.json()

      // Upload file to S3
      const s3Response = await fetch(uploadData.presignedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      })

      if (!s3Response.ok) {
        throw new Error('Failed to upload file to S3')
      }

      // Return the file URL
      return uploadData.fileUrl
    } catch (error) {
      console.error('Upload error:', error)
      throw error
    } finally {
      setUploading(false)
    }
  }

  const removeLogo = () => {
    setFormData(prev => ({ ...prev, logo: null }))
    setLogoPreview('')
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Workspace name is required'
    } else if (formData.name.length < 2) {
      newErrors.name = 'Workspace name must be at least 2 characters'
    }

    if (formData.website && !isValidUrl(formData.website)) {
      newErrors.website = 'Please enter a valid website URL'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const isValidUrl = url => {
    try {
      new URL(url.startsWith('http') ? url : `https://${url}`)
      return true
    } catch {
      return false
    }
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      // Upload logo if one is selected
      let logoUrlToUse = null
      if (formData.logo) {
        try {
          logoUrlToUse = await uploadLogo(formData.logo)
        } catch (error) {
          setErrors(prev => ({ ...prev, logo: error.message }))
          setLoading(false)
          return
        }
      }

      // Prepare workspace data
      const workspaceData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        website: formData.website
          ? formData.website.startsWith('http')
            ? formData.website
            : `https://${formData.website}`
          : null,
        logo: logoUrlToUse || null,
      }

      const response = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workspaceData),
      })

      const data = await response.json()

      if (response.ok) {
        // Set the new workspace as current
        WorkspaceClient.setWorkspace(data.data.workspace.id)

        // Redirect to workspace dashboard
        router.push('/dashboard')
      } else {
        setErrors({ submit: data.error?.message || 'Failed to create workspace' })
      }
    } catch (error) {
      console.error('Error creating workspace:', error)
      setErrors({ submit: 'An unexpected error occurred' })
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    router.back()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={handleBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to workspace selection</span>
          </button>

          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Create New Workspace</h1>
            <p className="text-lg text-gray-600">
              Set up your workspace to start collaborating with your team
            </p>
          </div>
        </div>

        {/* Main Form */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="p-8 space-y-6">
            {/* General Error */}
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <p className="text-red-800">{errors.submit}</p>
              </div>
            )}

            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Workspace Logo</label>
              <div className="flex items-center space-x-4">
                {logoPreview ? (
                  <div className="relative">
                    <img
                      src={logoPreview || '/placeholder.svg'}
                      alt="Logo preview"
                      className="w-16 h-16 rounded-lg object-cover border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={removeLogo}
                      disabled={uploading}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 disabled:opacity-50"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-16 h-16 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-gray-400" />
                  </div>
                )}

                <div>
                  <input
                    type="file"
                    id="logo-upload"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                  <label
                    htmlFor="logo-upload"
                    className="cursor-pointer bg-gray-50 hover:bg-gray-100 disabled:opacity-50 text-gray-700 px-4 py-2 rounded-lg border border-gray-200 flex items-center space-x-2 transition-colors"
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    <span>
                      {uploading ? 'Uploading...' : logoPreview ? 'Change Logo' : 'Upload Logo'}
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 5MB</p>
                </div>
              </div>
              {errors.logo && <p className="text-red-600 text-sm mt-1">{errors.logo}</p>}
            </div>

            {/* Workspace Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Workspace Name *
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={e => handleInputChange('name', e.target.value)}
                placeholder="Enter workspace name"
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={e => handleInputChange('description', e.target.value)}
                placeholder="Brief description of your workspace (optional)"
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.description.length}/500 characters
              </p>
            </div>

            {/* Website */}
            <div>
              <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-2">
                Website
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                  <Globe className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="website"
                  value={formData.website}
                  onChange={e => handleInputChange('website', e.target.value)}
                  placeholder="example.com"
                  className={`w-full pl-10 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.website ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
              </div>
              {errors.website && <p className="text-red-600 text-sm mt-1">{errors.website}</p>}
            </div>

            {/* Submit Buttons */}
            <div className="flex space-x-4 pt-6">
              <button
                type="button"
                onClick={handleBack}
                disabled={loading}
                className="flex-1 bg-gray-100 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || uploading}
                className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <span>Create Workspace</span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Need help setting up your workspace? Check our guide or contact support.</p>
        </div>
      </div>
    </div>
  )
}
