// lib/services/aws-service.js
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
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
  }

  /**
   * Generate presigned URL for file upload
   * @param {string} fileName - Original file name
   * @param {string} fileType - MIME type
   * @param {string} folder - S3 folder path (e.g., 'avatars', 'onboarding')
   * @param {string} userId - User ID for organizing files
   * @returns {object} - Presigned URL and file key
   */
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
        expiresIn: 3600, // 1 hour
      })

      logger.info('Presigned URL generated', {
        fileKey,
        fileName,
        fileType,
        userId,
      })

      return {
        presignedUrl,
        fileKey,
        fileUrl: `https://${this.bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`,
        fileName: uniqueFileName,
        originalName: fileName,
      }
    } catch (error) {
      logger.error('Failed to generate presigned URL', {
        error: error.message,
        fileName,
        fileType,
        userId,
      })
      throw new Error(`Failed to generate upload URL: ${error.message}`)
    }
  }

  /**
   * Generate multiple presigned URLs for batch upload
   * @param {Array} files - Array of {fileName, fileType}
   * @param {string} folder - S3 folder path
   * @param {string} userId - User ID
   * @returns {Array} - Array of presigned URL objects
   */
  async getBatchPresignedUrls(files, folder = 'uploads', userId) {
    try {
      const presignedUrls = await Promise.all(
        files.map(file => this.getPresignedUploadUrl(file.fileName, file.fileType, folder, userId))
      )

      return presignedUrls
    } catch (error) {
      logger.error('Failed to generate batch presigned URLs', {
        error: error.message,
        filesCount: files.length,
        userId,
      })
      throw error
    }
  }

  /**
   * Validate file for upload
   * @param {string} fileName - File name
   * @param {string} fileType - MIME type
   * @param {number} fileSize - File size in bytes
   * @param {object} restrictions - Upload restrictions
   * @returns {object} - Validation result
   */
  validateFile(fileName, fileType, fileSize, restrictions = {}) {
    const {
      maxSize = 10 * 1024 * 1024, // 10MB default
      allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'image/jfif',
      ],
      allowedExtensions = [
        'jpg',
        'jpeg',
        'png',
        'gif',
        'webp',
        'pdf',
        'doc',
        'docx',
        'txt',
        'jfif',
      ],
    } = restrictions

    const errors = []

    // Check file size
    if (fileSize > maxSize) {
      errors.push(`File size exceeds limit of ${Math.round(maxSize / 1024 / 1024)}MB`)
    }

    // Check file type
    if (!allowedTypes.includes(fileType)) {
      errors.push(`File type ${fileType} is not allowed`)
    }

    // Check file extension
    const extension = fileName.split('.').pop()?.toLowerCase()
    if (!allowedExtensions.includes(extension)) {
      errors.push(`File extension .${extension} is not allowed`)
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}

export const awsService = new AWSService()

// Helper function for avatar uploads
export const getAvatarUploadUrl = async (fileName, fileType, userId) => {
  return awsService.getPresignedUploadUrl(fileName, fileType, 'avatars', userId)
}

// Helper function for onboarding file uploads
export const getOnboardingUploadUrl = async (fileName, fileType, userId) => {
  return awsService.getPresignedUploadUrl(fileName, fileType, 'onboarding', userId)
}
