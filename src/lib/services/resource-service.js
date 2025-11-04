// lib/services/resource-service.js
import { prisma } from '@/lib/database'
import { logger } from '@/lib/logger'
import { awsService } from '@/lib/services/aws-service'

export class ResourceService {
  /**
   * Upload and create a new resource
   */
  static async create(workspaceId, resourceData, file, creatorId) {
    try {
      let fileUrl = null
      let fileName = null
      let fileSize = null
      let mimeType = null

      // Handle file upload if provided
      if (file) {
        const uploadResult = await this.uploadFile(file, workspaceId, creatorId)
        fileUrl = uploadResult.url
        fileName = uploadResult.fileName
        fileSize = uploadResult.size
        mimeType = uploadResult.mimeType
      }

      const resource = await prisma.resource.create({
        data: {
          workspaceId,
          creatorId,
          title: resourceData.title,
          description: resourceData.description,
          type: resourceData.type || 'FILE',
          fileUrl,
          fileName,
          fileSize,
          mimeType,
          thumbnailUrl: resourceData.thumbnailUrl,
          externalUrl: resourceData.externalUrl,
          author: resourceData.author,
          duration: resourceData.duration,
          publishedAt: resourceData.publishedAt,
          isPublic: resourceData.isPublic || false,
          isFeatured: resourceData.isFeatured || false,
          tags: resourceData.tags || [],
          category: resourceData.category,
          topics: resourceData.topics || [],
          difficulty: resourceData.difficulty,
        },
        include: {
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          _count: {
            select: {
              access: true,
            },
          },
        },
      })

      logger.info('Resource created', {
        resourceId: resource.id,
        workspaceId,
        creatorId,
        hasFile: !!fileUrl,
      })

      return resource
    } catch (error) {
      logger.error('Failed to create resource', {
        error: error.message,
        workspaceId,
        creatorId,
      })
      throw new Error(error.message || 'Failed to create resource')
    }
  }

  static FILE_SIZE_LIMITS = {
    document: 300 * 1024 * 1024, // 300MB
    video: 1.5 * 1024 * 1024 * 1024, // 1.5GB
    image: 50 * 1024 * 1024, // 50MB
    default: 100 * 1024 * 1024, // 100MB
  }

  static validateFileSize(fileSize, mimeType) {
    const DOCUMENT_TYPES = ['application/pdf', 'application/msword', 'text/plain']
    const VIDEO_TYPES = ['video/mp4', 'video/mpeg', 'video/quicktime']
    const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif']

    let limit = this.FILE_SIZE_LIMITS.default
    if (DOCUMENT_TYPES.includes(mimeType)) {
      limit = this.FILE_SIZE_LIMITS.document
    } else if (VIDEO_TYPES.includes(mimeType)) {
      limit = this.FILE_SIZE_LIMITS.video
    } else if (IMAGE_TYPES.includes(mimeType)) {
      limit = this.FILE_SIZE_LIMITS.image
    }

    if (fileSize > limit) {
      const limitMB = Math.round(limit / 1024 / 1024)
      const limitGB = limitMB >= 1024 ? (limitMB / 1024).toFixed(1) + 'GB' : limitMB + 'MB'
      throw new Error(`File size exceeds ${limitGB} limit for this file type`)
    }
    return true
  }

  // NEW: Get upload URL for large files
  static async getUploadUrl(fileName, fileType, fileSize, workspaceId, userId) {
    try {
      this.validateFileSize(fileSize, fileType)

      const validation = awsService.validateFile(fileName, fileType, fileSize)
      if (!validation.valid) {
        throw new Error(validation.errors.join(', '))
      }

      const uploadData = await awsService.getPresignedUploadUrl(
        fileName,
        fileType,
        `workspaces/${workspaceId}/resources`,
        userId
      )

      return uploadData
    } catch (error) {
      logger.error('Failed to generate upload URL', { error: error.message })
      throw new Error('Failed to generate upload URL')
    }
  }

  // NEW: Create resource from direct upload
  static async createFromDirectUpload(workspaceId, resourceData, uploadedFileData, creatorId) {
    try {
      const resource = await prisma.resource.create({
        data: {
          workspaceId,
          creatorId,
          title: resourceData.title,
          description: resourceData.description,
          type: resourceData.type || 'FILE',
          fileUrl: uploadedFileData.fileUrl,
          fileName: uploadedFileData.originalName || uploadedFileData.fileName,
          fileSize: uploadedFileData.fileSize,
          mimeType: uploadedFileData.mimeType,
          thumbnailUrl: resourceData.thumbnailUrl,
          externalUrl: resourceData.externalUrl,
          author: resourceData.author,
          duration: resourceData.duration,
          publishedAt: resourceData.publishedAt,
          isPublic: resourceData.isPublic || false,
          isFeatured: resourceData.isFeatured || false,
          tags: resourceData.tags || [],
          category: resourceData.category,
          topics: resourceData.topics || [],
          difficulty: resourceData.difficulty,
        },
        include: {
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
        },
      })

      return resource
    } catch (error) {
      logger.error('Failed to create resource from direct upload', { error: error.message })
      throw new Error('Failed to create resource')
    }
  }

  static async uploadFile(file, workspaceId, userId) {
    try {
      // Validate file
      const validation = awsService.validateFile(file.name, file.type, file.size, {
        maxSize: 100 * 1024 * 1024, // 100MB
        allowedTypes: [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'text/plain',
          'text/csv',
          'video/mp4',
          'video/mpeg',
          'video/quicktime',
          'audio/mpeg',
          'audio/wav',
          'application/zip',
          'application/x-zip-compressed',
        ],
      })

      if (!validation.valid) {
        throw new Error(validation.errors.join(', '))
      }

      // Generate presigned URL for upload
      const uploadData = await awsService.getPresignedUploadUrl(
        file.name,
        file.type,
        `workspaces/${workspaceId}/resources`,
        userId
      )

      // Convert file to buffer for upload
      const buffer = Buffer.from(await file.arrayBuffer())

      // Upload file to S3 using presigned URL
      const uploadResponse = await fetch(uploadData.presignedUrl, {
        method: 'PUT',
        body: buffer,
        headers: {
          'Content-Type': file.type,
        },
      })

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file to storage')
      }

      return {
        url: uploadData.fileUrl,
        fileName: file.name,
        size: file.size,
        mimeType: file.type,
        s3Key: uploadData.fileKey,
      }
    } catch (error) {
      logger.error('Failed to upload file', { error: error.message })
      throw new Error('Failed to upload file')
    }
  }

  /**
   * Get presigned URL for file upload (for client-side uploads)
   */
  static async getUploadUrl(fileName, fileType, workspaceId, userId) {
    try {
      // Validate file
      const validation = awsService.validateFile(fileName, fileType, 0) // Size validation will be on client
      if (!validation.valid) {
        throw new Error(validation.errors.join(', '))
      }

      const uploadData = await awsService.getPresignedUploadUrl(
        fileName,
        fileType,
        `workspaces/${workspaceId}/resources`,
        userId
      )

      return uploadData
    } catch (error) {
      logger.error('Failed to generate upload URL', { error: error.message })
      throw new Error('Failed to generate upload URL')
    }
  }

  /**
   * Find resource by ID
   */
  static async findById(resourceId, userId = null) {
    try {
      const resource = await prisma.resource.findUnique({
        where: { id: resourceId },
        include: {
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          workspace: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          eventLinks: {
            include: {
              event: {
                select: {
                  id: true,
                  title: true,
                  startDate: true,
                },
              },
            },
          },
          _count: {
            select: {
              access: true,
            },
          },
        },
      })

      if (!resource) {
        throw new Error('Resource not found')
      }

      // Track access if user provided
      if (userId && userId !== resource.creatorId) {
        await this.trackAccess(resourceId, userId)
      }

      return resource
    } catch (error) {
      logger.error('Failed to find resource', { resourceId, error: error.message })
      throw new Error('Resource not found')
    }
  }

  /**
   * Find resources by workspace with filters
   */
  static async findByWorkspace(workspaceId, filters = {}) {
    try {
      const {
        search,
        type,
        category,
        isPublic,
        creatorId,
        tags,
        topics,
        difficulty,
        isFeatured,
        eventId,
        page = 1,
        limit = 50,
      } = filters
      console.log(workspaceId)
      const where = {
        workspaceId,
        ...(search && {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { fileName: { contains: search, mode: 'insensitive' } },
            { author: { contains: search, mode: 'insensitive' } },
          ],
        }),
        ...(type && type !== 'all' && { type }),
        ...(category && category !== 'all' && { category }),
        ...(difficulty && difficulty !== 'all' && { difficulty }),
        ...(typeof isPublic === 'boolean' && { isPublic }),
        ...(typeof isFeatured === 'boolean' && { isFeatured }),
        ...(creatorId && { creatorId }),
        ...(tags &&
          tags.length > 0 && {
            tags: { hasSome: tags },
          }),
        ...(topics &&
          topics.length > 0 && {
            topics: { hasSome: topics },
          }),
        ...(eventId && {
          eventLinks: {
            some: { eventId },
          },
        }),
      }

      const [resources, total] = await Promise.all([
        prisma.resource.findMany({
          where,
          include: {
            creator: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
            eventLinks: {
              include: {
                event: {
                  select: {
                    id: true,
                    title: true,
                    startDate: true,
                  },
                },
              },
              take: 3,
            },
            _count: {
              select: {
                access: true,
                eventLinks: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.resource.count({ where }),
      ])

      return {
        resources,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      }
    } catch (error) {
      logger.error('Failed to find resources by workspace', {
        workspaceId,
        filters,
        error: error.message,
      })
      throw new Error('Failed to fetch resources')
    }
  }

  /**
   * Update resource
   */
  static async update(resourceId, resourceData, file = null, userId) {
    try {
      const existingResource = await prisma.resource.findUnique({
        where: { id: resourceId },
      })

      if (!existingResource) {
        throw new Error('Resource not found')
      }

      let updateData = {
        title: resourceData.title,
        description: resourceData.description,
        type: resourceData.type,
        isPublic: resourceData.isPublic,
        isFeatured: resourceData.isFeatured,
        tags: resourceData.tags,
        category: resourceData.category,
        topics: resourceData.topics,
        difficulty: resourceData.difficulty,
        author: resourceData.author,
        duration: resourceData.duration,
        publishedAt: resourceData.publishedAt,
        thumbnailUrl: resourceData.thumbnailUrl,
        externalUrl: resourceData.externalUrl,
      }

      // Handle file replacement
      if (file) {
        // Upload new file
        const uploadResult = await this.uploadFile(file, existingResource.workspaceId, userId)
        updateData = {
          ...updateData,
          fileUrl: uploadResult.url,
          fileName: uploadResult.fileName,
          fileSize: uploadResult.size,
          mimeType: uploadResult.mimeType,
        }
      }

      const updatedResource = await prisma.resource.update({
        where: { id: resourceId },
        data: updateData,
        include: {
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          _count: {
            select: {
              access: true,
            },
          },
        },
      })

      logger.info('Resource updated', { resourceId, userId, hasNewFile: !!file })

      return updatedResource
    } catch (error) {
      logger.error('Failed to update resource', { resourceId, error: error.message })
      throw new Error(error.message || 'Failed to update resource')
    }
  }

  /**
   * Delete resource
   */
  static async delete(resourceId, userId) {
    try {
      const resource = await prisma.resource.findUnique({
        where: { id: resourceId },
        select: { fileUrl: true, title: true },
      })

      if (!resource) {
        throw new Error('Resource not found')
      }

      // Delete resource from database (file cleanup could be handled by a cleanup job)
      await prisma.resource.delete({ where: { id: resourceId } })

      logger.info('Resource deleted', {
        resourceId,
        userId,
        resourceTitle: resource.title,
      })

      return { success: true }
    } catch (error) {
      logger.error('Failed to delete resource', { resourceId, error: error.message })
      throw new Error(error.message || 'Failed to delete resource')
    }
  }

  /**
   * Link resource to event
   */
  static async linkToEvent(resourceId, eventId, userId) {
    try {
      // Check if already linked
      const existingLink = await prisma.eventResource.findUnique({
        where: { eventId_resourceId: { eventId, resourceId } },
      })

      if (existingLink) {
        throw new Error('Resource already linked to this event')
      }

      const link = await prisma.eventResource.create({
        data: { eventId, resourceId },
      })

      logger.info('Resource linked to event', { resourceId, eventId, userId })

      return link
    } catch (error) {
      logger.error('Failed to link resource to event', {
        resourceId,
        eventId,
        error: error.message,
      })
      throw new Error(error.message || 'Failed to link resource to event')
    }
  }

  /**
   * Unlink resource from event
   */
  static async unlinkFromEvent(resourceId, eventId, userId) {
    try {
      await prisma.eventResource.delete({
        where: { eventId_resourceId: { eventId, resourceId } },
      })

      logger.info('Resource unlinked from event', { resourceId, eventId, userId })

      return { success: true }
    } catch (error) {
      logger.error('Failed to unlink resource from event', {
        resourceId,
        eventId,
        error: error.message,
      })
      throw new Error('Failed to unlink resource from event')
    }
  }

  /**
   * Track resource access
   */
  static async trackAccess(resourceId, userId) {
    try {
      // Check if access already tracked today
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const existingAccess = await prisma.resourceAccess.findFirst({
        where: {
          resourceId,
          userId,
          accessedAt: {
            gte: today,
            lt: tomorrow,
          },
        },
      })

      if (!existingAccess) {
        await prisma.resourceAccess.create({
          data: { resourceId, userId },
        })

        // Increment download count for the resource
        await prisma.resource.update({
          where: { id: resourceId },
          data: { downloadCount: { increment: 1 } },
        })
      }
    } catch (error) {
      logger.error('Failed to track resource access', {
        resourceId,
        userId,
        error: error.message,
      })
      // Don't throw error as this is not critical
    }
  }

  /**
   * Get resource statistics for workspace
   */
  static async getWorkspaceResourceStats(workspaceId) {
    try {
      const [total, publicCount, privateCount, totalSize] = await Promise.all([
        prisma.resource.count({ where: { workspaceId } }),
        prisma.resource.count({ where: { workspaceId, isPublic: true } }),
        prisma.resource.count({ where: { workspaceId, isPublic: false } }),
        prisma.resource.aggregate({
          where: { workspaceId, fileSize: { not: null } },
          _sum: { fileSize: true },
        }),
      ])

      // Get type breakdown
      const typeBreakdown = await prisma.resource.groupBy({
        by: ['type'],
        where: { workspaceId },
        _count: { type: true },
      })

      return {
        total,
        public: publicCount,
        private: privateCount,
        totalSize: totalSize._sum.fileSize || 0,
        typeBreakdown: typeBreakdown.reduce((acc, item) => {
          acc[item.type] = item._count.type
          return acc
        }, {}),
      }
    } catch (error) {
      logger.error('Failed to get resource stats', { workspaceId, error: error.message })
      return {
        total: 0,
        public: 0,
        private: 0,
        totalSize: 0,
        typeBreakdown: {},
      }
    }
  }

  /**
   * Check if user has access to resource
   */
  static async checkResourceAccess(resourceId, userId) {
    try {
      const resource = await prisma.resource.findUnique({
        where: { id: resourceId },
        include: {
          workspace: {
            include: {
              members: {
                where: { userId },
                include: { role: true },
              },
            },
          },
        },
      })

      if (!resource) return false

      // If resource is public, anyone can access
      if (resource.isPublic) return true

      // Check if user is workspace member
      const member = resource.workspace.members[0]
      if (!member) return false

      // Check if user is the creator
      if (resource.creatorId === userId) return true

      // For private resources, only workspace members can access
      return true
    } catch (error) {
      logger.error('Failed to check resource access', {
        resourceId,
        userId,
        error: error.message,
      })
      return false
    }
  }

  /**
   * Generate download URL for resource
   */
  static async getDownloadUrl(resourceId, userId) {
    try {
      const resource = await this.findById(resourceId, userId)

      if (!resource.fileUrl) {
        throw new Error('No file associated with this resource')
      }

      // Check access
      const hasAccess = await this.checkResourceAccess(resourceId, userId)
      if (!hasAccess) {
        throw new Error('Access denied')
      }

      // For files stored on S3, we can return the direct URL or generate a signed URL
      // Since the files are private, we should generate a signed URL
      // This would require extracting the S3 key from the fileUrl and generating a new signed URL

      return {
        downloadUrl: resource.fileUrl,
        fileName: resource.fileName,
      }
    } catch (error) {
      logger.error('Failed to generate download URL', {
        resourceId,
        userId,
        error: error.message,
      })
      throw new Error(error.message || 'Failed to generate download URL')
    }
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
}
