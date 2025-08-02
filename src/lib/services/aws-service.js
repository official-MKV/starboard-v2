// lib/services/aws-service.js
import {
  S3Client,
  PutObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { v4 as uuidv4 } from 'uuid'
import logger from '@/lib/logger'

class AWSService {
  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    })
    this.bucketName = process.env.AWS_S3_BUCKET_NAME
    this.activeUploads = new Map() // Track multipart uploads
  }

  // Your existing getPresignedUploadUrl method stays the same
  async getPresignedUploadUrl(fileName, fileType, folder = 'uploads', userId) {
    try {
      const fileExtension = fileName.split('.').pop()
      const uniqueFileName = `${uuidv4()}.${fileExtension}`
      const fileKey = `${folder}/${userId}/${uniqueFileName}`

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey,
        ContentType: fileType,
        Metadata: {
          'original-name': fileName,
          'user-id': userId,
          'upload-date': new Date().toISOString(),
        },
      })

      const presignedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: 3600,
      })

      return {
        presignedUrl,
        fileKey,
        fileUrl: `https://${this.bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`,
        fileName: uniqueFileName,
        originalName: fileName,
      }
    } catch (error) {
      logger.error('Failed to generate presigned URL', { error: error.message })
      throw new Error(`Failed to generate upload URL: ${error.message}`)
    }
  }

validateFile(fileName, fileType, fileSize, restrictions = {}) {
  
  const FILE_SIZE_LIMITS = {
    document: 300 * 1024 * 1024, // 300MB
    video: 1.5 * 1024 * 1024 * 1024, // 1.5GB
    image: 50 * 1024 * 1024, // 50MB
    default: 100 * 1024 * 1024, // 100MB
  }

  const DOCUMENT_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
     
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
    'application/vnd.ms-powerpoint', // .ppt
    'application/vnd.oasis.opendocument.presentation', // .odp (optional)
     
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/plain',
  ]

  const VIDEO_TYPES = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/avi', 'video/webm']

  const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

  // Determine file category and size limit
  let maxSize = FILE_SIZE_LIMITS.default
  if (DOCUMENT_TYPES.includes(fileType)) {
    maxSize = FILE_SIZE_LIMITS.document
  } else if (VIDEO_TYPES.includes(fileType)) {
    maxSize = FILE_SIZE_LIMITS.video
  } else if (IMAGE_TYPES.includes(fileType)) {
    maxSize = FILE_SIZE_LIMITS.image
  }

  const errors = []

  // Check file size
  if (fileSize > maxSize) {
    const limitMB = Math.round(maxSize / 1024 / 1024)
    const limitGB = limitMB >= 1024 ? (limitMB / 1024).toFixed(1) + 'GB' : limitMB + 'MB'
    errors.push(`File size exceeds ${limitGB} limit for this file type`)
  }

  // Check file type
  const allowedTypes = [...IMAGE_TYPES, ...DOCUMENT_TYPES, ...VIDEO_TYPES, 'application/zip']

  if (!allowedTypes.includes(fileType)) {
    errors.push(`File type ${fileType} is not allowed`)
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
  // NEW: Initialize multipart upload for large files
  async initializeMultipartUpload(fileName, fileType, folder, userId) {
    try {
      const fileExtension = fileName.split('.').pop()
      const uniqueFileName = `${uuidv4()}.${fileExtension}`
      const fileKey = `${folder}/${userId}/${uniqueFileName}`

      const command = new CreateMultipartUploadCommand({
        Bucket: this.bucketName,
        Key: fileKey,
        ContentType: fileType,
        Metadata: {
          'original-name': fileName,
          'user-id': userId,
          'upload-date': new Date().toISOString(),
        },
      })

      const response = await this.s3Client.send(command)

      // Store upload metadata
      this.activeUploads.set(response.UploadId, {
        fileKey,
        fileName: uniqueFileName,
        originalName: fileName,
        mimeType: fileType,
        userId,
        createdAt: new Date(),
      })

      const fileUrl = `https://${this.bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`

      return {
        uploadId: response.UploadId,
        fileKey,
        fileUrl,
        fileName: uniqueFileName,
        originalName: fileName,
      }
    } catch (error) {
      logger.error('Failed to initialize multipart upload', { error: error.message })
      throw new Error('Failed to initialize multipart upload')
    }
  }

  // NEW: Get presigned URLs for multipart upload chunks
  async getMultipartUploadUrls(uploadId, totalChunks) {
    try {
      const uploadMeta = this.activeUploads.get(uploadId)
      if (!uploadMeta) {
        throw new Error('Upload not found or expired')
      }

      const uploadUrls = []

      for (let partNumber = 1; partNumber <= totalChunks; partNumber++) {
        const command = new UploadPartCommand({
          Bucket: this.bucketName,
          Key: uploadMeta.fileKey,
          PartNumber: partNumber,
          UploadId: uploadId,
        })

        const presignedUrl = await getSignedUrl(this.s3Client, command, {
          expiresIn: 3600,
        })

        uploadUrls.push(presignedUrl)
      }

      return uploadUrls
    } catch (error) {
      logger.error('Failed to generate multipart upload URLs', { error: error.message })
      throw new Error('Failed to generate multipart upload URLs')
    }
  }

  // NEW: Complete multipart upload
  async completeMultipartUpload(uploadId, parts) {
    try {
      const uploadMeta = this.activeUploads.get(uploadId)
      if (!uploadMeta) {
        throw new Error('Upload not found or expired')
      }

      const command = new CompleteMultipartUploadCommand({
        Bucket: this.bucketName,
        Key: uploadMeta.fileKey,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: parts.map(part => ({
            ETag: part.ETag,
            PartNumber: part.PartNumber,
          })),
        },
      })

      await this.s3Client.send(command)

      // Clean up
      this.activeUploads.delete(uploadId)

      const fileUrl = `https://${this.bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${uploadMeta.fileKey}`

      return {
        fileUrl,
        fileName: uploadMeta.fileName,
        originalName: uploadMeta.originalName,
        mimeType: uploadMeta.mimeType,
      }
    } catch (error) {
      logger.error('Failed to complete multipart upload', { error: error.message })
      throw new Error('Failed to complete multipart upload')
    }
  }
}

export const awsService = new AWSService()

// Keep your existing helper functions
export const getAvatarUploadUrl = async (fileName, fileType, userId) => {
  return awsService.getPresignedUploadUrl(fileName, fileType, 'avatars', userId)
}

export const getOnboardingUploadUrl = async (fileName, fileType, userId) => {
  return awsService.getPresignedUploadUrl(fileName, fileType, 'onboarding', userId)
}
