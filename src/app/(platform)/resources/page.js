'use client'

import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  FolderOpen,
  Upload,
  Search,
  Download,
  Eye,
  Trash2,
  FileText,
  Image,
  Video,
  Globe,
  Lock,
  Grid,
  List,
  Plus,
  X,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'

import { usePermissions } from '@/lib/hooks/usePermissions'

export const PermissionWrapper = ({
  permission,
  permissions,
  requireAll = false,
  fallback = null,
  children,
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions()

  let hasAccess = true

  if (permission) {
    hasAccess = hasPermission(permission)
  } else if (permissions && Array.isArray(permissions)) {
    hasAccess = requireAll ? hasAllPermissions(permissions) : hasAnyPermission(permissions)
  }

  if (!hasAccess) {
    return fallback
  }

  return children
}

const FILE_SIZE_LIMITS = {
  document: 300 * 1024 * 1024,
  video: 1.5 * 1024 * 1024 * 1024,
  image: 50 * 1024 * 1024,
  default: 100 * 1024 * 1024,
}

const DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
]

const VIDEO_TYPES = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/avi', 'video/webm']

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

const getFileSizeLimit = mimeType => {
  if (DOCUMENT_TYPES.includes(mimeType)) {
    return FILE_SIZE_LIMITS.document
  }
  if (VIDEO_TYPES.includes(mimeType)) {
    return FILE_SIZE_LIMITS.video
  }
  if (IMAGE_TYPES.includes(mimeType)) {
    return FILE_SIZE_LIMITS.image
  }
  return FILE_SIZE_LIMITS.default
}

const validateFileSize = (fileSize, mimeType) => {
  const limit = getFileSizeLimit(mimeType)
  if (fileSize > limit) {
    const limitMB = Math.round(limit / 1024 / 1024)
    const limitGB = limitMB >= 1024 ? (limitMB / 1024).toFixed(1) + 'GB' : limitMB + 'MB'
    throw new Error(`File size exceeds ${limitGB} limit for this file type`)
  }
  return true
}

const shouldUseDirectUpload = fileSize => {
  return fileSize > 4 * 1024 * 1024
}

const resourcesApi = {
  fetchResources: async filters => {
    const params = new URLSearchParams({
      search: filters.search || '',
      type: filters.type || 'all',
      category: filters.category || 'all',
      page: filters.page?.toString() || '1',
      limit: filters.limit?.toString() || '50',
    })

    const response = await fetch(`/api/resources?${params}`)
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    if (!data.success) {
      throw new Error(data.error?.message || 'Failed to fetch resources')
    }

    return data.data
  },

  uploadResourceSmall: async formData => {
    const response = await fetch('/api/resources', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    if (!data.success) {
      throw new Error(data.error?.message || 'Upload failed')
    }

    return data.data.resource
  },

  getUploadUrl: async (fileName, fileType, fileSize) => {
    const response = await fetch('/api/resources/upload-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fileName, fileType, fileSize }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    if (!data.success) {
      throw new Error(data.error?.message || 'Failed to get upload URL')
    }

    return data.data
  },

  uploadToS3: async (presignedUrl, file, onProgress) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      xhr.upload.addEventListener('progress', e => {
        if (e.lengthComputable && onProgress) {
          onProgress((e.loaded / e.total) * 100)
        }
      })

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          resolve()
        } else {
          reject(new Error('Upload failed'))
        }
      })

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'))
      })

      xhr.open('PUT', presignedUrl)
      xhr.setRequestHeader('Content-Type', file.type)
      xhr.send(file)
    })
  },

  createFromDirectUpload: async (resourceData, uploadedFileData) => {
    const response = await fetch('/api/resources', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'direct_upload',
        resourceData,
        uploadedFileData,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    if (!data.success) {
      throw new Error(data.error?.message || 'Failed to create resource')
    }

    return data.data.resource
  },

  deleteResource: async resourceId => {
    const response = await fetch(`/api/resources/${resourceId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    if (!data.success) {
      throw new Error(data.error?.message || 'Failed to delete resource')
    }

    return data
  },

  getDownloadUrl: async resourceId => {
    const response = await fetch(`/api/resources/${resourceId}/download`)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    if (!data.success) {
      throw new Error(data.error?.message || 'Failed to get download URL')
    }

    return data.data
  },
}

const ResourcesPage = () => {
  const { hasPermission } = usePermissions()
  const queryClient = useQueryClient()

  const [viewMode, setViewMode] = useState('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [previewResource, setPreviewResource] = useState(null)
  const [notification, setNotification] = useState(null)

  const {
    data: resourcesData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      'resources',
      {
        search: searchQuery,
        type: selectedType,
        category: selectedCategory,
        page: currentPage,
        limit: 50,
      },
    ],
    queryFn: () =>
      resourcesApi.fetchResources({
        search: searchQuery,
        type: selectedType,
        category: selectedCategory,
        page: currentPage,
        limit: 50,
      }),
    keepPreviousData: true,
    staleTime: 30000,
  })

  const uploadMutation = useMutation({
    mutationFn: async ({ resourceData, file }) => {
      validateFileSize(file.size, file.type)

      if (shouldUseDirectUpload(file.size)) {
        const uploadData = await resourcesApi.getUploadUrl(file.name, file.type, file.size)
        await resourcesApi.uploadToS3(uploadData.presignedUrl, file)

        const uploadedFileData = {
          fileUrl: uploadData.fileUrl,
          fileName: uploadData.originalName,
          fileSize: file.size,
          mimeType: file.type,
        }

        return resourcesApi.createFromDirectUpload(resourceData, uploadedFileData)
      } else {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('title', resourceData.title)
        formData.append('description', resourceData.description || '')
        formData.append('category', resourceData.category || '')
        formData.append('isPublic', resourceData.isPublic.toString())
        formData.append('tags', JSON.stringify(resourceData.tags || []))

        return resourcesApi.uploadResourceSmall(formData)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] })
      setShowUploadModal(false)
      showNotification('Resource uploaded successfully')
    },
    onError: error => {
      showNotification(`Upload failed: ${error.message}`, 'error')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: resourcesApi.deleteResource,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] })
      showNotification('Resource deleted successfully')
    },
    onError: error => {
      showNotification(`Delete failed: ${error.message}`, 'error')
    },
  })

  const downloadMutation = useMutation({
    mutationFn: resourcesApi.getDownloadUrl,
    onSuccess: (data, resourceId) => {
      window.open(data.downloadUrl, '_blank')
    },
    onError: error => {
      showNotification(`Download failed: ${error.message}`, 'error')
    },
  })

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedType, selectedCategory])

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

  const formatFileSize = bytes => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (type, mimeType) => {
    if (type === 'VIDEO' || mimeType?.startsWith('video/')) {
      return <Video className="w-5 h-5" />
    }
    if (type === 'IMAGE' || mimeType?.startsWith('image/')) {
      return <Image className="w-5 h-5" />
    }
    return <FileText className="w-5 h-5" />
  }

  const handlePreview = resource => {
    setPreviewResource(resource)
    setShowPreviewModal(true)
  }

  const handleDownload = resource => {
    showNotification(`Downloading ${resource.fileName}...`, 'info')
    downloadMutation.mutate(resource.id)
  }

  const handleDelete = resourceId => {
    if (!confirm('Are you sure you want to delete this resource?')) return
    deleteMutation.mutate(resourceId)
  }

  const handleUpload = (resourceData, file) => {
    uploadMutation.mutate({ resourceData, file })
  }

  const resources = resourcesData?.resources || []
  const pagination = resourcesData?.pagination || { page: 1, totalPages: 0, total: 0, limit: 50 }

  const categories = [...new Set(resources.map(r => r.category).filter(Boolean))]

  if (isError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Error Loading Resources</h2>
          <p className="text-slate-600 mb-4">{error?.message}</p>
          <button
            onClick={() => refetch()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FolderOpen className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Resources</h1>
                <p className="text-slate-600">Manage and access your documents and media</p>
              </div>
            </div>

            <PermissionWrapper permission="resources.manage">
              <button
                onClick={() => setShowUploadModal(true)}
                disabled={uploadMutation.isPending}
                className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                <span>{uploadMutation.isPending ? 'Uploading...' : 'Upload Resource'}</span>
              </button>
            </PermissionWrapper>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search resources..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex items-center space-x-4">
              <select
                value={selectedType}
                onChange={e => setSelectedType(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Types</option>
                <option value="FILE">Documents</option>
                <option value="IMAGE">Images</option>
                <option value="VIDEO">Videos</option>
              </select>

              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              <div className="flex items-center border border-slate-300 rounded-lg">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : resources.length === 0 ? (
          <div className="text-center py-12">
            <FolderOpen className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No resources found</h3>
            <p className="text-slate-600">
              {searchQuery || selectedType !== 'all' || selectedCategory !== 'all'
                ? 'Try adjusting your filters or search query'
                : 'Upload your first resource to get started'}
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {resources.map(resource => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                onDownload={handleDownload}
                onPreview={handlePreview}
                onDelete={handleDelete}
                formatFileSize={formatFileSize}
                getFileIcon={getFileIcon}
                isDeleting={deleteMutation.isPending}
                isDownloading={downloadMutation.isPending}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Size
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Creator
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {resources.map(resource => (
                    <ResourceRow
                      key={resource.id}
                      resource={resource}
                      onDownload={handleDownload}
                      onPreview={handlePreview}
                      onDelete={handleDelete}
                      formatFileSize={formatFileSize}
                      getFileIcon={getFileIcon}
                      isDeleting={deleteMutation.isPending}
                      isDownloading={downloadMutation.isPending}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="mt-8 flex items-center justify-between">
            <div className="text-sm text-slate-700">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}{' '}
              resources
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => prev - 1)}
                disabled={pagination.page === 1}
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              <div className="flex space-x-1">
                {[...Array(Math.min(5, pagination.totalPages))].map((_, i) => {
                  const pageNum = Math.max(1, pagination.page - 2) + i
                  if (pageNum > pagination.totalPages) return null

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-2 text-sm rounded-lg ${
                        pageNum === pagination.page
                          ? 'bg-blue-600 text-white'
                          : 'border border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>

              <button
                onClick={() => setCurrentPage(prev => prev + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {showPreviewModal && previewResource && (
        <PreviewModal
          resource={previewResource}
          onClose={() => {
            setShowPreviewModal(false)
            setPreviewResource(null)
          }}
        />
      )}

      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onUpload={handleUpload}
          isUploading={uploadMutation.isPending}
        />
      )}

      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  )
}

const ResourceCard = ({
  resource,
  onDownload,
  onPreview,
  onDelete,
  formatFileSize,
  getFileIcon,
  isDeleting,
  isDownloading,
}) => {
  const canPreview = resource => {
    const previewableTypes = ['image/', 'application/pdf', 'text/', 'video/']
    return previewableTypes.some(type => resource.mimeType?.startsWith(type))
  }

  const truncateText = (text, maxLength) => {
    if (!text) return ''
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <div className="p-2 bg-slate-100 rounded-lg flex-shrink-0">
              {getFileIcon(resource.type, resource.mimeType)}
            </div>
            <div className="min-w-0 flex-1">
              <h3
                className="text-sm font-medium text-slate-900 truncate cursor-help"
                title={resource.title}
              >
                {resource.title}
              </h3>
              <p className="text-xs text-slate-500 truncate cursor-help" title={resource.fileName}>
                {resource.fileName}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
            {resource.isPublic ? (
              <Globe className="w-4 h-4 text-green-500" title="Public" />
            ) : (
              <Lock className="w-4 h-4 text-amber-500" title="Private" />
            )}
          </div>
        </div>

        {resource.description && (
          <div className="mb-4">
            <p
              className="text-sm text-slate-600 leading-5 cursor-help"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                lineHeight: '1.25rem',
                maxHeight: '2.5rem',
              }}
              title={resource.description}
            >
              {resource.description}
            </p>
          </div>
        )}

        {resource.tags && resource.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {resource.tags.slice(0, 5).map(tag => (
              <span
                key={tag}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 max-w-[120px]"
                title={tag}
              >
                <span className="truncate">{truncateText(tag, 15)}</span>
              </span>
            ))}
            {resource.tags.length > 5 && (
              <span
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 cursor-help"
                title={`Additional tags: ${resource.tags.slice(5).join(', ')}`}
              >
                +{resource.tags.length - 5} more
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <div className="flex items-center space-x-4 text-xs text-slate-500">
            <span>{formatFileSize(resource.fileSize)}</span>
            <span>{resource._count?.access || 0} downloads</span>
          </div>

          <div className="flex items-center space-x-2">
            {canPreview(resource) && (
              <button
                onClick={() => onPreview(resource)}
                className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                title="Preview"
              >
                <Eye className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => onDownload(resource)}
              disabled={isDownloading}
              className="p-1 text-slate-400 hover:text-blue-600 transition-colors disabled:opacity-50"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </button>

            <PermissionWrapper permission="resources.manage">
              <button
                onClick={() => onDelete(resource.id)}
                disabled={isDeleting}
                className="p-1 text-slate-400 hover:text-red-600 transition-colors disabled:opacity-50"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </PermissionWrapper>
          </div>
        </div>
      </div>
    </div>
  )
}

const ResourceRow = ({
  resource,
  onDownload,
  onPreview,
  onDelete,
  formatFileSize,
  getFileIcon,
  isDeleting,
  isDownloading,
}) => {
  const canPreview = resource => {
    const previewableTypes = ['image/', 'application/pdf', 'text/', 'video/']
    return previewableTypes.some(type => resource.mimeType?.startsWith(type))
  }

  return (
    <tr className="hover:bg-slate-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center space-x-3">
          <div className="p-1 bg-slate-100 rounded">
            {getFileIcon(resource.type, resource.mimeType)}
          </div>
          <div>
            <div className="text-sm font-medium text-slate-900">{resource.title}</div>
            <div className="text-sm text-slate-500">{resource.fileName}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
          {resource.type}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
        {formatFileSize(resource.fileSize)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
        {resource.creator?.firstName} {resource.creator?.lastName}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
        {new Date(resource.createdAt).toLocaleDateString()}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <div className="flex items-center space-x-2">
          {canPreview(resource) && (
            <button
              onClick={() => onPreview(resource)}
              className="text-blue-600 hover:text-blue-900"
            >
              Preview
            </button>
          )}
          <button
            onClick={() => onDownload(resource)}
            disabled={isDownloading}
            className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
          >
            Download
          </button>
          <PermissionWrapper permission="resources.manage">
            <button
              onClick={() => onDelete(resource.id)}
              disabled={isDeleting}
              className="text-red-600 hover:text-red-900 disabled:opacity-50"
            >
              Delete
            </button>
          </PermissionWrapper>
        </div>
      </td>
    </tr>
  )
}

const PreviewModal = ({ resource, onClose }) => {
  const getPreviewContent = () => {
    const { mimeType, fileUrl, fileName } = resource

    if (mimeType?.startsWith('image/')) {
      return (
        <div className="flex items-center justify-center p-4">
          <img
            src={fileUrl}
            alt={fileName}
            className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
            onError={e => {
              e.target.style.display = 'none'
              e.target.nextSibling.style.display = 'block'
            }}
          />
          <div className="hidden text-center text-slate-500">
            <FileText className="w-12 h-12 mx-auto mb-2" />
            <p>Preview not available</p>
          </div>
        </div>
      )
    }

    if (mimeType === 'application/pdf') {
      return (
        <div className="w-full h-[70vh]">
          <iframe src={fileUrl} className="w-full h-full border-0 rounded-lg" title={fileName} />
        </div>
      )
    }

    if (mimeType?.startsWith('video/')) {
      return (
        <div className="flex items-center justify-center p-4">
          <video
            controls
            className="max-w-full max-h-[70vh] rounded-lg shadow-lg"
            preload="metadata"
          >
            <source src={fileUrl} type={mimeType} />
            Your browser does not support the video tag.
          </video>
        </div>
      )
    }

    if (mimeType?.startsWith('text/')) {
      return (
        <div className="p-4">
          <iframe
            src={fileUrl}
            className="w-full h-[60vh] border border-slate-200 rounded-lg"
            title={fileName}
          />
        </div>
      )
    }

    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500">
        <FileText className="w-16 h-16 mb-4" />
        <h3 className="text-lg font-medium mb-2">Preview not available</h3>
        <p className="text-sm text-center mb-4">
          This file type cannot be previewed in the browser.
        </p>
        <button
          onClick={() => window.open(resource.fileUrl, '_blank')}
          className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Download to view</span>
        </button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-slate-100 rounded-lg">
              {resource.type === 'VIDEO' ? (
                <Video className="w-5 h-5" />
              ) : resource.type === 'IMAGE' ? (
                <Image className="w-5 h-5" />
              ) : (
                <FileText className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{resource.title}</h3>
              <p className="text-sm text-slate-600">{resource.fileName}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => window.open(resource.fileUrl, '_blank')}
              className="inline-flex items-center space-x-2 text-slate-600 hover:text-slate-800 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="overflow-auto max-h-[calc(90vh-120px)]">{getPreviewContent()}</div>

        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between text-sm text-slate-600">
            <div className="flex items-center space-x-4">
              <span>
                Size:{' '}
                {resource.fileSize
                  ? (resource.fileSize / 1024 / 1024).toFixed(2) + ' MB'
                  : 'Unknown'}
              </span>
              <span>Type: {resource.mimeType || 'Unknown'}</span>
              {resource.isPublic ? (
                <span className="inline-flex items-center space-x-1 text-green-600">
                  <Globe className="w-3 h-3" />
                  <span>Public</span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-1 text-amber-600">
                  <Lock className="w-3 h-3" />
                  <span>Private</span>
                </span>
              )}
            </div>
            <span>Created: {new Date(resource.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

const UploadModal = ({ onClose, onUpload, isUploading }) => {
  const [dragActive, setDragActive] = useState(false)
  const [file, setFile] = useState(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [tags, setTags] = useState([])
  const [tagInput, setTagInput] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [sizeError, setSizeError] = useState('')

  const validateFile = selectedFile => {
    try {
      validateFileSize(selectedFile.size, selectedFile.type)
      setSizeError('')
      return true
    } catch (error) {
      setSizeError(error.message)
      return false
    }
  }

  const handleDrag = e => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = e => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      if (validateFile(droppedFile)) {
        setFile(droppedFile)
        if (!title) setTitle(droppedFile.name.split('.')[0])
      }
    }
  }

  const handleFileSelect = e => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      if (validateFile(selectedFile)) {
        setFile(selectedFile)
        if (!title) setTitle(selectedFile.name.split('.')[0])
      }
    }
  }

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput('')
    }
  }

  const removeTag = tagToRemove => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const handleSubmit = () => {
    if (!file || !title.trim() || sizeError) return

    const resourceData = {
      title: title.trim(),
      description: description.trim(),
      category: category.trim(),
      isPublic,
      tags,
    }

    onUpload(resourceData, file)
  }

  const getFileSizeInfo = () => {
    if (!file) return null

    const limit = getFileSizeLimit(file.type)
    const limitText =
      limit >= 1024 * 1024 * 1024
        ? `${(limit / 1024 / 1024 / 1024).toFixed(1)}GB`
        : `${Math.round(limit / 1024 / 1024)}MB`

    const fileType = DOCUMENT_TYPES.includes(file.type)
      ? 'document'
      : VIDEO_TYPES.includes(file.type)
        ? 'video'
        : IMAGE_TYPES.includes(file.type)
          ? 'image'
          : 'file'

    return `${fileType} (max ${limitText})`
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">Upload Resource</h2>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="text-slate-400 hover:text-slate-600 disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">File</label>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragActive
                  ? 'border-blue-400 bg-blue-50'
                  : file
                    ? sizeError
                      ? 'border-red-400 bg-red-50'
                      : 'border-green-400 bg-green-50'
                    : 'border-slate-300 hover:border-slate-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {file ? (
                <div className="space-y-2">
                  {sizeError ? (
                    <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
                  ) : (
                    <CheckCircle className="w-8 h-8 text-green-500 mx-auto" />
                  )}
                  <p className="text-sm font-medium text-slate-900">{file.name}</p>
                  <p className="text-xs text-slate-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB • {getFileSizeInfo()}
                  </p>
                  {sizeError && <p className="text-xs text-red-600">{sizeError}</p>}
                  {isUploading && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-sm text-slate-600">
                    Drag and drop your file here, or{' '}
                    <label className="text-blue-600 hover:text-blue-500 cursor-pointer underline">
                      browse
                      <input
                        type="file"
                        className="hidden"
                        onChange={handleFileSelect}
                        accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.mp4,.mov,.avi,.webm"
                      />
                    </label>
                  </p>
                  <div className="text-xs text-slate-500 space-y-1">
                    <p>Documents: PDF, Word, Text (max 300MB)</p>
                    <p>Images: JPG, PNG, GIF, WebP (max 50MB)</p>
                    <p>Videos: MP4, MOV, AVI, WebM (max 1.5GB)</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Title *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter resource title"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Describe what this resource contains..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
            <input
              type="text"
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Documentation, Training, Marketing"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Tags</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex space-x-2">
              <input
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && addTag()}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Add a tag"
              />
              <button
                type="button"
                onClick={addTag}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
              >
                Add
              </button>
            </div>
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={e => setIsPublic(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-slate-700">Make this resource public</span>
            </label>
            <p className="text-xs text-slate-500 mt-1">
              Public resources can be accessed by all workspace members
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!file || !title.trim() || isUploading || !!sizeError}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? 'Uploading...' : 'Upload Resource'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const Notification = ({ message, type, onClose }) => {
  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    info: AlertCircle,
  }

  const colors = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  }

  const Icon = icons[type]

  return (
    <div className="fixed top-4 right-4 z-50">
      <div
        className={`flex items-center space-x-3 px-4 py-3 rounded-lg border shadow-lg ${colors[type]}`}
      >
        <Icon className="w-5 h-5" />
        <span className="text-sm font-medium">{message}</span>
        <button onClick={onClose} className="text-current opacity-70 hover:opacity-100">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export default ResourcesPage
