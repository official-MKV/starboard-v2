// lib/storage.js
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { generateId } from './utils.js'
import { logger } from './logger.js'

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
})

const BUCKET_NAME = process.env.AWS_S3_BUCKET

if (!BUCKET_NAME) {
  logger.error('AWS S3 bucket name not configured')
}

// ===== FILE UPLOAD FUNCTIONS =====

/**
 * Upload file to S3
 * @param {Buffer} fileBuffer - File content as buffer
 * @param {string} originalName - Original filename
 * @param {string} mimeType - File MIME type
 * @param {string} folder - S3 folder (optional)
 * @returns {Object} Upload result with fileUrl and fileName
 */
export async function uploadFileToS3(fileBuffer, originalName, mimeType, folder = '') {
  try {
    if (!BUCKET_NAME) {
      throw new Error('S3 bucket not configured')
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomId = generateId(8)
    const extension = getFileExtension(originalName)
    const fileName = `${timestamp}-${randomId}${extension}`

    // Construct S3 key with folder
    const s3Key = folder ? `${folder}/${fileName}` : fileName

    // Upload to S3
    const uploadCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: mimeType,
      ContentDisposition: `inline; filename="${originalName}"`,
      CacheControl: 'max-age=31536000', // 1 year cache
    })

    await s3Client.send(uploadCommand)

    // Construct public URL
    const fileUrl = `https://${BUCKET_NAME}.s3.${
      process.env.AWS_REGION || 'us-east-1'
    }.amazonaws.com/${s3Key}`

    logger.info('File uploaded to S3', {
      fileName,
      s3Key,
      originalName,
      mimeType,
      size: fileBuffer.length,
    })

    return {
      fileUrl,
      fileName: s3Key, // Store the full S3 key for deletion
      originalName,
      size: fileBuffer.length,
      mimeType,
    }
  } catch (error) {
    logger.error('S3 upload failed', {
      originalName,
      mimeType,
      error: error.message,
    })
    throw new Error(`File upload failed: ${error.message}`)
  }
}

/**
 * Delete file from S3
 * @param {string} s3Key - S3 object key
 */
export async function deleteFileFromS3(s3Key) {
  try {
    if (!BUCKET_NAME || !s3Key) {
      throw new Error('S3 bucket or file key not provided')
    }

    const deleteCommand = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
    })

    await s3Client.send(deleteCommand)

    logger.info('File deleted from S3', { s3Key })
  } catch (error) {
    logger.error('S3 deletion failed', {
      s3Key,
      error: error.message,
    })
    throw new Error(`File deletion failed: ${error.message}`)
  }
}

/**
 * Generate signed URL for temporary file access
 * @param {string} s3Key - S3 object key
 * @param {number} expiresIn - URL expiration time in seconds (default: 1 hour)
 * @returns {string} Signed URL
 */
export async function generateSignedUrl(s3Key, expiresIn = 3600) {
  try {
    if (!BUCKET_NAME || !s3Key) {
      throw new Error('S3 bucket or file key not provided')
    }

    const getCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
    })

    const signedUrl = await getSignedUrl(s3Client, getCommand, { expiresIn })

    logger.debug('Signed URL generated', { s3Key, expiresIn })

    return signedUrl
  } catch (error) {
    logger.error('Signed URL generation failed', {
      s3Key,
      error: error.message,
    })
    throw new Error(`Signed URL generation failed: ${error.message}`)
  }
}

/**
 * Upload multiple files to S3
 * @param {Array} files - Array of file objects with buffer, name, and mimeType
 * @param {string} folder - S3 folder (optional)
 * @returns {Array} Array of upload results
 */
export async function uploadMultipleFilesToS3(files, folder = '') {
  try {
    const uploadPromises = files.map(file =>
      uploadFileToS3(file.buffer, file.name, file.mimeType, folder)
    )

    const results = await Promise.all(uploadPromises)

    logger.info('Multiple files uploaded to S3', {
      count: files.length,
      folder,
      files: results.map(r => r.fileName),
    })

    return results
  } catch (error) {
    logger.error('Multiple file upload failed', {
      count: files.length,
      folder,
      error: error.message,
    })
    throw error
  }
}

/**
 * Check if file exists in S3
 * @param {string} s3Key - S3 object key
 * @returns {boolean} True if file exists
 */
export async function fileExistsInS3(s3Key) {
  try {
    if (!BUCKET_NAME || !s3Key) {
      return false
    }

    const getCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
    })

    await s3Client.send(getCommand)
    return true
  } catch (error) {
    if (error.name === 'NoSuchKey') {
      return false
    }
    logger.error('S3 file existence check failed', {
      s3Key,
      error: error.message,
    })
    return false
  }
}

/**
 * Get file metadata from S3
 * @param {string} s3Key - S3 object key
 * @returns {Object} File metadata
 */
export async function getFileMetadata(s3Key) {
  try {
    if (!BUCKET_NAME || !s3Key) {
      throw new Error('S3 bucket or file key not provided')
    }

    const getCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
    })

    const response = await s3Client.send(getCommand)

    return {
      size: response.ContentLength,
      mimeType: response.ContentType,
      lastModified: response.LastModified,
      etag: response.ETag,
    }
  } catch (error) {
    logger.error('S3 metadata retrieval failed', {
      s3Key,
      error: error.message,
    })
    throw new Error(`Metadata retrieval failed: ${error.message}`)
  }
}

// ===== UTILITY FUNCTIONS =====

/**
 * Get file extension from filename
 * @param {string} filename - Original filename
 * @returns {string} File extension with dot
 */
function getFileExtension(filename) {
  if (!filename || typeof filename !== 'string') {
    return ''
  }

  const lastDotIndex = filename.lastIndexOf('.')
  if (lastDotIndex === -1 || lastDotIndex === filename.length - 1) {
    return ''
  }

  return filename.substring(lastDotIndex).toLowerCase()
}

/**
 * Validate file type against allowed types
 * @param {string} mimeType - File MIME type
 * @param {Array} allowedTypes - Array of allowed MIME types
 * @returns {boolean} True if file type is allowed
 */
export function validateFileType(mimeType, allowedTypes = []) {
  if (!allowedTypes.length) {
    return true // No restrictions
  }

  return allowedTypes.some(type => {
    if (type.endsWith('/*')) {
      // Handle wildcard types like 'image/*'
      const baseType = type.split('/')[0]
      return mimeType.startsWith(`${baseType}/`)
    }
    return mimeType === type
  })
}

/**
 * Validate file size
 * @param {number} fileSize - File size in bytes
 * @param {number} maxSize - Maximum allowed size in bytes
 * @returns {boolean} True if file size is within limits
 */
export function validateFileSize(fileSize, maxSize) {
  if (!maxSize) {
    return true // No size limit
  }

  return fileSize <= maxSize
}

/**
 * Generate optimized S3 folder structure
 * @param {string} baseFolder - Base folder name
 * @param {string} userId - User ID for organization
 * @param {string} date - Date string (optional)
 * @returns {string} Organized folder path
 */
export function generateFolderPath(baseFolder, userId, date = null) {
  const folderDate = date || new Date().toISOString().split('T')[0] // YYYY-MM-DD
  return `${baseFolder}/${folderDate}/${userId}`
}

/**
 * Clean up old files from S3 (for maintenance)
 * @param {string} folder - S3 folder to clean
 * @param {number} daysOld - Delete files older than this many days
 */
export async function cleanupOldFiles(folder, daysOld = 30) {
  try {
    // This would typically be implemented as a separate cleanup job
    // For now, just log the intent
    logger.info('File cleanup requested', { folder, daysOld })

    // TODO: Implement S3 lifecycle policies or batch cleanup
    // This should probably be handled by S3 lifecycle rules rather than application code
  } catch (error) {
    logger.error('File cleanup failed', {
      folder,
      daysOld,
      error: error.message,
    })
  }
}

// ===== CONSTANTS =====

export const FILE_UPLOAD_LIMITS = {
  // Image files
  IMAGE_MAX_SIZE: 5 * 1024 * 1024, // 5MB
  IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],

  // Document files
  DOCUMENT_MAX_SIZE: 10 * 1024 * 1024, // 10MB
  DOCUMENT_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
  ],

  // Video files (for larger uploads)
  VIDEO_MAX_SIZE: 100 * 1024 * 1024, // 100MB
  VIDEO_TYPES: ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm'],

  // General file upload
  GENERAL_MAX_SIZE: 20 * 1024 * 1024, // 20MB
}

export const S3_FOLDERS = {
  AVATARS: 'avatars',
  ONBOARDING: 'onboarding',
  APPLICATIONS: 'applications',
  RESOURCES: 'resources',
  EVENTS: 'events',
  CHAT: 'chat',
  TEMP: 'temp',
}
