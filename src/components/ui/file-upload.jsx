'use client'

import { useState, useRef } from 'react'
import { Upload, X, Image, File, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'

export function FileUpload({
  value,
  onChange,
  accept = 'image/*',
  maxSize = 10 * 1024 * 1024, // 10MB
  folder = 'events',
  placeholder = 'Click to upload or drag and drop',
  description = 'PNG, JPG, GIF up to 10MB',
  preview = true,
  className = '',
}) {
  const [isUploading, setIsUploading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef(null)

  const handleFileSelect = async file => {
    if (!file) return

    // Validate file size
    if (file.size > maxSize) {
      toast.error(`File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`)
      return
    }

    // Validate file type
    if (
      accept !== '*' &&
      !accept.split(',').some(type => file.type.match(type.trim().replace('*', '.*')))
    ) {
      toast.error('File type not supported')
      return
    }

    setIsUploading(true)

    try {
      // Get presigned URL from your existing endpoint
      const response = await fetch('/api/upload/presigned-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          folder,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to get upload URL')
      }

      const { data: uploadData } = await response.json()

      // Upload file to S3 using presigned URL
      const uploadResponse = await fetch(uploadData.presignedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      })

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file to S3')
      }

      // Return the file data in the format expected by the form
      onChange({
        url: uploadData.fileUrl,
        fileName: uploadData.fileName,
        originalName: uploadData.originalName,
        fileKey: uploadData.fileKey,
        fileSize: file.size,
        fileType: file.type,
      })

      toast.success('File uploaded successfully')
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error.message || 'Failed to upload file')
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileChange = e => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDrop = e => {
    e.preventDefault()
    setIsDragOver(false)

    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = e => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = e => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleClear = () => {
    onChange(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const openFileDialog = () => {
    fileInputRef.current?.click()
  }

  const isImage = value?.url && value.url.match(/\.(jpg|jpeg|png|gif|webp)$/i)

  return (
    <div className={`space-y-4 ${className}`}>
      {/* File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        disabled={isUploading}
      />

      {/* Upload Area */}
      {!value && (
        <Card
          className={`
            border-2 border-dashed cursor-pointer transition-colors
            ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
            ${isUploading ? 'cursor-not-allowed opacity-50' : ''}
          `}
          onClick={!isUploading ? openFileDialog : undefined}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <CardContent className="flex flex-col items-center justify-center py-12">
            {isUploading ? (
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
            ) : (
              <Upload className="w-8 h-8 text-gray-400 mb-4" />
            )}

            <div className="text-center">
              <p className="text-sm font-medium text-gray-900 mb-1">
                {isUploading ? 'Uploading...' : placeholder}
              </p>
              <p className="text-xs text-gray-500">{description}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview */}
      {value && (
        <Card className="relative">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              {/* Preview Thumbnail */}
              <div className="flex-shrink-0">
                {preview && isImage ? (
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={value.url}
                      alt={value.originalName || 'Preview'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center">
                    {isImage ? (
                      <Image className="w-6 h-6 text-gray-400" />
                    ) : (
                      <File className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                )}
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {value.originalName || value.fileName || 'Uploaded file'}
                </p>
                <p className="text-xs text-gray-500">
                  {value.fileSize && `${(value.fileSize / 1024 / 1024).toFixed(1)} MB • `}
                  Uploaded successfully
                </p>
              </div>

              {/* Remove Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="text-gray-400 hover:text-red-500"
                disabled={isUploading}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Replace Button */}
      {value && (
        <Button
          variant="outline"
          size="sm"
          onClick={openFileDialog}
          disabled={isUploading}
          className="w-full"
        >
          <Upload className="w-4 h-4 mr-2" />
          Replace File
        </Button>
      )}
    </div>
  )
}

// Helper function for easy avatar uploads
export const uploadAvatar = async file => {
  const response = await fetch('/api/upload/presigned-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      fileType: file.type,
      folder: 'avatars',
    }),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error?.message || 'Failed to get upload URL')
  }

  const { data: uploadData } = await response.json()

  const uploadResponse = await fetch(uploadData.presignedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  })

  if (!uploadResponse.ok) {
    throw new Error('Failed to upload file')
  }

  return uploadData
}

// Helper function for easy event banner uploads
export const uploadEventBanner = async file => {
  const response = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      fileType: file.type,
      folder: 'events',
    }),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error?.message || 'Failed to get upload URL')
  }

  const { data: uploadData } = await response.json()

  const uploadResponse = await fetch(uploadData.presignedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  })

  if (!uploadResponse.ok) {
    throw new Error('Failed to upload file')
  }

  return uploadData
}
